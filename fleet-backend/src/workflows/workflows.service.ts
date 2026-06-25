import { Injectable } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

type EmitParams = {
  audience: "admin" | "client";
  type: string;
  title: string;
  message: string;
  refId?: string;
  actor?: "admin" | "client" | "system";
};

type InvoiceRow = {
  id: string;
  invoice_no: string;
  plate: string;
  route: string;
  total: string | number;
  status: string;
  client_note?: string | null;
};

type WorkTicketRow = {
  id: string;
  serial_no: string;
  plate: string;
  driver_name: string;
  route: string;
  trip_date: string;
  total: string | number;
  status: string;
  client_note?: string | null;
};

@Injectable()
export class WorkflowsService {
  constructor(private readonly db: TenantDatabaseService) {}

  async emit(params: EmitParams) {
    return this.db.queryOne(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        params.audience,
        params.type,
        params.title,
        params.message,
        params.refId ?? null,
        params.actor ?? "system",
      ],
    );
  }

  async processInvoiceStatusChange(before: InvoiceRow | null, after: InvoiceRow) {
    if (!before || before.status === after.status) return;

    const total = Number(after.total);
    const fmt = total.toLocaleString("en-KE");

    if ((after.status === "sent" || after.status === "pending") && before.status !== after.status) {
      await this.emit({
        audience: "client",
        type: "invoice_sent",
        title: `Invoice ${after.invoice_no} awaiting approval`,
        message: `${after.plate} · ${after.route} · KES ${fmt}`,
        refId: after.id,
        actor: "admin",
      });
      await this.emit({
        audience: "admin",
        type: "invoice_sent",
        title: `Invoice ${after.invoice_no} sent to G4S`,
        message: "Delivered to client portal for approval.",
        refId: after.id,
        actor: "system",
      });
    }

    if (after.status === "approved" && before.status !== "approved") {
      await this.emit({
        audience: "admin",
        type: "invoice_approved",
        title: `G4S approved ${after.invoice_no}`,
        message: `${after.plate} · KES ${fmt}`,
        refId: after.id,
        actor: "client",
      });
    }

    if (after.status === "rejected" && before.status !== "rejected") {
      const note = after.client_note ? ` Note: ${after.client_note}` : "";
      await this.emit({
        audience: "admin",
        type: "invoice_rejected",
        title: `G4S returned ${after.invoice_no}`,
        message: `${after.plate} · ${after.route}${note}`,
        refId: after.id,
        actor: "client",
      });
    }

    if (after.status === "paid" && before.status !== "paid") {
      await this.emit({
        audience: "client",
        type: "invoice_paid",
        title: `Invoice ${after.invoice_no} marked paid`,
        message: `KES ${fmt} settled for ${after.plate}.`,
        refId: after.id,
        actor: "admin",
      });
    }
  }

  async processWorkTicketStatusChange(before: WorkTicketRow | null, after: WorkTicketRow) {
    if (!before || before.status === after.status) return;

    if (after.status === "sent" && before.status !== "sent") {
      await this.emit({
        audience: "client",
        type: "work_ticket_sent",
        title: `Work ticket ${after.serial_no} received`,
        message: `${after.plate} · ${after.driver_name} · ${after.route}`,
        refId: after.id,
        actor: "admin",
      });
      await this.emit({
        audience: "admin",
        type: "work_ticket_sent",
        title: `Work ticket ${after.serial_no} shared with G4S`,
        message: `${after.plate} · ${after.trip_date}`,
        refId: after.id,
        actor: "system",
      });
    }

    if (after.status === "approved" && before.status !== "approved") {
      await this.emit({
        audience: "admin",
        type: "work_ticket_approved",
        title: `G4S approved work ticket ${after.serial_no}`,
        message: `${after.plate} · KES ${Number(after.total).toLocaleString("en-KE")}`,
        refId: after.id,
        actor: "client",
      });
    }

    if (after.status === "rejected" && before.status !== "rejected") {
      const note = after.client_note ? ` Note: ${after.client_note}` : "";
      await this.emit({
        audience: "admin",
        type: "work_ticket_rejected",
        title: `G4S returned work ticket ${after.serial_no}`,
        message: `${after.plate} · ${after.route}${note}`,
        refId: after.id,
        actor: "client",
      });
    }
  }

  async emitSoaSent() {
    await this.emit({
      audience: "client",
      type: "soa_sent",
      title: "SOA sent for approval",
      message: "Statement of account pending G4S review.",
      actor: "admin",
    });
  }

  async emitSoaApproved() {
    await this.emit({
      audience: "admin",
      type: "soa_approved",
      title: "G4S approved SOA",
      message: "Proceed with settlement per contract.",
      actor: "client",
    });
  }

  async emitConsolidatedSent(invoiceNo: string, refNo: string, id: string) {
    await this.emit({
      audience: "client",
      type: "consolidated_sent",
      title: `Consolidated invoice ${invoiceNo} awaiting approval`,
      message: `SOA ${refNo} — review trip breakdown`,
      refId: id,
      actor: "admin",
    });
  }
}
