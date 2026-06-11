import { Injectable } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";

@Injectable()
export class ClientsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
  ) {}

  pendingInvoices() {
    return this.db.queryAll(
      `SELECT * FROM invoices WHERE status IN ('sent', 'pending') ORDER BY created_at DESC`,
    );
  }

  async approveInvoice(id: string) {
    const before = await this.db.queryOne(`SELECT * FROM invoices WHERE id = $1`, [id]);
    const updated = await this.db.queryOne(
      `UPDATE invoices SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
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
    const before = await this.db.queryOne(`SELECT * FROM invoices WHERE id = $1`, [id]);
    const updated = await this.db.queryOne(
      `UPDATE invoices SET status = 'rejected', client_note = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, clientNote ?? null],
    );
    if (before && updated) {
      await this.workflows.processInvoiceStatusChange(
        before as Parameters<WorkflowsService["processInvoiceStatusChange"]>[0],
        updated as Parameters<WorkflowsService["processInvoiceStatusChange"]>[1],
      );
    }
    return updated;
  }

  workTicketsPending() {
    return this.db.queryAll(
      `SELECT * FROM work_tickets WHERE status = 'sent' ORDER BY created_at DESC`,
    );
  }

  workTicketsReceived() {
    return this.db.queryAll(
      `SELECT * FROM work_tickets WHERE status IN ('sent', 'approved', 'rejected') ORDER BY created_at DESC`,
    );
  }

  notifications(unreadOnly = false) {
    return this.db.queryAll(
      `SELECT * FROM workflow_notifications WHERE audience = 'client' ${unreadOnly ? "AND read = FALSE" : ""} ORDER BY created_at DESC`,
    );
  }

  markNotificationRead(id: string) {
    return this.db.queryOne(
      `UPDATE workflow_notifications SET read = TRUE WHERE id = $1 RETURNING *`,
      [id],
    );
  }
}
