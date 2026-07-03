import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { wantsFullList, resolvePageLimit } from "../common/database/list-query.helper";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { OrdersService } from "../orders/orders.service";
import { CreateDispatchDto, ReassignDispatchDto, UpdateDispatchDto } from "./dto/dispatch.dto";

@Injectable()
export class DispatchService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    private readonly orders: OrdersService,
  ) {}

  async findAll(query: ListQueryDto) {
    const status = query.status;
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (status) {
      clauses.push(`d.status = $${i++}`);
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const baseSql = `
      FROM dispatch_assignments d
      JOIN transport_orders o ON o.id = d.order_id
      ${where}`;
    const selectSql = `
      SELECT d.*, o.order_no, o.customer_name, o.pickup_address, o.delivery_address, o.status AS order_status
      ${baseSql}
      ORDER BY d.assigned_at DESC, d.id DESC`;

    if (wantsFullList(query)) return this.db.queryAll(selectSql, params);

    const { page, limit } = resolvePageLimit(query);
    const countRow = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${baseSql}`,
      params,
    );
    const total = parseInt(countRow?.count ?? "0", 10);
    const offset = (Math.max(1, page) - 1) * limit;
    const data = await this.db.queryAll(
      `${selectSql} LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data,
      meta: {
        page: Math.max(1, page),
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        mode: "offset" as const,
      },
    };
  }

  async dashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const [active, todayCount, openOrders] = await Promise.all([
      this.db.queryAll(
        `SELECT d.*, o.order_no, o.customer_name FROM dispatch_assignments d
         JOIN transport_orders o ON o.id = d.order_id
         WHERE d.status NOT IN ('completed', 'reassigned')
         ORDER BY d.assigned_at DESC LIMIT 50`,
      ),
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM dispatch_assignments WHERE assigned_at::date = $1::date`,
        [today],
      ),
      this.db.queryAll(
        `SELECT * FROM transport_orders WHERE status IN ('booked', 'assigned') ORDER BY pickup_at NULLS LAST LIMIT 30`,
      ),
    ]);
    return {
      activeAssignments: active,
      assignmentsToday: parseInt(todayCount?.count ?? "0", 10),
      openOrders,
    };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(
      `SELECT d.*, o.order_no, o.customer_name, o.pickup_address, o.delivery_address
       FROM dispatch_assignments d JOIN transport_orders o ON o.id = d.order_id WHERE d.id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException("Assignment not found");
    return row;
  }

  async assign(dto: CreateDispatchDto) {
    const order = await this.orders.findOne(dto.orderId);
    if (!["booked", "assigned"].includes(order.status as string)) {
      throw new BadRequestException("Order cannot be assigned in current status");
    }
    const driver = await this.db.queryOne(`SELECT * FROM drivers WHERE id = $1 AND active = TRUE`, [dto.driverId]);
    if (!driver) throw new NotFoundException("Driver not found or inactive");
    const vehicle = await this.db.queryOne(`SELECT * FROM vehicles WHERE id = $1`, [dto.vehicleId]);
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    await this.db.queryOne(
      `UPDATE dispatch_assignments SET status = 'reassigned', updated_at = NOW()
       WHERE order_id = $1 AND status NOT IN ('completed', 'reassigned')`,
      [dto.orderId],
    );

    const row = await this.db.queryOne(
      `INSERT INTO dispatch_assignments (order_id, driver_id, vehicle_id, plate, driver_name, trip_notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dto.orderId, dto.driverId, dto.vehicleId, vehicle.plate, driver.name, dto.tripNotes ?? null],
    );
    await this.orders.update(dto.orderId, { status: "assigned" });
    await this.workflows.emit({
      audience: "admin",
      type: "dispatch_assigned",
      title: `Order ${order.order_no} assigned`,
      message: `${driver.name} · ${vehicle.plate}`,
      refId: row?.id as string,
    });
    await this.workflows.emit({
      audience: "client",
      type: "order_assigned",
      title: `Shipment ${order.order_no} assigned`,
      message: `Driver ${driver.name} · vehicle ${vehicle.plate}`,
      refId: order.id as string,
    });
    return row;
  }

  async update(id: string, dto: UpdateDispatchDto) {
    const before = await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      status: "status",
      tripNotes: "trip_notes",
      podSignature: "pod_signature",
      podPhotoUrl: "pod_photo_url",
      podNotes: "pod_notes",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (dto.status === "en_route" && !before.started_at) fields.push(`started_at = NOW()`);
    if (dto.status === "completed") fields.push(`completed_at = NOW()`);
    if (!fields.length) return before;
    fields.push("updated_at = NOW()");
    values.push(id);
    const after = await this.db.queryOne(
      `UPDATE dispatch_assignments SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (dto.status === "in_transit") {
      await this.orders.update(before.order_id as string, { status: "in_transit" });
    }
    if (dto.status === "completed") {
      await this.orders.update(before.order_id as string, { status: "delivered" });
      await this.workflows.emit({
        audience: "client",
        type: "order_delivered",
        title: `Shipment ${before.order_no} delivered`,
        message: "Proof of delivery recorded.",
        refId: before.order_id as string,
      });
    }
    return after;
  }

  async reassign(id: string, dto: ReassignDispatchDto) {
    const current = await this.findOne(id);
    await this.update(id, { status: "reassigned" });
    return this.assign({
      orderId: current.order_id as string,
      driverId: dto.driverId,
      vehicleId: dto.vehicleId,
      tripNotes: dto.tripNotes,
    });
  }

  driverTrips(driverId: string) {
    return this.db.queryAll(
      `SELECT d.*, o.order_no, o.customer_name, o.pickup_address, o.delivery_address, o.customer_phone
       FROM dispatch_assignments d
       JOIN transport_orders o ON o.id = d.order_id
       WHERE d.driver_id = $1 AND d.status NOT IN ('completed', 'reassigned')
       ORDER BY d.assigned_at DESC`,
      [driverId],
    );
  }
}
