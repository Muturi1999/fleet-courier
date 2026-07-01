import { Injectable, NotFoundException } from "@nestjs/common";
import {
  addClientTabClause,
  addClsClause,
  addDateClause,
  addDestinationClause,
  addMonthClause,
  addPeriodClause,
  addPlateClause,
  addSearchClause,
  addStatusClause,
  resolvePageLimit,
  wantsFullList,
} from "../common/database/list-query.helper";
import { queryPaginated } from "../common/database/pagination.helper";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { PartnerScopeService } from "../common/services/partner-scope.service";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";

@Injectable()
export class ClientsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    private readonly partnerScope: PartnerScopeService,
  ) {}

  listInvoices(query: ListQueryDto) {
    const partnerId = this.partnerScope.requirePartnerId();
    const clauses = [
      `partner_id = $1::uuid`,
      `consolidated_invoice_id IS NULL`,
    ];
    const params: unknown[] = [partnerId];
    let i = 2;

    i = addSearchClause(clauses, params, i, ["plate", "invoice_no", "route", "cls", "period"], query.search);
    i = addDestinationClause(clauses, params, i, "route", query.destination);
    i = addDateClause(clauses, params, i, "service_date", query.date);
    i = addPlateClause(clauses, params, i, "plate", query.plate);
    i = addClsClause(clauses, params, i, "cls", query.cls);
    i = addMonthClause(clauses, params, i, "service_date", query.month);
    i = addPeriodClause(clauses, params, i, "period", query.period);
    i = addClientTabClause(clauses, params, i, query.tab);
    i = addStatusClause(clauses, params, i, query.status);

    const where = `WHERE ${clauses.join(" AND ")}`;

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM invoices ${where} ORDER BY created_at DESC`, params);
    }

    const { page, limit } = resolvePageLimit(query);
    return queryPaginated(this.db, {
      table: "invoices",
      where,
      params,
      page,
      limit,
      orderBy: "created_at DESC",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  async findInvoice(id: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const row = await this.db.queryOne(
      `SELECT * FROM invoices WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!row) throw new NotFoundException("Invoice not found");
    return row;
  }

  pendingInvoices() {
    const partnerId = this.partnerScope.requirePartnerId();
    return this.db.queryAll(
      `SELECT * FROM invoices WHERE status IN ('sent', 'pending') AND partner_id = $1::uuid AND consolidated_invoice_id IS NULL ORDER BY created_at DESC`,
      [partnerId],
    );
  }

  async approveInvoice(id: string, clientNote?: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const before = await this.db.queryOne(
      `SELECT * FROM invoices WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!before) return null;
    const updated = await this.db.queryOne(
      `UPDATE invoices SET status = 'approved', client_note = COALESCE($3, client_note), updated_at = NOW() WHERE id = $1 AND partner_id = $2::uuid RETURNING *`,
      [id, partnerId, clientNote ?? null],
    );
    if (before && updated) {
      await this.workflows.processInvoiceStatusChange(
        before as Parameters<WorkflowsService["processInvoiceStatusChange"]>[0],
        updated as Parameters<WorkflowsService["processInvoiceStatusChange"]>[1],
      );
    }
    return updated;
  }

  async rejectInvoice(id: string, clientNote?: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const before = await this.db.queryOne(
      `SELECT * FROM invoices WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!before) return null;
    const updated = await this.db.queryOne(
      `UPDATE invoices SET status = 'rejected', client_note = $3, updated_at = NOW() WHERE id = $1 AND partner_id = $2::uuid RETURNING *`,
      [id, partnerId, clientNote ?? null],
    );
    if (before && updated) {
      await this.workflows.processInvoiceStatusChange(
        before as Parameters<WorkflowsService["processInvoiceStatusChange"]>[0],
        updated as Parameters<WorkflowsService["processInvoiceStatusChange"]>[1],
      );
    }
    return updated;
  }

  listWorkTickets(query: ListQueryDto) {
    const partnerId = this.partnerScope.requirePartnerId();
    const clauses = [`partner_id = $1::uuid`, `status IN ('sent', 'approved', 'rejected')`];
    const params: unknown[] = [partnerId];
    let i = 2;

    i = addSearchClause(clauses, params, i, ["serial_no", "plate", "driver_name", "route", "make"], query.search);
    i = addDestinationClause(clauses, params, i, "route", query.destination);
    i = addDateClause(clauses, params, i, "trip_date", query.date);
    i = addPlateClause(clauses, params, i, "plate", query.plate);
    i = addMonthClause(clauses, params, i, "trip_date", query.month);
    i = addStatusClause(clauses, params, i, query.status);

    const where = `WHERE ${clauses.join(" AND ")}`;

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM work_tickets ${where} ORDER BY created_at DESC`, params);
    }

    const { page, limit } = resolvePageLimit(query);
    return queryPaginated(this.db, {
      table: "work_tickets",
      where,
      params,
      page,
      limit,
      orderBy: "created_at DESC",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  async findWorkTicket(id: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const row = await this.db.queryOne(
      `SELECT * FROM work_tickets WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!row) throw new NotFoundException("Work ticket not found");
    return row;
  }

  workTicketsPending() {
    const partnerId = this.partnerScope.requirePartnerId();
    return this.db.queryAll(
      `SELECT * FROM work_tickets WHERE status = 'sent' AND partner_id = $1::uuid ORDER BY created_at DESC`,
      [partnerId],
    );
  }

  workTicketsReceived() {
    const partnerId = this.partnerScope.requirePartnerId();
    return this.db.queryAll(
      `SELECT * FROM work_tickets WHERE status IN ('sent', 'approved', 'rejected') AND partner_id = $1::uuid ORDER BY created_at DESC`,
      [partnerId],
    );
  }

  async approveWorkTicket(id: string, clientNote?: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const before = await this.db.queryOne(
      `SELECT * FROM work_tickets WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!before) return null;
    const updated = await this.db.queryOne(
      `UPDATE work_tickets SET status = 'approved', client_note = COALESCE($3, client_note), updated_at = NOW() WHERE id = $1 AND partner_id = $2::uuid RETURNING *`,
      [id, partnerId, clientNote ?? null],
    );
    if (before && updated) {
      await this.workflows.processWorkTicketStatusChange(
        before as Parameters<WorkflowsService["processWorkTicketStatusChange"]>[0],
        updated as Parameters<WorkflowsService["processWorkTicketStatusChange"]>[1],
      );
    }
    return updated;
  }

  async rejectWorkTicket(id: string, clientNote?: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const before = await this.db.queryOne(
      `SELECT * FROM work_tickets WHERE id = $1 AND partner_id = $2::uuid`,
      [id, partnerId],
    );
    if (!before) return null;
    const updated = await this.db.queryOne(
      `UPDATE work_tickets SET status = 'rejected', client_note = $3, updated_at = NOW() WHERE id = $1 AND partner_id = $2::uuid RETURNING *`,
      [id, partnerId, clientNote ?? null],
    );
    if (before && updated) {
      await this.workflows.processWorkTicketStatusChange(
        before as Parameters<WorkflowsService["processWorkTicketStatusChange"]>[0],
        updated as Parameters<WorkflowsService["processWorkTicketStatusChange"]>[1],
      );
    }
    return updated;
  }

  notifications(unreadOnly = false) {
    const partnerId = this.partnerScope.requirePartnerId();
    return this.db.queryAll(
      `SELECT * FROM workflow_notifications WHERE audience = 'client' AND (partner_id = $1::uuid OR partner_id IS NULL) ${unreadOnly ? "AND read = FALSE" : ""} ORDER BY created_at DESC`,
      [partnerId],
    );
  }

  markNotificationRead(id: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    return this.db.queryOne(
      `UPDATE workflow_notifications SET read = TRUE WHERE id = $1 AND (partner_id = $2::uuid OR partner_id IS NULL) RETURNING *`,
      [id, partnerId],
    );
  }

  private currentMonthYm(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value ?? "2026";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    return `${year}-${month}`;
  }

  private monthLabel(ym: string): string {
    const [year, month] = ym.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
  }

  /** Prefer current month; fall back to the latest month with open or approved billing activity. */
  private async resolveDashboardMonth(partnerId: string, requested?: string): Promise<string> {
    const current = this.currentMonthYm();
    if (requested?.trim() && /^\d{4}-\d{2}$/.test(requested.trim())) {
      return requested.trim();
    }

    const hasPipeline = async (ym: string) => {
      const row = (await this.db.queryOne(
        `WITH soa AS (
           SELECT status, total_trips, total
           FROM consolidated_invoices
           WHERE partner_id = $1::uuid
             AND superseded_by_id IS NULL
             AND status NOT IN ('draft')
             AND to_char(period_start, 'YYYY-MM') = $2
         ),
         standalone AS (
           SELECT status, total
           FROM invoices
           WHERE partner_id = $1::uuid
             AND consolidated_invoice_id IS NULL
             AND to_char(COALESCE(service_date, created_at::date), 'YYYY-MM') = $2
         )
         SELECT
           (SELECT COUNT(*)::int FROM standalone WHERE status IN ('sent', 'pending'))
             + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status = 'pending_approval') AS awaiting,
           (SELECT COUNT(*)::int FROM standalone WHERE status IN ('approved', 'paid'))
             + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status IN ('approved', 'paid')) AS approved,
           (SELECT COALESCE(SUM(total), 0) FROM standalone WHERE status IN ('approved', 'paid'))
             + (SELECT COALESCE(SUM(total), 0) FROM soa WHERE status IN ('approved', 'paid')) AS total_value`,
        [partnerId, ym],
      )) as { awaiting?: number; approved?: number; total_value?: number };
      return (row?.awaiting ?? 0) > 0 || (row?.approved ?? 0) > 0 || Number(row?.total_value ?? 0) > 0;
    };

    if (await hasPipeline(current)) return current;

    const latest = (await this.db.queryOne(
      `SELECT ym FROM (
         SELECT to_char(period_start, 'YYYY-MM') AS ym, MAX(updated_at) AS ts
         FROM consolidated_invoices
         WHERE partner_id = $1::uuid
           AND superseded_by_id IS NULL
           AND status IN ('pending_approval', 'approved', 'paid')
         GROUP BY 1
         UNION ALL
         SELECT to_char(COALESCE(service_date, created_at::date), 'YYYY-MM'), MAX(updated_at)
         FROM invoices
         WHERE partner_id = $1::uuid
           AND consolidated_invoice_id IS NULL
           AND status IN ('sent', 'pending', 'approved', 'paid')
         GROUP BY 1
       ) u
       ORDER BY ts DESC
       LIMIT 1`,
      [partnerId],
    )) as { ym?: string } | null;

    return latest?.ym ?? current;
  }

  async dashboard(month?: string) {
    const partnerId = this.partnerScope.requirePartnerId();
    const ym = await this.resolveDashboardMonth(partnerId, month);

    const invoiceStats = (await this.db.queryOne(
      `WITH soa AS (
         SELECT status, total_trips, total, net, vat
         FROM consolidated_invoices
         WHERE partner_id = $1::uuid
           AND superseded_by_id IS NULL
           AND status NOT IN ('draft')
           AND to_char(period_start, 'YYYY-MM') = $2
       ),
       standalone AS (
         SELECT status, total, net, vat
         FROM invoices
         WHERE partner_id = $1::uuid
           AND consolidated_invoice_id IS NULL
           AND to_char(COALESCE(service_date, created_at::date), 'YYYY-MM') = $2
       )
       SELECT
         (SELECT COUNT(*)::int FROM standalone WHERE status IN ('sent', 'pending'))
           + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status = 'pending_approval') AS awaiting,
         (SELECT COUNT(*)::int FROM standalone WHERE status = 'approved')
           + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status = 'approved') AS approved,
         (SELECT COUNT(*)::int FROM standalone WHERE status = 'rejected')
           + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status = 'rejected') AS rejected,
         (SELECT COUNT(*)::int FROM standalone WHERE status = 'paid')
           + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa WHERE status = 'paid') AS paid,
         (SELECT COALESCE(SUM(total), 0) FROM standalone WHERE status IN ('approved', 'paid'))
           + (SELECT COALESCE(SUM(total), 0) FROM soa WHERE status IN ('approved', 'paid')) AS total_value,
         (SELECT COALESCE(SUM(net), 0) FROM standalone WHERE status IN ('approved', 'paid'))
           + (SELECT COALESCE(SUM(net), 0) FROM soa WHERE status IN ('approved', 'paid')) AS net,
         (SELECT COALESCE(SUM(vat), 0) FROM standalone WHERE status IN ('approved', 'paid'))
           + (SELECT COALESCE(SUM(vat), 0) FROM soa WHERE status IN ('approved', 'paid')) AS vat,
         (SELECT COUNT(*)::int FROM standalone)
           + (SELECT COALESCE(SUM(total_trips), 0)::int FROM soa) AS total_count`,
      [partnerId, ym],
    )) as Record<string, number>;

    const ticketScope = `partner_id = $1::uuid AND status IN ('sent', 'approved', 'rejected')
      AND to_char(COALESCE(trip_date, created_at::date), 'YYYY-MM') = $2`;

    const ticketStats = (await this.db.queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'sent')::int AS awaiting,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COALESCE(SUM(total) FILTER (WHERE status = 'approved'), 0)::float AS total_value,
        COUNT(*)::int AS total_count
      FROM work_tickets WHERE ${ticketScope}`,
      [partnerId, ym],
    )) as Record<string, number>;

    const dailyTrend = await this.db.queryAll(
      `SELECT
        to_char(day::date, 'YYYY-MM-DD') AS day,
        to_char(day::date, 'DD Mon') AS label,
        COALESCE(inv.received, 0)::int AS invoices_received,
        COALESCE(inv.approved, 0)::int AS invoices_approved,
        COALESCE(inv.approved_total, 0)::float AS approved_total,
        COALESCE(wt.approved, 0)::int AS tickets_approved
      FROM generate_series(
        to_date($2, 'YYYY-MM'),
        (to_date($2, 'YYYY-MM') + interval '1 month' - interval '1 day')::date,
        interval '1 day'
      ) AS day
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS received,
          COUNT(*) FILTER (WHERE effective_status IN ('approved', 'paid'))::int AS approved,
          COALESCE(SUM(total) FILTER (WHERE effective_status IN ('approved', 'paid')), 0)::float AS approved_total
        FROM (
          SELECT i.total,
            CASE
              WHEN ci.id IS NOT NULL AND ci.superseded_by_id IS NULL AND ci.status NOT IN ('draft') THEN
                CASE ci.status
                  WHEN 'approved' THEN 'approved'
                  WHEN 'paid' THEN 'paid'
                  WHEN 'pending_approval' THEN 'sent'
                  WHEN 'rejected' THEN 'rejected'
                  ELSE i.status
                END
              ELSE i.status
            END AS effective_status
          FROM invoices i
          LEFT JOIN consolidated_invoices ci ON ci.id = i.consolidated_invoice_id
          WHERE i.partner_id = $1::uuid
            AND COALESCE(i.service_date, i.created_at::date) = day::date
        ) scoped
      ) inv ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
        FROM work_tickets
        WHERE partner_id = $1::uuid
          AND status IN ('sent', 'approved', 'rejected')
          AND COALESCE(trip_date, created_at::date) = day::date
      ) wt ON TRUE
      ORDER BY day`,
      [partnerId, ym],
    );

    const byClass = await this.db.queryAll(
      `SELECT i.cls, COUNT(*)::int AS count, COALESCE(SUM(i.total), 0)::float AS total
       FROM invoices i
       LEFT JOIN consolidated_invoices ci ON ci.id = i.consolidated_invoice_id
       WHERE i.partner_id = $1::uuid
         AND to_char(COALESCE(i.service_date, i.created_at::date), 'YYYY-MM') = $2
         AND (
           i.consolidated_invoice_id IS NULL
           OR (ci.superseded_by_id IS NULL AND ci.status NOT IN ('draft'))
         )
         AND (
           (i.consolidated_invoice_id IS NULL AND i.status IN ('sent', 'pending', 'approved', 'paid', 'rejected'))
           OR ci.status IN ('pending_approval', 'approved', 'paid', 'rejected')
         )
       GROUP BY i.cls
       ORDER BY total DESC`,
      [partnerId, ym],
    );

    const recentActivity = await this.db.queryAll(
      `SELECT kind, id, ref_no, plate, route, status, event_date, updated_at
       FROM (
         SELECT 'invoice' AS kind, id, invoice_no AS ref_no, plate, route, status,
           COALESCE(service_date, created_at::date) AS event_date, updated_at
         FROM invoices
         WHERE partner_id = $1::uuid
           AND consolidated_invoice_id IS NULL
           AND to_char(COALESCE(service_date, created_at::date), 'YYYY-MM') = $2
         UNION ALL
         SELECT 'consolidated', id, invoice_no, COALESCE(plate, '—'), COALESCE(description, 'Consolidated SOA'), status,
           period_start, updated_at
         FROM consolidated_invoices
         WHERE partner_id = $1::uuid
           AND superseded_by_id IS NULL
           AND status NOT IN ('draft')
           AND to_char(period_start, 'YYYY-MM') = $2
         UNION ALL
         SELECT 'work_ticket', id, serial_no, plate, route, status,
           COALESCE(trip_date, created_at::date), updated_at
         FROM work_tickets
         WHERE partner_id = $1::uuid
           AND status IN ('sent', 'approved', 'rejected')
           AND to_char(COALESCE(trip_date, created_at::date), 'YYYY-MM') = $2
       ) u
       ORDER BY updated_at DESC
       LIMIT 8`,
      [partnerId, ym],
    );

    return {
      month: ym,
      monthLabel: this.monthLabel(ym),
      updatedAt: new Date().toISOString(),
      invoices: {
        awaiting: invoiceStats.awaiting ?? 0,
        approved: invoiceStats.approved ?? 0,
        rejected: invoiceStats.rejected ?? 0,
        paid: invoiceStats.paid ?? 0,
        totalCount: invoiceStats.total_count ?? 0,
        totalValue: invoiceStats.total_value ?? 0,
        net: invoiceStats.net ?? 0,
        vat: invoiceStats.vat ?? 0,
      },
      workTickets: {
        awaiting: ticketStats.awaiting ?? 0,
        approved: ticketStats.approved ?? 0,
        rejected: ticketStats.rejected ?? 0,
        totalCount: ticketStats.total_count ?? 0,
        totalValue: ticketStats.total_value ?? 0,
      },
      dailyTrend,
      byClass,
      recentActivity,
    };
  }
}
