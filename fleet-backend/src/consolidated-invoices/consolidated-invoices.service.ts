import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { resolvePageLimit, wantsFullList } from "../common/database/list-query.helper";
import { queryPaginated } from "../common/database/pagination.helper";
import { SEQUENCE_KEYS, TenantSequenceService } from "../common/database/tenant-sequence.service";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateConsolidatedInvoiceDto, ReviseConsolidatedInvoiceDto } from "./dto/consolidated-invoice.dto";

const DESCRIPTION = "Provision of Lease Vehicles & Courier Services";

type BillableFilters = {
  route?: string;
  cls?: string;
  runType?: string;
  runRoute?: string;
};

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
      return this.db.queryAll(
        `SELECT * FROM consolidated_invoices ${where}
         ORDER BY created_at DESC,
           CASE WHEN invoice_no ~ '^\\d+$' THEN invoice_no::bigint ELSE 0 END DESC`,
        params,
      );
    }

    const { page, limit } = resolvePageLimit(query);
    return queryPaginated(this.db, {
      table: "consolidated_invoices",
      where,
      params,
      page,
      limit,
      orderBy: `created_at DESC, CASE WHEN invoice_no ~ '^\\d+$' THEN invoice_no::bigint ELSE 0 END DESC`,
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  /** Trip invoices not on a finalized consolidated statement (draft batches can be re-consolidated). */
  private static readonly INVOICE_BILLABLE_SQL = `(
    i.consolidated_invoice_id IS NULL
    OR EXISTS (
      SELECT 1 FROM consolidated_invoices ci
      WHERE ci.id = i.consolidated_invoice_id AND ci.status = 'draft'
    )
  )`;

  private static readonly WT_BILLABLE_SQL = `(
    wt.consolidated_invoice_id IS NULL
    OR EXISTS (
      SELECT 1 FROM consolidated_invoices ci
      WHERE ci.id = wt.consolidated_invoice_id AND ci.status = 'draft'
    )
  )`;

  private billableWhere(from?: string, to?: string, plate?: string, filters?: BillableFilters) {
    const clauses = [
      ConsolidatedInvoicesService.INVOICE_BILLABLE_SQL,
      `i.status NOT IN ('rejected')`,
      `(
        i.work_ticket_id IS NULL
        OR (
          wt.id IS NOT NULL
          AND ${ConsolidatedInvoicesService.WT_BILLABLE_SQL}
          AND wt.status NOT IN ('rejected')
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
    if (filters?.runRoute?.trim()) {
      const term = `%${filters.runRoute.trim()}%`;
      clauses.push(
        `(
          COALESCE(NULLIF(TRIM(wt.route), ''), i.route) ILIKE $${i++}
          OR COALESCE(v.run_type, '') ILIKE $${i++}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(v.dests, '[]'::jsonb)) d
            WHERE d ILIKE $${i++}
          )
        )`,
      );
      params.push(term, term, term);
    } else {
      if (filters?.route?.trim()) {
        clauses.push(`COALESCE(NULLIF(TRIM(wt.route), ''), i.route) ILIKE $${i++}`);
        params.push(`%${filters.route.trim()}%`);
      }
      if (filters?.runType?.trim()) {
        clauses.push(
          `EXISTS (
          SELECT 1 FROM vehicles v2
          WHERE UPPER(REPLACE(v2.plate, ' ', '')) = UPPER(REPLACE(i.plate, ' ', ''))
            AND v2.run_type ILIKE $${i++}
        )`,
        );
        params.push(`%${filters.runType.trim()}%`);
      }
    }
    if (filters?.cls?.trim()) {
      clauses.push(`i.cls = $${i++}`);
      params.push(filters.cls.trim());
    }
    return { clauses, params };
  }

  private billableFiltersFromDto(dto: {
    route?: string;
    cls?: string;
    runType?: string;
    runRoute?: string;
  }): BillableFilters {
    return {
      route: dto.route?.trim() || undefined,
      cls: dto.cls?.trim() || undefined,
      runType: dto.runType?.trim() || undefined,
      runRoute: dto.runRoute?.trim() || undefined,
    };
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

  async findUnbilled(from?: string, to?: string, plate?: string, filters?: BillableFilters) {
    const { clauses, params } = this.billableWhere(from, to, plate, filters);
    return this.db.queryAll(
      `SELECT
        COALESCE(wt.id, i.id) AS id,
        COALESCE(wt.serial_no, i.invoice_no) AS serial_no,
        COALESCE(wt.trip_date, i.service_date) AS trip_date,
        i.plate,
        i.cls,
        COALESCE(NULLIF(TRIM(wt.make), ''), '') AS make,
        COALESCE(NULLIF(TRIM(wt.branch), ''), '') AS branch,
        wt.legs,
        COALESCE(NULLIF(TRIM(wt.route), ''), i.route) AS route,
        COALESCE(wt.driver_name, '') AS driver_name,
        COALESCE(wt.net, i.net) AS net,
        COALESCE(wt.vat, i.vat) AS vat,
        COALESCE(wt.total, i.total) AS total,
        GREATEST(COALESCE(NULLIF(i.days, 0), 1), 1) AS days,
        COALESCE(NULLIF(wt.agreed_rate, 0), applicable_rate.rate, 0) AS agreed_rate,
        i.id AS invoice_id,
        i.invoice_no,
        wt.id AS work_ticket_id,
        COALESCE(v.run_type, '') AS run_type,
        TO_CHAR(COALESCE(wt.trip_date, i.service_date), 'YYYY-MM') AS trip_month
       FROM invoices i
       LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
       LEFT JOIN vehicles v ON UPPER(REPLACE(v.plate, ' ', '')) = UPPER(REPLACE(i.plate, ' ', ''))
       LEFT JOIN LATERAL (
         SELECT r.rate
         FROM rates r
         WHERE r.status = 'active'
           AND r.cls = i.cls
           AND (
             LOWER(TRIM(r.route)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)))
             OR LOWER(r.route) LIKE '%' || LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route))) || '%'
             OR LOWER(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)) LIKE '%' || LOWER(TRIM(r.route)) || '%'
           )
         ORDER BY r.effective_from DESC
         LIMIT 1
       ) applicable_rate ON TRUE
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE(wt.trip_date, i.service_date) ASC, COALESCE(wt.serial_no, i.invoice_no) ASC`,
      params,
    );
  }

  /** Grouped preview for period consolidation UI. */
  async findPeriodPreview(
    from?: string,
    to?: string,
    groupBy = "vehicle",
    filters?: BillableFilters,
  ) {
    const lines = (await this.findUnbilled(from, to, undefined, filters)) as Record<string, unknown>[];
    const keyFor = (row: Record<string, unknown>): string => {
      switch (groupBy) {
        case "route":
          return String(row.route ?? "Unknown route");
        case "cls":
          return String(row.cls ?? "Unknown class");
        case "runType":
          return String(row.run_type ?? "Unknown run");
        case "month":
          return String(row.trip_month ?? "Unknown month");
        default:
          return String(row.plate ?? "Unknown vehicle");
      }
    };

    const groups = new Map<
      string,
      { key: string; invoiceCount: number; net: number; total: number; lines: Record<string, unknown>[] }
    >();

    for (const row of lines) {
      const key = keyFor(row);
      const bucket = groups.get(key) ?? { key, invoiceCount: 0, net: 0, total: 0, lines: [] };
      bucket.invoiceCount += 1;
      bucket.net += Number(row.net ?? 0);
      bucket.total += Number(row.total ?? 0);
      bucket.lines.push(row);
      groups.set(key, bucket);
    }

    const grouped = [...groups.values()].sort((a, b) => b.net - a.net);
    const net = lines.reduce((s, r) => s + Number(r.net ?? 0), 0);
    const total = lines.reduce((s, r) => s + Number(r.total ?? 0), 0);

    return {
      from,
      to,
      groupBy,
      filters: filters ?? {},
      invoiceCount: lines.length,
      vehicleCount: new Set(lines.map((r) => String(r.plate ?? ""))).size,
      net,
      total,
      groups: grouped,
      lines,
    };
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
        `SELECT wt.*,
          GREATEST(COALESCE(NULLIF(i.days, 0), 1), 1) AS days,
          COALESCE(NULLIF(wt.agreed_rate, 0), applicable_rate.rate, 0) AS agreed_rate,
          COALESCE(NULLIF(TRIM(i.cls), ''), '') AS cls
         FROM work_tickets wt
         LEFT JOIN invoices i ON i.work_ticket_id = wt.id
         LEFT JOIN LATERAL (
           SELECT r.rate
           FROM rates r
           WHERE r.status = 'active'
             AND r.cls = COALESCE(NULLIF(TRIM(i.cls), ''), '7T')
             AND (
               LOWER(TRIM(r.route)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)))
               OR LOWER(r.route) LIKE '%' || LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route))) || '%'
               OR LOWER(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)) LIKE '%' || LOWER(TRIM(r.route)) || '%'
             )
           ORDER BY r.effective_from DESC
           LIMIT 1
         ) applicable_rate ON TRUE
         WHERE wt.id = ANY($1::uuid[])
         ORDER BY wt.trip_date`,
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
        i.cls,
        i.route,
        '' AS driver_name,
        '' AS make,
        '' AS branch,
        '[]'::jsonb AS legs,
        i.net,
        i.vat,
        i.total,
        GREATEST(COALESCE(NULLIF(i.days, 0), 1), 1) AS days,
        COALESCE(applicable_rate.rate, 0) AS agreed_rate,
        i.invoice_no
       FROM invoices i
       LEFT JOIN LATERAL (
         SELECT r.rate
         FROM rates r
         WHERE r.status = 'active'
           AND r.cls = i.cls
           AND (
             LOWER(TRIM(r.route)) = LOWER(TRIM(i.route))
             OR LOWER(r.route) LIKE '%' || LOWER(TRIM(i.route)) || '%'
             OR LOWER(i.route) LIKE '%' || LOWER(TRIM(r.route)) || '%'
           )
         ORDER BY r.effective_from DESC
         LIMIT 1
       ) applicable_rate ON TRUE
       WHERE i.consolidated_invoice_id = $1
       ORDER BY i.service_date ASC, i.invoice_no ASC`,
      [id],
    );
    return { invoice, tickets: invoiceRows };
  }

  /** Unlink trip invoices from draft batches so they can join a new consolidation; prior drafts are kept for lookup. */
  private async releaseFromDraftConsolidations(client: PoolClient, invoiceIds: string[]) {
    if (!invoiceIds.length) return;

    await client.query(
      `UPDATE work_tickets wt
       SET consolidated_invoice_id = NULL,
           status = CASE WHEN wt.status = 'invoiced' THEN 'approved' ELSE wt.status END,
           updated_at = NOW()
       FROM invoices i
       WHERE i.work_ticket_id = wt.id
         AND i.id = ANY($1::uuid[])
         AND wt.consolidated_invoice_id IN (SELECT id FROM consolidated_invoices WHERE status = 'draft')`,
      [invoiceIds],
    );

    await client.query(
      `UPDATE invoices
       SET consolidated_invoice_id = NULL,
           status = CASE WHEN status = 'sent' THEN 'approved' ELSE status END,
           etims_status = CASE WHEN etims_status = 'consolidated' THEN 'pending' ELSE etims_status END,
           updated_at = NOW()
       WHERE id = ANY($1::uuid[])
         AND consolidated_invoice_id IN (SELECT id FROM consolidated_invoices WHERE status = 'draft')`,
      [invoiceIds],
    );
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
    mode: "vehicle" | "period";
    filters: BillableFilters;
  }> {
    const filters = this.billableFiltersFromDto(dto);
    if (dto.workTicketIds?.length) {
      const rows = (await this.db.queryAll(
        `SELECT i.id AS invoice_id, wt.id AS work_ticket_id
         FROM invoices i
         LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
         WHERE (wt.id = ANY($1::uuid[]) OR i.id = ANY($1::uuid[]))
           AND (${ConsolidatedInvoicesService.INVOICE_BILLABLE_SQL.replace(/i\./g, "i.")})`,
        [dto.workTicketIds],
      )) as BillableRow[];
      return {
        workTicketIds: rows.map((r) => r.work_ticket_id).filter(Boolean) as string[],
        invoiceIds: rows.map((r) => r.invoice_id),
        mode: dto.mode === "period" ? "period" : "vehicle",
        filters,
      };
    }
    if (dto.mode === "period") {
      const rows = (await this.findUnbilled(dto.periodStart, dto.periodEnd, undefined, filters)) as BillableRow[];
      const invoiceIds = rows.map((r) => r.invoice_id);
      const workTicketIds = rows.map((r) => r.work_ticket_id).filter(Boolean) as string[];
      if (!invoiceIds.length) {
        throw new BadRequestException("No billable trip invoices in this period for the selected filters");
      }
      return { workTicketIds, invoiceIds, mode: "period", filters };
    }
    if (!dto.plate?.trim()) {
      throw new BadRequestException("Provide plate, period mode, or workTicketIds");
    }
    const plate = dto.plate.trim();
    const rows = (await this.findUnbilled(dto.periodStart, dto.periodEnd, plate, filters)) as BillableRow[];
    const invoiceIds = rows.map((r) => r.invoice_id);
    const workTicketIds = rows.map((r) => r.work_ticket_id).filter(Boolean) as string[];
    if (!invoiceIds.length) {
      throw new BadRequestException(`No billable trip invoices for ${plate} in this period`);
    }
    return { workTicketIds, invoiceIds, plate, mode: "vehicle", filters };
  }

  async create(dto: CreateConsolidatedInvoiceDto) {
    const { workTicketIds, invoiceIds, plate: vehiclePlate, mode, filters } =
      await this.resolveBillableItems(dto);

    const invoices = (await this.db.queryAll(
      `SELECT i.*,
        COALESCE(NULLIF(wt.agreed_rate, 0), applicable_rate.rate, 0) AS agreed_rate
       FROM invoices i
       LEFT JOIN work_tickets wt ON wt.id = i.work_ticket_id
       LEFT JOIN LATERAL (
         SELECT r.rate
         FROM rates r
         WHERE r.status = 'active'
           AND r.cls = i.cls
           AND (
             LOWER(TRIM(r.route)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)))
             OR LOWER(r.route) LIKE '%' || LOWER(TRIM(COALESCE(NULLIF(TRIM(wt.route), ''), i.route))) || '%'
             OR LOWER(COALESCE(NULLIF(TRIM(wt.route), ''), i.route)) LIKE '%' || LOWER(TRIM(r.route)) || '%'
           )
         ORDER BY r.effective_from DESC
         LIMIT 1
       ) applicable_rate ON TRUE
       WHERE i.id = ANY($1::uuid[])`,
      [invoiceIds],
    )) as BillableRow[];

    if (!invoices.length) throw new BadRequestException("No eligible invoices to consolidate");

    const net = invoices.reduce((s, t) => s + Number(t.net), 0);
    const vat = invoices.reduce((s, t) => s + Number(t.vat), 0);
    const total = invoices.reduce((s, t) => s + Number(t.total), 0);
    const totalTrips = invoices.reduce((s, t) => {
      const row = t as { days?: number; net?: number; agreed_rate?: number };
      const stored = Math.max(1, Number(row.days ?? 1));
      if (stored > 1) return s + stored;
      const net = Number(row.net ?? 0);
      const rate = Number(row.agreed_rate ?? 0);
      if (rate > 0 && net > 0) return s + Math.max(1, Math.round(net / rate));
      return s + 1;
    }, 0);
    const plate =
      mode === "vehicle"
        ? (vehiclePlate ??
          (await this.db.queryOne<{ plate: string }>(`SELECT plate FROM invoices WHERE id = $1`, [invoiceIds[0]]))
            ?.plate)
        : null;
    const filterMeta = {
      ...filters,
      groupBy: mode === "period" ? "period" : "vehicle",
    };
    const { invoiceNo, refNo } = await this.nextNumbers();
    const id = randomUUID();

    return this.db.withTransaction(async (client) => {
      await this.releaseFromDraftConsolidations(client, invoiceIds);

      const invoice = await client.query(
        `INSERT INTO consolidated_invoices (
        id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
        payment_terms_days, total_trips, net, vat, total, status, work_ticket_ids, plate,
        consolidation_type, filter_meta
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,90,$8,$9,$10,$11,'draft',$12,$13,$14,$15) RETURNING *`,
        [
          id,
          invoiceNo,
          refNo,
          dto.periodStart,
          dto.periodEnd,
          dto.invoiceDate ?? new Date().toISOString().slice(0, 10),
          DESCRIPTION,
          totalTrips,
          net,
          vat,
          total,
          JSON.stringify(workTicketIds),
          plate ?? null,
          mode,
          JSON.stringify(filterMeta),
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
         SET consolidated_invoice_id = $1, status = 'sent', etims_status = 'consolidated', updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
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
    if (status === "rejected" && before) {
      const note = (extra.client_note as string | undefined) ? ` Note: ${extra.client_note}` : "";
      await this.workflows.emit({
        audience: "admin",
        type: "consolidated_rejected",
        title: `G4S returned SOA ${(updated as { ref_no: string }).ref_no}`,
        message: `Consolidated invoice ${(updated as { invoice_no: string }).invoice_no}${note}`,
        refId: id,
        actor: "client",
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

  /** Create a new draft SOA with corrected period; re-link trips from rejected/draft source. */
  async revise(id: string, dto: ReviseConsolidatedInvoiceDto) {
    const source = (await this.findOne(id)) as Record<string, unknown>;
    if (!source) throw new NotFoundException("Consolidated invoice not found");

    const status = String(source.status ?? "");
    if (status !== "rejected" && status !== "draft") {
      throw new BadRequestException("Only rejected or draft consolidated invoices can be revised");
    }
    if (source.superseded_by_id) {
      throw new BadRequestException("This SOA has already been superseded by a revised copy");
    }

    const pendingRevision = await this.db.queryOne(
      `SELECT id, invoice_no FROM consolidated_invoices
       WHERE revised_from_id = $1 AND status = 'draft' LIMIT 1`,
      [id],
    );
    if (pendingRevision) {
      throw new BadRequestException(
        `A draft revision already exists (serial ${(pendingRevision as { invoice_no: string }).invoice_no})`,
      );
    }

    if (!dto.periodStart?.trim() || !dto.periodEnd?.trim()) {
      throw new BadRequestException("Period start and end are required");
    }
    if (dto.periodStart > dto.periodEnd) {
      throw new BadRequestException("Period start must be on or before period end");
    }

    const linkedInvoices = (await this.db.queryAll(
      `SELECT id FROM invoices WHERE consolidated_invoice_id = $1`,
      [id],
    )) as { id: string }[];
    if (!linkedInvoices.length) {
      throw new BadRequestException("No trip invoices linked to this consolidated SOA");
    }

    const invoiceIds = linkedInvoices.map((r) => r.id);
    const workTicketIds = Array.isArray(source.work_ticket_ids)
      ? (source.work_ticket_ids as string[])
      : [];

    const { invoiceNo, refNo } = await this.nextNumbers();
    const newId = randomUUID();
    const invoiceDate = dto.invoiceDate?.trim() || new Date().toISOString().slice(0, 10);

    return this.db.withTransaction(async (client) => {
      const created = await client.query(
        `INSERT INTO consolidated_invoices (
          id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
          payment_terms_days, total_trips, net, vat, total, status, work_ticket_ids, plate,
          consolidation_type, filter_meta, partner_id, revised_from_id, client_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,$15,$16,$17,$18,NULL)
        RETURNING *`,
        [
          newId,
          invoiceNo,
          refNo,
          dto.periodStart,
          dto.periodEnd,
          invoiceDate,
          source.description ?? DESCRIPTION,
          source.payment_terms_days ?? 90,
          source.total_trips,
          source.net,
          source.vat,
          source.total,
          JSON.stringify(workTicketIds),
          source.plate ?? null,
          source.consolidation_type ?? "vehicle",
          JSON.stringify(source.filter_meta ?? {}),
          source.partner_id ?? null,
          id,
        ],
      );

      await client.query(
        `UPDATE invoices
         SET consolidated_invoice_id = $1, etims_status = 'consolidated', updated_at = NOW()
         WHERE consolidated_invoice_id = $2`,
        [newId, id],
      );

      if (workTicketIds.length) {
        await client.query(
          `UPDATE work_tickets
           SET consolidated_invoice_id = $1, status = 'invoiced', updated_at = NOW()
           WHERE id = ANY($2::uuid[])`,
          [newId, workTicketIds],
        );
      }

      await client.query(
        `UPDATE work_tickets
         SET consolidated_invoice_id = $1, status = 'invoiced', updated_at = NOW()
         WHERE consolidated_invoice_id = $2`,
        [newId, id],
      );

      if (status === "rejected") {
        await client.query(
          `UPDATE consolidated_invoices SET superseded_by_id = $1, updated_at = NOW() WHERE id = $2`,
          [newId, id],
        );
      } else {
        await client.query(`DELETE FROM consolidated_invoices WHERE id = $1`, [id]);
      }

      return created.rows[0];
    });
  }
}
