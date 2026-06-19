import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { queryPaginated } from "../common/database/pagination.helper";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateConsolidatedInvoiceDto } from "./dto/consolidated-invoice.dto";

const DESCRIPTION = "Provision of Lease Vehicles & Courier Services";

@Injectable()
export class ConsolidatedInvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
  ) {}

  findAll(query: PaginationQueryDto, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (status) {
      clauses.push(`status = $${i++}`);
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    if (query.page === undefined && query.limit === undefined) {
      return this.db.queryAll(`SELECT * FROM consolidated_invoices ${where} ORDER BY created_at DESC`, params);
    }
    return queryPaginated(this.db, {
      table: "consolidated_invoices",
      where,
      params,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    });
  }

  async findUnbilled(from?: string, to?: string) {
    const clauses = [`status = 'approved'`, `consolidated_invoice_id IS NULL`];
    const params: unknown[] = [];
    let i = 1;
    if (from) {
      clauses.push(`trip_date >= $${i++}`);
      params.push(from);
    }
    if (to) {
      clauses.push(`trip_date <= $${i++}`);
      params.push(to);
    }
    return this.db.queryAll(
      `SELECT * FROM work_tickets WHERE ${clauses.join(" AND ")} ORDER BY trip_date`,
      params,
    );
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM consolidated_invoices WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Consolidated invoice not found");
    return row;
  }

  async findWithTickets(id: string) {
    const invoice = await this.findOne(id);
    const ids = (invoice as { work_ticket_ids: string[] }).work_ticket_ids ?? [];
    const tickets = ids.length
      ? await this.db.queryAll(`SELECT * FROM work_tickets WHERE id = ANY($1::uuid[])`, [ids])
      : [];
    return { invoice, tickets };
  }

  private async nextNumbers(periodEnd: string) {
    const d = new Date(periodEnd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const base = `INV-${year}-${month}-G4S`;
    const count = await this.db.queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM consolidated_invoices WHERE invoice_no LIKE $1`,
      [`${base}%`],
    );
    const n = parseInt(count?.c ?? "0", 10);
    const invoiceNo = n ? `${base}-${n + 1}` : base;
    const refNo = `101/${month}/${String(year).slice(-2)}`;
    return { invoiceNo, refNo };
  }

  async create(dto: CreateConsolidatedInvoiceDto) {
    const tickets = await this.db.queryAll(
      `SELECT * FROM work_tickets WHERE id = ANY($1::uuid[]) AND status = 'approved' AND consolidated_invoice_id IS NULL`,
      [dto.workTicketIds],
    );
    if (!tickets.length) throw new BadRequestException("No eligible work tickets");

    const net = tickets.reduce((s, t) => s + Number((t as { net: string }).net), 0);
    const vat = tickets.reduce((s, t) => s + Number((t as { vat: string }).vat), 0);
    const total = tickets.reduce((s, t) => s + Number((t as { total: string }).total), 0);
    const { invoiceNo, refNo } = await this.nextNumbers(dto.periodEnd);
    const id = randomUUID();

    return this.db.withTransaction(async (client) => {
      const invoice = await client.query(
        `INSERT INTO consolidated_invoices (
        id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
        payment_terms_days, total_trips, net, vat, total, status, work_ticket_ids
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,90,$8,$9,$10,$11,'draft',$12) RETURNING *`,
        [
          id,
          invoiceNo,
          refNo,
          dto.periodStart,
          dto.periodEnd,
          dto.invoiceDate ?? new Date().toISOString().slice(0, 10),
          DESCRIPTION,
          tickets.length,
          net,
          vat,
          total,
          JSON.stringify(dto.workTicketIds),
        ],
      );

      await client.query(
        `UPDATE work_tickets
         SET status = 'invoiced', consolidated_invoice_id = $1, updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
        [id, dto.workTicketIds],
      );

      return invoice.rows[0];
    });
  }

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    const before = await this.findOne(id);
    const fields = ["status = $1", "updated_at = NOW()"];
    const values: unknown[] = [status];
    let i = 2;
    for (const [col, val] of Object.entries(extra)) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
    values.push(id);
    const updated = await this.db.queryOne(
      `UPDATE consolidated_invoices SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (status === "pending_approval") {
      await this.workflows.emit({
        audience: "client",
        type: "consolidated_sent",
        title: `Consolidated invoice ${(updated as { invoice_no: string }).invoice_no} awaiting approval`,
        message: `SOA ${(updated as { ref_no: string }).ref_no}`,
        refId: id,
        actor: "admin",
      });
    }
    if (status === "approved" && before) {
      const approvedAt = new Date();
      const from = new Date(approvedAt);
      from.setDate(from.getDate() + 90);
      const to = new Date(approvedAt);
      to.setDate(to.getDate() + 100);
      return this.db.queryOne(
        `UPDATE consolidated_invoices SET status = 'approved', approved_at = NOW(),
         payment_window_from = $1, payment_window_to = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10), id],
      );
    }
    return updated;
  }
}
