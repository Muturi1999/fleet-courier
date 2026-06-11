import { CLIENT, INVOICE_DEFAULTS, SUPPLIER } from "./invoice-meta";
import type { ConsolidatedInvoice, WorkTicket } from "./types";

export const CONSOLIDATED_PAYMENT_TERMS = {
  label: "90 - 100 Days Net",
  minDays: 90,
  maxDays: 100,
} as const;

export const CONSOLIDATED_DESCRIPTION =
  "Provision of Lease Vehicles & Courier Services";

export function formatDocDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = d.toLocaleString("en-GB", { month: "short" });
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function formatPeriodRange(start: string, end: string): string {
  return `${formatDocDate(start)} to ${formatDocDate(end)}`;
}

export function generateConsolidatedInvoiceNo(
  existing: { invoiceNo: string }[],
  periodEnd: string,
): string {
  const d = new Date(periodEnd);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const base = `INV-${year}-${month}-G4S`;
  const sameMonth = existing.filter((c) => c.invoiceNo.startsWith(base)).length;
  return sameMonth ? `${base}-${sameMonth + 1}` : base;
}

export function generateSoaRef(existing: { refNo: string }[], periodEnd: string): string {
  const d = new Date(periodEnd);
  const seq = existing.length + 1;
  return `101/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

export function calcPaymentWindow(approvedAt: string): { from: string; to: string } {
  const base = new Date(approvedAt);
  const from = new Date(base);
  from.setDate(from.getDate() + CONSOLIDATED_PAYMENT_TERMS.minDays);
  const to = new Date(base);
  to.setDate(to.getDate() + CONSOLIDATED_PAYMENT_TERMS.maxDays);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function sumTickets(tickets: WorkTicket[]) {
  const net = tickets.reduce((s, t) => s + t.net, 0);
  const vat = tickets.reduce((s, t) => s + t.vat, 0);
  const total = tickets.reduce((s, t) => s + t.total, 0);
  return { net, vat, total, totalTrips: tickets.length };
}

export function buildSoaLines(tickets: WorkTicket[]) {
  return [...tickets]
    .sort((a, b) => a.tripDate.localeCompare(b.tripDate))
    .map((t) => ({
      workTicketId: t.id,
      tripDate: t.tripDate,
      serialNo: t.serialNo,
      plate: t.plate,
      route: t.route,
      driverName: t.driverName,
      gatePassRef: t.gatePassRef ?? "—",
      amount: t.net,
    }));
}

export function isUnbilledTicket(t: WorkTicket): boolean {
  return t.status === "approved" && !t.consolidatedInvoiceId;
}

export const BILLING_PARTIES = {
  supplier: SUPPLIER,
  client: CLIENT,
  vatRate: INVOICE_DEFAULTS.vatRate,
} as const;

/** Days until payment window ends (negative = overdue). Null if window not set. */
export function daysUntilPaymentDue(inv: ConsolidatedInvoice): number | null {
  if (!inv.paymentWindowTo || inv.status === "paid") return null;
  const end = new Date(inv.paymentWindowTo);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}

export function describePaymentCountdown(inv: ConsolidatedInvoice): string | null {
  if (inv.status === "paid") return "Paid";
  if (!inv.paymentWindowFrom || !inv.paymentWindowTo) {
    return inv.status === "approved" ? "Payment window pending" : null;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (today < inv.paymentWindowFrom) {
    const days = Math.ceil(
      (new Date(inv.paymentWindowFrom).getTime() - Date.now()) / 86_400_000,
    );
    return `Window opens in ${days} day${days === 1 ? "" : "s"}`;
  }
  const remaining = daysUntilPaymentDue(inv);
  if (remaining === null) return null;
  if (remaining >= 0) {
    return `${remaining} day${remaining === 1 ? "" : "s"} until due`;
  }
  return `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} overdue`;
}

export function consolidationSummary(inv: ConsolidatedInvoice) {
  const window =
    inv.paymentWindowFrom && inv.paymentWindowTo
      ? `${formatDocDate(inv.paymentWindowFrom)} to ${formatDocDate(inv.paymentWindowTo)}`
      : "Calculated on G4S approval";
  return {
    invoiceNo: inv.invoiceNo,
    refNo: inv.refNo,
    period: formatPeriodRange(inv.periodStart, inv.periodEnd),
    total: inv.total,
    status: inv.status,
    paymentWindow: window,
  };
}
