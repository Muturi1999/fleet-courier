import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  addDateClause,
  addDestinationClause,
  addSearchClause,
  addStatusClause,
  wantsFullList,
} from "../common/database/list-query.helper";
import { queryList } from "../common/database/pagination.helper";
import { SEQUENCE_KEYS, TenantSequenceService } from "../common/database/tenant-sequence.service";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PartnersService } from "../partners/partners.service";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";

type InvoiceRow = Record<string, unknown> & {
  id: string;
  invoice_no: string;
  plate: string;
  route: string;
  total: string | number;
  status: string;
  client_note?: string | null;
  partner_id?: string | null;
};

type StatusCounts = Record<string, number>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    private readonly partners: PartnersService,
    private readonly sequences: TenantSequenceService,
    @InjectQueue("etims") private readonly etimsQueue: Queue,
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
    i = addSearchClause(clauses, params, i, ["plate", "invoice_no", "route", "cls", "period"], query.search);
    i = addDestinationClause(clauses, params, i, "route", query.destination);
    i = addDateClause(clauses, params, i, "service_date", query.date);
    i = addStatusClause(clauses, params, i, status);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { where, params };
  }

  async findAll(query: ListQueryDto, status?: string) {
    const { where, params } = this.buildWhere(query, status);

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM invoices ${where} ORDER BY created_at DESC, id DESC`, params);
    }

    return queryList<InvoiceRow>(this.db, query, {
      table: "invoices",
      where,
      params,
      orderBy: "created_at DESC, id DESC",
    });
  }

  async summary() {
    const rows = await this.db.queryAll<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM invoices GROUP BY status`,
    );
    const counts: StatusCounts = {};
    let total = 0;
    for (const row of rows) {
      const n = parseInt(row.count, 10);
      counts[row.status] = n;
      total += n;
    }
    return {
      total,
      draft: counts.draft ?? 0,
      sent: counts.sent ?? 0,
      pending: counts.pending ?? 0,
      approved: counts.approved ?? 0,
      paid: counts.paid ?? 0,
      rejected: counts.rejected ?? 0,
    };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Invoice not found");
    return row;
  }

  async nextInvoiceNo(): Promise<string> {
    const n = await this.sequences.next(SEQUENCE_KEYS.invoiceNo);
    return String(n);
  }

  async create(dto: CreateInvoiceDto) {
    const partnerId = await this.resolvePartnerId(dto.partnerId);
    const period = dto.period ? dto.period.slice(0, 120) : null;
    return this.db.queryOne(
      `INSERT INTO invoices (invoice_no, plate, cls, route, days, net, vat, total, status, service_date, period, delivery_note_no, client_note, partner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        dto.invoiceNo,
        dto.plate,
        dto.cls,
        dto.route,
        dto.days,
        dto.net,
        dto.vat,
        dto.total,
        dto.status ?? "draft",
        dto.serviceDate ?? null,
        period,
        dto.deliveryNoteNo ?? null,
        dto.clientNote ?? null,
        partnerId,
      ],
    );
  }

  async importBulk(rows: CreateInvoiceDto[]) {
    if (!rows.length) return { imported: 0, rows: [] as unknown[] };

    const partnerId = await this.resolvePartnerId();
    const created = await this.db.withTransaction(async (client) => {
      const start = await this.sequences.nextN(client, SEQUENCE_KEYS.invoiceNo, rows.length);
      const values: unknown[][] = rows.map((dto, idx) => {
        const invoiceNo = dto.invoiceNo?.trim() || String(start + idx);
        const period = dto.period ? dto.period.slice(0, 120) : null;
        return [
          invoiceNo,
          dto.plate,
          dto.cls,
          dto.route,
          dto.days,
          dto.net,
          dto.vat,
          dto.total,
          dto.status ?? "draft",
          dto.serviceDate ?? null,
          period,
          dto.deliveryNoteNo ?? null,
          dto.clientNote ?? null,
          partnerId,
        ];
      });

      const tuples: string[] = [];
      const flat: unknown[] = [];
      let p = 1;
      for (const row of values) {
        tuples.push(`(${row.map(() => `$${p++}`).join(", ")})`);
        flat.push(...row);
      }

      const result = await client.query(
        `INSERT INTO invoices (invoice_no, plate, cls, route, days, net, vat, total, status, service_date, period, delivery_note_no, client_note, partner_id)
         VALUES ${tuples.join(", ")} RETURNING *`,
        flat,
      );
      return result.rows;
    });

    return { imported: created.length, rows: created };
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const before = (await this.findOne(id)) as InvoiceRow;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      invoiceNo: "invoice_no",
      plate: "plate",
      cls: "cls",
      route: "route",
      days: "days",
      net: "net",
      vat: "vat",
      total: "total",
      status: "status",
      serviceDate: "service_date",
      period: "period",
      deliveryNoteNo: "delivery_note_no",
      clientNote: "client_note",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }

    if (dto.status === "sent" && !before.partner_id) {
      const partnerId = await this.resolvePartnerId();
      if (partnerId) {
        fields.push(`partner_id = $${i++}`);
        values.push(partnerId);
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const updated = (await this.db.queryOne(
      `UPDATE invoices SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    )) as InvoiceRow;

    await this.workflows.processInvoiceStatusChange(
      before as Parameters<WorkflowsService["processInvoiceStatusChange"]>[0],
      updated as Parameters<WorkflowsService["processInvoiceStatusChange"]>[1],
    );

    if (dto.status === "sent" && before.status !== "sent") {
      const tenant = TenantContextStorage.getOrThrow();
      await this.etimsQueue.add("submit-invoice", {
        invoiceId: id,
        tenantSchema: tenant.schema,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      });
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM invoices WHERE id = $1`, [id]);
    return { ok: true };
  }
}
