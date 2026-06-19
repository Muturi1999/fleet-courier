import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";

@Injectable()
export class SchedulesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(search?: string) {
    if (search?.trim()) {
      const q = `%${search.toLowerCase()}%`;
      return this.db.queryAll(
        `SELECT * FROM schedules
         WHERE LOWER(plate) LIKE $1 OR LOWER(dest) LIKE $1
         ORDER BY created_at DESC`,
        [q],
      );
    }
    return this.db.queryAll(`SELECT * FROM schedules ORDER BY created_at DESC`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM schedules WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Schedule not found");
    return row;
  }

  async create(dto: CreateScheduleDto) {
    const row = await this.db.queryOne(
      `INSERT INTO schedules (plate, cls, dest, run_type, rate, days, cost, vat, total, month, service_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        dto.plate,
        dto.cls,
        dto.dest,
        dto.runType,
        dto.rate,
        dto.days,
        dto.cost,
        dto.vat,
        dto.total,
        dto.month ?? null,
        dto.serviceDate ?? null,
        dto.status ?? "saved",
      ],
    );
    return row;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      plate: "plate",
      cls: "cls",
      dest: "dest",
      runType: "run_type",
      rate: "rate",
      days: "days",
      cost: "cost",
      vat: "vat",
      total: "total",
      month: "month",
      serviceDate: "service_date",
      status: "status",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);
    return this.db.queryOne(
      `UPDATE schedules SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM schedules WHERE id = $1`, [id]);
    return { ok: true };
  }

  async importBulk(rows: CreateScheduleDto[]) {
    const created: unknown[] = [];
    for (const dto of rows) {
      created.push(await this.create(dto));
    }
    return { imported: created.length, rows: created };
  }
}
