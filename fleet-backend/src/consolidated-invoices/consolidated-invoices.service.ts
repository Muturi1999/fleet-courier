import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { resolvePageLimit, wantsFullList } from "../common/database/list-query.helper";
import { queryPaginated } from "../common/database/pagination.helper";
import { SEQUENCE_KEYS, TenantSequenceService } from "../common/database/tenant-sequence.service";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateConsolidatedInvoiceDto } from "./dto/consolidated-invoice.dto";

const DESCRIPTION = "Provision of Lease Vehicles & Courier Services";

type BillableRow = {
  id: string;
  invoice_id: string;
  invoice_no: string;
  work_ticket_id: string | null;
  net: string | number;
  vat: string | number;
  total: string | number;
};

@Injectable()
export class ConsolidatedInvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    private readonly sequences: TenantSequenceService,
  ) {}

  findAll(query: ListQueryDto, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (status) {
      clauses.push(`status = $${i++}`);
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM consolidated_invoices ${where} ORDER BY created_at DESC`, params);
    }

    const { page, limit } = resolvePageLimit(query);
    return queryPaginated(this.db, {
      table: "consolidated_invoices",
      where,
      params,
      page,
      limit,
      orderBy: "created_at DESC",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  private billableWhere(from?: string, to?: string, plate?: string) {
    const clauses = [
      `i.consolidated_invoice_id IS NULL`,
      `i.status NOT IN ('rejected')`,
      `(
        i.work_ticket_id IS NULL
        OR (
          wt.id IS NOT NULL
          AND wt.consolidated_invoice_id IS NULL
          AND wt.status NOT IN ('rejected', 'invoiced')
        )
      )`,
    ];
    const params: unknown[] = [];
    let i = 1;
    if (from) {
      clauses.push(`COALESCE(wt.trip_date, i.service_date, i.created_at::date) >= $${i++}::date`);
      params.push(from);
    }
    if (to) {
      clauses.push(`COALESCE(wt.trip_date, i.service_date, i.created_at::date) <= $${i++}::date`);
      params.push(to);
    }
    if (plate?.trim()) {
      clauses.push(`UPPER(REPLACE(i.plate, ' ', '')) = UPPER(REPLACE($${i++}, ' ', ''))`);
      params.push(plate.trim());
    }
    return { clauses, params };
  }

  /** Vehicles with uninvoiced trip invoices in period (latest activity first). */
  async findBillableVehicles(from?: string, to?: string) {
    const { clauses, params } = this.billableWhere(from, to);
    return this.db.queryAll(
      `SELECT
        i.plate,
        COUNT(*)::int AS invoice_count,
        COUNT(DISTINCT wt.id)::int AS ticket_count,
        COALESCE(SUM(i.net), 0) AS net,
        COALESCE(SUM(i.total), 0) AS total,
        MAX(COALESCE(wt.trip_date, i.service_date)) AS latest_trip,
        MAX(COALESCE(wt.created_at, i.created_at)) AS latest_activity
      FROM invoices i
      LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
      WHERE ${clauses.join(" AND ")}
      GROUP BY i.plate
      ORDER BY latest_activity DESC NULLS LAST, i.plate ASC`,
      params,
    );
  }

  async findUnbilled(from?: string, to?: string, plate?: string) {
    const { clauses, params } = this.billableWhere(from, to, plate);
    return this.db.queryAll(
      `SELECT
        COALESCE(wt.id, i.id) AS id,
        COALESCE(wt.serial_no, i.invoice_no) AS serial_no,
        COALESCE(wt.trip_date, i.service_date) AS trip_date,
        i.plate,
        COALESCE(NULLIF(TRIM(wt.route), ''), i.route) AS route,
        COALESCE(wt.driver_name, '') AS driver_name,
        COALESCE(wt.net, i.net) AS net,
        COALESCE(wt.vat, i.vat) AS vat,
        COALESCE(wt.total, i.total) AS total,
        i.id AS invoice_id,
        i.invoice_no,
        wt.id AS work_ticket_id
       FROM invoices i
       LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE(wt.trip_date, i.service_date) ASC, COALESCE(wt.serial_no, i.invoice_no) ASC`,
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
    if (ids.length) {
      const tickets = await this.db.queryAll(
        `SELECT * FROM work_tickets WHERE id = ANY($1::uuid[]) ORDER BY trip_date`,
        [ids],
      );
      return { invoice, tickets };
    }

    const invoiceRows = await this.db.queryAll(
      `SELECT
        i.id,
        i.invoice_no AS serial_no,
        i.service_date AS trip_date,
        i.plate,
        i.route,
        '' AS driver_name,
        i.net,
        i.vat,
        i.total,
        i.invoice_no
       FROM invoices i
       WHERE i.consolidated_invoice_id = $1
       ORDER BY i.service_date ASC, i.invoice_no ASC`,
      [id],
    );
    return { invoice, tickets: invoiceRows };
  }

  private async nextNumbers() {
    const serial = await this.sequences.next(SEQUENCE_KEYS.consolidatedInvoiceSerial);
    const s = String(serial);
    return { invoiceNo: s, refNo: s };
  }

  private async resolveBillableItems(dto: CreateConsolidatedInvoiceDto): Promise<{
    workTicketIds: string[];
    invoiceIds: string[];
    plate?: string;
  }> {
    if (dto.workTicketIds?.length) {
      const rows = (await this.db.queryAll(
        `SELECT i.id AS invoice_id, wt.id AS work_ticket_id
         FROM invoices i
         LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
         WHERE (wt.id = ANY($1::uuid[]) OR i.id = ANY($1::uuid[]))
           AND i.consolidated_invoice_id IS NULL`,
        [dto.workTicketIds],
      )) as BillableRow[];
      return {
        workTicketIds: rows.map((r) => r.work_ticket_id).filter(Boolean) as string[],
        invoiceIds: rows.map((r) => r.invoice_id),
      };
    }
    if (!dto.plate?.trim()) {
      throw new BadRequestException("Provide plate or workTicketIds");
    }
    const plate = dto.plate.trim();
    const rows = (await this.findUnbilled(dto.periodStart, dto.periodEnd, plate)) as BillableRow[];
    const invoiceIds = rows.map((r) => r.invoice_id);
    const workTicketIds = rows.map((r) => r.work_ticket_id).filter(Boolean) as string[];
    if (!invoiceIds.length) {
      throw new BadRequestException(`No billable trip invoices for ${plate} in this period`);
    }
    return { workTicketIds, invoiceIds, plate };
  }

  async create(dto: CreateConsolidatedInvoiceDto) {
    const { workTicketIds, invoiceIds, plate: vehiclePlate } = await this.resolveBillableItems(dto);

    const invoices = (await this.db.queryAll(
      `SELECT * FROM invoices WHERE id = ANY($1::uuid[]) AND consolidated_invoice_id IS NULL`,
      [invoiceIds],
    )) as BillableRow[];

    if (!invoices.length) throw new BadRequestException("No eligible invoices to consolidate");

    const net = invoices.reduce((s, t) => s + Number(t.net), 0);
    const vat = invoices.reduce((s, t) => s + Number(t.vat), 0);
    const total = invoices.reduce((s, t) => s + Number(t.total), 0);
    const plate =
      vehiclePlate ??
      (await this.db.queryOne<{ plate: string }>(`SELECT plate FROM invoices WHERE id = $1`, [invoiceIds[0]]))?.plate;
    const { invoiceNo, refNo } = await this.nextNumbers();
    const id = randomUUID();

    return this.db.withTransaction(async (client) => {
      const invoice = await client.query(
        `INSERT INTO consolidated_invoices (
        id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
        payment_terms_days, total_trips, net, vat, total, status, work_ticket_ids, plate
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,90,$8,$9,$10,$11,'draft',$12,$13) RETURNING *`,
        [
          id,
          invoiceNo,
          refNo,
          dto.periodStart,
          dto.periodEnd,
          dto.invoiceDate ?? new Date().toISOString().slice(0, 10),
          DESCRIPTION,
          invoices.length,
          net,
          vat,
          total,
          JSON.stringify(workTicketIds),
          plate ?? null,
        ],
      );

      if (workTicketIds.length) {
        await client.query(
          `UPDATE work_tickets
           SET status = 'invoiced', consolidated_invoice_id = $1, updated_at = NOW()
           WHERE id = ANY($2::uuid[])`,
          [id, workTicketIds],
        );
      }

      await client.query(
        `UPDATE invoices
         SET consolidated_invoice_id = $1, status = 'sent', updated_at = NOW()
         WHERE id = ANY($2::uuid[]) AND consolidated_invoice_id IS NULL`,
        [id, invoiceIds],
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

  async remove(id: string) {
    const row = (await this.findOne(id)) as { status: string };
    if (row.status !== "draft") {
      throw new BadRequestException("Only draft consolidated invoices can be deleted");
    }

    return this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE invoices
         SET consolidated_invoice_id = NULL, updated_at = NOW()
         WHERE consolidated_invoice_id = $1`,
        [id],
      );
      await client.query(
        `UPDATE work_tickets
         SET consolidated_invoice_id = NULL,
             status = CASE WHEN status = 'invoiced' THEN 'approved' ELSE status END,
             updated_at = NOW()
         WHERE consolidated_invoice_id = $1`,
        [id],
      );
      await client.query(`DELETE FROM consolidated_invoices WHERE id = $1`, [id]);
      return { ok: true };
    });
  }
}
