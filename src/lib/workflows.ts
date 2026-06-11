import { getStore, persistStore } from "./data-store";
import type { ConsolidatedInvoice, Invoice, WorkflowNotification, WorkTicket } from "./types";

function emit(n: Omit<WorkflowNotification, "id" | "createdAt" | "read">) {
  getStore().notifications.create({
    ...n,
    read: false,
    createdAt: new Date().toISOString(),
  });
  persistStore();
}

export function processInvoiceStatusChange(before: Invoice | undefined, after: Invoice) {
  if (!before || before.status === after.status) return;

  if ((after.status === "sent" || after.status === "pending") && before.status !== after.status) {
    emit({
      audience: "client",
      type: "invoice_sent",
      title: `Invoice ${after.invoiceNo} awaiting approval`,
      message: `${after.plate} · ${after.route} · KES ${after.total.toLocaleString()} sent for G4S review.`,
      refId: after.id,
      actor: "admin",
    });
    emit({
      audience: "admin",
      type: "invoice_sent",
      title: `Invoice ${after.invoiceNo} sent to G4S`,
      message: `Delivered to client portal for approval.`,
      refId: after.id,
      actor: "system",
    });
  }

  if (after.status === "approved" && before.status !== "approved") {
    emit({
      audience: "admin",
      type: "invoice_approved",
      title: `G4S approved ${after.invoiceNo}`,
      message: `${after.plate} · KES ${after.total.toLocaleString()} — ready for payment processing.`,
      refId: after.id,
      actor: "client",
    });
    emit({
      audience: "client",
      type: "invoice_approved",
      title: `You approved ${after.invoiceNo}`,
      message: `Fleet Admin has been notified. Payment will follow contract terms.`,
      refId: after.id,
      actor: "client",
    });
  }

  if (after.status === "rejected" && before.status !== "rejected") {
    const note = after.clientNote ? ` Note: ${after.clientNote}` : "";
    emit({
      audience: "admin",
      type: "invoice_rejected",
      title: `G4S returned ${after.invoiceNo}`,
      message: `${after.plate} · ${after.route} — sent back for revision.${note}`,
      refId: after.id,
      actor: "client",
    });
    emit({
      audience: "client",
      type: "invoice_rejected",
      title: `Invoice ${after.invoiceNo} sent back`,
      message: `Fleet Admin notified.${note}`,
      refId: after.id,
      actor: "client",
    });
  }

  if (after.status === "paid" && before.status !== "paid") {
    emit({
      audience: "client",
      type: "invoice_paid",
      title: `Invoice ${after.invoiceNo} marked paid`,
      message: `KES ${after.total.toLocaleString()} settled for ${after.plate}.`,
      refId: after.id,
      actor: "admin",
    });
    emit({
      audience: "admin",
      type: "invoice_paid",
      title: `Payment recorded — ${after.invoiceNo}`,
      message: `${after.plate} · KES ${after.total.toLocaleString()}.`,
      refId: after.id,
      actor: "admin",
    });
  }
}

export function processWorkTicketStatusChange(before: WorkTicket | undefined, after: WorkTicket) {
  if (!before || before.status === after.status) return;

  if (after.status === "sent" && before.status !== "sent") {
    emit({
      audience: "client",
      type: "work_ticket_sent",
      title: `Work ticket ${after.serialNo} received`,
      message: `${after.plate} · ${after.driverName} · ${after.route} — review in G4S portal.`,
      refId: after.id,
      actor: "admin",
    });
    emit({
      audience: "admin",
      type: "work_ticket_sent",
      title: `Work ticket ${after.serialNo} shared with G4S`,
      message: `Vehicle ${after.plate} · ${formatG4sTripDate(after.tripDate)}`,
      refId: after.id,
      actor: "system",
    });
  }

  if (after.status === "approved" && before.status !== "approved") {
    emit({
      audience: "admin",
      type: "work_ticket_approved",
      title: `G4S approved work ticket ${after.serialNo}`,
      message: `${after.plate} · KES ${after.total.toLocaleString()} — ready for invoicing.`,
      refId: after.id,
      actor: "client",
    });
    emit({
      audience: "client",
      type: "work_ticket_approved",
      title: `Work ticket ${after.serialNo} approved`,
      message: `Fleet Admin notified for billing.`,
      refId: after.id,
      actor: "client",
    });
  }
}

function formatG4sTripDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function processConsolidatedStatusChange(before: ConsolidatedInvoice, after: ConsolidatedInvoice) {
  if (before.status === after.status) return;
  const fmt = after.total.toLocaleString("en-KE");

  if (after.status === "pending_approval" && before.status !== "pending_approval") {
    emit({
      audience: "client",
      type: "consolidated_sent",
      title: `Consolidated invoice ${after.invoiceNo} awaiting approval`,
      message: `SOA ${after.refNo} · ${after.totalTrips} trips · KES ${fmt}`,
      refId: after.id,
      actor: "admin",
    });
    emit({
      audience: "admin",
      type: "consolidated_sent",
      title: `Consolidated billing sent to G4S`,
      message: `${after.invoiceNo} · SOA ${after.refNo} pending sign-off.`,
      refId: after.id,
      actor: "system",
    });
  }

  if (after.status === "approved" && before.status !== "approved") {
    const window =
      after.paymentWindowFrom && after.paymentWindowTo
        ? ` Payment window: ${after.paymentWindowFrom} – ${after.paymentWindowTo}.`
        : "";
    emit({
      audience: "admin",
      type: "consolidated_approved",
      title: `G4S approved ${after.invoiceNo}`,
      message: `SOA ${after.refNo} accepted · KES ${fmt}.${window}`,
      refId: after.id,
      actor: "client",
    });
  }

  if (after.status === "paid" && before.status !== "paid") {
    emit({
      audience: "client",
      type: "consolidated_paid",
      title: `Consolidated invoice ${after.invoiceNo} settled`,
      message: `KES ${fmt} received.`,
      refId: after.id,
      actor: "admin",
    });
  }
}

/** @deprecated Use consolidated invoice send API */
export function emitSoaSent() {
  emit({
    audience: "client",
    type: "soa_sent",
    title: "SOA sent for approval",
    message: "Statement of account pending G4S review.",
    actor: "admin",
  });
}

/** @deprecated Use consolidated invoice approve API */
export function emitSoaApproved() {
  emit({
    audience: "admin",
    type: "soa_approved",
    title: "G4S approved SOA",
    message: "Proceed with settlement per contract.",
    actor: "client",
  });
}

export function seedNotificationsFromInvoices(invoices: Invoice[]): WorkflowNotification[] {
  const items: WorkflowNotification[] = [];
  const now = Date.now();

  invoices.filter((i) => i.status === "sent" || i.status === "pending").slice(0, 8).forEach((inv, idx) => {
    items.push({
      id: `seed-notif-${idx}`,
      audience: "client",
      type: "invoice_sent",
      title: `Invoice ${inv.invoiceNo} awaiting approval`,
      message: `${inv.plate} · ${inv.route} · KES ${inv.total.toLocaleString()}`,
      refId: inv.id,
      read: false,
      createdAt: new Date(now - idx * 3600000).toISOString(),
      actor: "admin",
    });
  });

  invoices.filter((i) => i.status === "approved").slice(0, 3).forEach((inv, idx) => {
    items.push({
      id: `seed-notif-appr-${idx}`,
      audience: "admin",
      type: "invoice_approved",
      title: `G4S approved ${inv.invoiceNo}`,
      message: `${inv.plate} · KES ${inv.total.toLocaleString()}`,
      refId: inv.id,
      read: idx > 0,
      createdAt: new Date(now - (idx + 10) * 3600000).toISOString(),
      actor: "client",
    });
  });

  return items;
}
