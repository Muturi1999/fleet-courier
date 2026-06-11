import { getStore, persistStore } from "./data-store";
import {
  CONSOLIDATED_DESCRIPTION,
  CONSOLIDATED_PAYMENT_TERMS,
  calcPaymentWindow,
  generateConsolidatedInvoiceNo,
  generateSoaRef,
  isUnbilledTicket,
  sumTickets,
} from "./consolidation";
import { processConsolidatedStatusChange } from "./workflows";
import type { ConsolidatedInvoice, WorkTicket } from "./types";

export function listUnbilledTickets(from?: string, to?: string): WorkTicket[] {
  return getStore()
    .workTickets.all()
    .filter((t) => {
      if (!isUnbilledTicket(t)) return false;
      if (from && t.tripDate < from) return false;
      if (to && t.tripDate > to) return false;
      return true;
    })
    .sort((a, b) => a.tripDate.localeCompare(b.tripDate));
}

export function createConsolidatedInvoice(input: {
  workTicketIds: string[];
  periodStart: string;
  periodEnd: string;
  invoiceDate?: string;
}): ConsolidatedInvoice {
  const store = getStore();
  const tickets = input.workTicketIds
    .map((id) => store.workTickets.get(id))
    .filter((t): t is WorkTicket => !!t && isUnbilledTicket(t));

  if (!tickets.length) {
    throw new Error("No eligible approved work tickets selected");
  }

  const existing = store.consolidatedInvoices.all();
  const totals = sumTickets(tickets);
  const invoice: ConsolidatedInvoice = store.consolidatedInvoices.create({
    invoiceNo: generateConsolidatedInvoiceNo(existing, input.periodEnd),
    refNo: generateSoaRef(existing, input.periodEnd),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    invoiceDate: input.invoiceDate ?? new Date().toISOString().slice(0, 10),
    description: CONSOLIDATED_DESCRIPTION,
    paymentTermsDays: CONSOLIDATED_PAYMENT_TERMS.minDays,
    totalTrips: totals.totalTrips,
    net: totals.net,
    vat: totals.vat,
    total: totals.total,
    status: "draft",
    workTicketIds: tickets.map((t) => t.id),
  });

  for (const t of tickets) {
    store.workTickets.update(t.id, {
      status: "invoiced",
      consolidatedInvoiceId: invoice.id,
    });
  }

  persistStore();
  return invoice;
}

export function updateConsolidatedInvoice(
  id: string,
  patch: Partial<ConsolidatedInvoice>,
): ConsolidatedInvoice | null {
  const store = getStore();
  const before = store.consolidatedInvoices.get(id);
  const updated = store.consolidatedInvoices.update(id, patch);
  if (before && updated) {
    processConsolidatedStatusChange(before, updated);
  }
  persistStore();
  return updated;
}

export function sendConsolidatedToClient(id: string) {
  return updateConsolidatedInvoice(id, { status: "pending_approval" });
}

export function approveConsolidated(id: string, clientNote?: string) {
  const approvedAt = new Date().toISOString();
  const window = calcPaymentWindow(approvedAt);
  return updateConsolidatedInvoice(id, {
    status: "approved",
    clientNote,
    approvedAt,
    paymentWindowFrom: window.from,
    paymentWindowTo: window.to,
  });
}

export function markConsolidatedPaid(id: string) {
  return updateConsolidatedInvoice(id, {
    status: "paid",
    paidAt: new Date().toISOString(),
  });
}

export function getConsolidatedWithTickets(id: string) {
  const store = getStore();
  const invoice = store.consolidatedInvoices.get(id);
  if (!invoice) return null;
  const tickets = invoice.workTicketIds
    .map((tid) => store.workTickets.get(tid))
    .filter((t): t is WorkTicket => !!t);
  return { invoice, tickets };
}
