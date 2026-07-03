import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import {
  CreateMaintenanceScheduleDto,
  CreateWorkOrderDto,
  UpdateMaintenanceScheduleDto,
  UpdateWorkOrderDto,
} from "./dto/maintenance.dto";

@Injectable()
export class MaintenanceService {
  constructor(private readonly db: TenantDatabaseService) {}

  listSchedules() {
    return this.db.queryAll(`SELECT * FROM maintenance_schedules WHERE active = TRUE ORDER BY next_due_at NULLS LAST`);
  }

  listWorkOrders(status?: string) {
    if (status) {
      return this.db.queryAll(
        `SELECT * FROM maintenance_work_orders WHERE status = $1 ORDER BY opened_at DESC`,
        [status],
      );
    }
    return this.db.queryAll(`SELECT * FROM maintenance_work_orders ORDER BY opened_at DESC`);
  }

  dueSoon(days = 14) {
    return this.db.queryAll(
      `SELECT * FROM maintenance_schedules
       WHERE active = TRUE AND next_due_at IS NOT NULL AND next_due_at <= CURRENT_DATE + $1::int
       ORDER BY next_due_at`,
      [days],
    );
  }

  async createSchedule(dto: CreateMaintenanceScheduleDto) {
    const nextDue = dto.lastServiceAt && dto.intervalDays
      ? new Date(new Date(dto.lastServiceAt).getTime() + dto.intervalDays * 86400000).toISOString().slice(0, 10)
      : null;
    const nextKm = dto.lastOdometerKm && dto.intervalKm ? dto.lastOdometerKm + dto.intervalKm : null;
    return this.db.queryOne(
      `INSERT INTO maintenance_schedules (
        vehicle_id, plate, service_type, interval_km, interval_days, last_service_at, last_odometer_km, next_due_at, next_due_km
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dto.vehicleId,
        dto.plate,
        dto.serviceType,
        dto.intervalKm ?? null,
        dto.intervalDays ?? null,
        dto.lastServiceAt ?? null,
        dto.lastOdometerKm ?? null,
        nextDue,
        nextKm,
      ],
    );
  }

  async updateSchedule(id: string, dto: UpdateMaintenanceScheduleDto) {
    await this.findSchedule(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      serviceType: "service_type",
      intervalKm: "interval_km",
      intervalDays: "interval_days",
      lastServiceAt: "last_service_at",
      lastOdometerKm: "last_odometer_km",
      plate: "plate",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (!fields.length) return this.findSchedule(id);
    fields.push("updated_at = NOW()");
    values.push(id);
    return this.db.queryOne(
      `UPDATE maintenance_schedules SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async findSchedule(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM maintenance_schedules WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Schedule not found");
    return row;
  }

  async createWorkOrder(dto: CreateWorkOrderDto) {
    const parts = dto.partsCost ?? 0;
    const labor = dto.laborCost ?? 0;
    return this.db.queryOne(
      `INSERT INTO maintenance_work_orders (
        schedule_id, vehicle_id, plate, title, description, garage_name, parts_cost, labor_cost, total_cost
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dto.scheduleId ?? null,
        dto.vehicleId ?? null,
        dto.plate,
        dto.title,
        dto.description ?? null,
        dto.garageName ?? null,
        parts,
        labor,
        parts + labor,
      ],
    );
  }

  async updateWorkOrder(id: string, dto: UpdateWorkOrderDto) {
    await this.findWorkOrder(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      title: "title",
      description: "description",
      garageName: "garage_name",
      partsCost: "parts_cost",
      laborCost: "labor_cost",
      status: "status",
      closedAt: "closed_at",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (dto.partsCost !== undefined || dto.laborCost !== undefined) {
      const current = await this.findWorkOrder(id);
      const parts = dto.partsCost ?? Number(current.parts_cost);
      const labor = dto.laborCost ?? Number(current.labor_cost);
      fields.push(`total_cost = $${i++}`);
      values.push(parts + labor);
    }
    if (dto.status === "closed" && !dto.closedAt) fields.push(`closed_at = CURRENT_DATE`);
    if (!fields.length) return this.findWorkOrder(id);
    fields.push("updated_at = NOW()");
    values.push(id);
    const row = await this.db.queryOne(
      `UPDATE maintenance_work_orders SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (dto.status === "closed" && row) {
      await this.syncExpense(row as Record<string, unknown>);
    }
    return row;
  }

  private async syncExpense(wo: Record<string, unknown>) {
    const total = Number(wo.total_cost ?? 0);
    if (total <= 0) return;
    const exp = await this.db.queryOne(
      `INSERT INTO expenses (expense_date, category, description, amount, vehicle_plate, month, status)
       VALUES (CURRENT_DATE, 'maintenance', $1, $2, $3, to_char(CURRENT_DATE, 'Mon YYYY'), 'recorded') RETURNING *`,
      [`${wo.title} — ${wo.garage_name ?? "garage"}`, total, wo.plate],
    );
    if (exp) {
      await this.db.queryOne(`UPDATE maintenance_work_orders SET expense_id = $1 WHERE id = $2`, [exp.id, wo.id]);
    }
  }

  async findWorkOrder(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM maintenance_work_orders WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Work order not found");
    return row;
  }
}
