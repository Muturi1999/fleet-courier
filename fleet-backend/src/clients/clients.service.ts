import { Injectable, NotFoundException } from "@nestjs/common";
import {
  addClientTabClause,
  addDateClause,
  addDestinationClause,
  addSearchClause,
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

    i = addSearchClause(clauses, params, i, ["plate", "invoice_no", "route"], query.search);
    i = addDestinationClause(clauses, params, i, "route", query.destination);
    i = addDateClause(clauses, params, i, "service_date", query.date);
    i = addClientTabClause(clauses, params, i, query.tab);

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

    i = addSearchClause(clauses, params, i, ["serial_no", "plate", "driver_name", "route"], query.search);
    i = addDateClause(clauses, params, i, "trip_date", query.date);
    if (query.status?.trim()) {
      clauses.push(`status = $${i++}`);
      params.push(query.status);
    }

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
}
