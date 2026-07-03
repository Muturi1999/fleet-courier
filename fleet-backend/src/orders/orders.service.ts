import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  addDateClause,
  addSearchClause,
  addStatusClause,
  wantsFullList,
} from "../common/database/list-query.helper";
import { queryList } from "../common/database/pagination.helper";
import { SEQUENCE_KEYS, TenantSequenceService } from "../common/database/tenant-sequence.service";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PartnersService } from "../partners/partners.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateOrderDto, UpdateOrderDto } from "./dto/order.dto";

const VALID_STATUSES = ["booked", "assigned", "in_transit", "delivered", "cancelled"] as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly sequences: TenantSequenceService,
    private readonly partners: PartnersService,
    private readonly workflows: WorkflowsService,
  ) {}

  private async resolvePartnerId(explicit?: string | null) {
    if (explicit) return explicit;
    const tenant = TenantContextStorage.getOrThrow();
    return this.partners.defaultPartnerId(tenant.id);
  }

  private buildWhere(query: ListQueryDto, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    i = addSearchClause(
      clauses,
      params,
      i,
      ["order_no", "customer_name", "pickup_address", "delivery_address", "route_hint"],
      query.search,
    );
    i = addDateClause(clauses, params, i, "pickup_at", query.date);
    i = addStatusClause(clauses, params, i, status ?? query.status);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { where, params };
  }

  findAll(query: ListQueryDto, status?: string) {
    const { where, params } = this.buildWhere(query, status);
    if (wantsFullList(query)) {
      return this.db.queryAll(
        `SELECT * FROM transport_orders ${where} ORDER BY created_at DESC, id DESC`,
        params,
      );
    }
    return queryList(this.db, query, {
      table: "transport_orders",
      where,
      params,
      orderBy: "created_at DESC, id DESC",
    });
  }

  async summary() {
    const rows = await this.db.queryAll<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM transport_orders GROUP BY status`,
    );
    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      counts[row.status] = parseInt(row.count, 10);
      total += counts[row.status];
    }
    return { total, ...counts };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM transport_orders WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Order not found");
    return row;
  }

  async nextOrderNo() {
    const n = await this.sequences.next(SEQUENCE_KEYS.transportOrderNo);
    return `ORD-${n}`;
  }

  async create(dto: CreateOrderDto) {
    const orderNo = await this.nextOrderNo();
    const partnerId = await this.resolvePartnerId(dto.partnerId);
    const row = await this.db.queryOne(
      `INSERT INTO transport_orders (
        order_no, partner_id, customer_name, customer_phone, pickup_address, delivery_address,
        route_hint, pickup_at, delivery_due_at, cargo_description, weight_kg, quoted_amount, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        orderNo,
        partnerId,
        dto.customerName,
        dto.customerPhone ?? null,
        dto.pickupAddress,
        dto.deliveryAddress,
        dto.routeHint ?? null,
        dto.pickupAt ?? null,
        dto.deliveryDueAt ?? null,
        dto.cargoDescription ?? null,
        dto.weightKg ?? null,
        dto.quotedAmount ?? null,
        dto.notes ?? null,
      ],
    );
    await this.workflows.emit({
      audience: "admin",
      type: "order_created",
      title: `Order ${orderNo} booked`,
      message: `${dto.customerName}: ${dto.pickupAddress} → ${dto.deliveryAddress}`,
      refId: row?.id as string,
    });
    return row;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const before = await this.findOne(id);
    if (dto.status && !VALID_STATUSES.includes(dto.status as (typeof VALID_STATUSES)[number])) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      customerName: "customer_name",
      customerPhone: "customer_phone",
      pickupAddress: "pickup_address",
      deliveryAddress: "delivery_address",
      routeHint: "route_hint",
      pickupAt: "pickup_at",
      deliveryDueAt: "delivery_due_at",
      cargoDescription: "cargo_description",
      weightKg: "weight_kg",
      quotedAmount: "quoted_amount",
      notes: "notes",
      status: "status",
      partnerId: "partner_id",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (!fields.length) return before;
    fields.push("updated_at = NOW()");
    values.push(id);
    const after = await this.db.queryOne(
      `UPDATE transport_orders SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (dto.status === "delivered" && before.status !== "delivered") {
      await this.maybeCreateInvoice(after as Record<string, unknown>);
    }
    return after;
  }

  private async maybeCreateInvoice(order: Record<string, unknown>) {
    if (order.invoice_id) return;
    const amount = Number(order.quoted_amount ?? 0);
    if (amount <= 0) return;
    const invoiceNo = String(await this.sequences.next(SEQUENCE_KEYS.invoiceNo));
    const net = Math.round((amount / 1.16) * 100) / 100;
    const vat = Math.round((amount - net) * 100) / 100;
    const inv = await this.db.queryOne(
      `INSERT INTO invoices (
        invoice_no, plate, cls, route, days, net, vat, total, status, service_date, partner_id
      ) VALUES ($1,$2,$3,$4,1,$5,$6,$7,'draft',$8,$9) RETURNING *`,
      [
        invoiceNo,
        "LOGISTICS",
        "7T",
        (order.route_hint as string) ?? `${order.pickup_address} → ${order.delivery_address}`,
        net,
        vat,
        amount,
        order.pickup_at ? new Date(order.pickup_at as string).toISOString().slice(0, 10) : null,
        order.partner_id,
      ],
    );
    if (inv) {
      await this.db.queryOne(
        `UPDATE transport_orders SET invoice_id = $1, updated_at = NOW() WHERE id = $2`,
        [inv.id, order.id],
      );
      await this.workflows.emit({
        audience: "admin",
        type: "order_invoiced",
        title: `Draft invoice ${invoiceNo} from order ${order.order_no}`,
        message: `Auto-created from delivered order · KES ${amount.toLocaleString("en-KE")}`,
        refId: inv.id as string,
      });
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.queryOne(`DELETE FROM transport_orders WHERE id = $1 RETURNING id`, [id]);
    return { ok: true };
  }
}
