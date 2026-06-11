import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { queryPaginated } from "../common/database/pagination.helper";
import { PaginatedResult, PaginationQueryDto } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";

const INVOICE_SERIES_START = 17206;

type InvoiceRow = Record<string, unknown> & {
  id: string;
  invoice_no: string;
  plate: string;
  route: string;
  total: string | number;
  status: string;
  client_note?: string | null;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    @InjectQueue("etims") private readonly etimsQueue: Queue,
  ) {}

  async findAll(query: PaginationQueryDto, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (query.search?.trim()) {
      clauses.push(
        `(LOWER(plate) LIKE $${i} OR LOWER(invoice_no) LIKE $${i} OR LOWER(route) LIKE $${i})`,
      );
      params.push(`%${query.search.toLowerCase()}%`);
      i++;
    }
    if (status) {
      clauses.push(`status = $${i++}`);
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (query.page === undefined && query.limit === undefined) {
      return this.db.queryAll(`SELECT * FROM invoices ${where} ORDER BY created_at DESC`, params);
    }

    return queryPaginated(this.db, {
      table: "invoices",
      where,
      params,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    }) as Promise<PaginatedResult<InvoiceRow>>;
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Invoice not found");
    return row;
  }

  async nextInvoiceNo(): Promise<string> {
    const row = await this.db.queryOne<{ max: string | null }>(
      `SELECT MAX(CAST(REGEXP_REPLACE(invoice_no, '\\D', '', 'g') AS BIGINT))::text AS max FROM invoices`,
    );
    const max = parseInt(row?.max ?? String(INVOICE_SERIES_START - 1), 10);
    return String(Math.max(max, INVOICE_SERIES_START - 1) + 1);
  }

  create(dto: CreateInvoiceDto) {
    return this.db.queryOne(
      `INSERT INTO invoices (invoice_no, plate, cls, route, days, net, vat, total, status, service_date, period, delivery_note_no, client_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
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
        dto.period ?? null,
        dto.deliveryNoteNo ?? null,
        dto.clientNote ?? null,
      ],
    );
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
