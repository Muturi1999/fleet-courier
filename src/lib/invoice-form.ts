import {
  currentBillingPeriodLabel,
  currentMonthRangeEAT,
  dateKey,
  formatPeriodLabel,
  todayEAT,
} from "./dates";
import type { Invoice, InvoiceStatus } from "./types";
import { INVOICE_DEFAULTS } from "./invoice-meta";

/** Build a clean POST body — only fields the backend accepts */
export function invoiceCreatePayload(form: Omit<Invoice, "id">, status: InvoiceStatus) {
  const periodStart = form.periodStart ?? form.serviceDate ?? todayEAT();
  const periodEnd = form.periodEnd ?? periodStart;
  const period = form.period?.trim() || formatPeriodLabel(periodStart, periodEnd);

  return {
    invoiceNo: String(form.invoiceNo).trim(),
    plate: form.plate.trim().toUpperCase(),
    cls: form.cls,
    route: form.route.trim(),
    days: Math.max(1, Math.round(Number(form.days) || 1)),
    net: Number(form.net),
    vat: Number(form.vat),
    total: Number(form.total),
    status,
    serviceDate: dateKey(form.serviceDate ?? todayEAT()),
    period,
    deliveryNoteNo: form.deliveryNoteNo?.trim() || undefined,
    clientNote: form.clientNote?.trim() || undefined,
  };
}

export function emptyInvoiceForm(existing: { invoiceNo: string }[]): Omit<Invoice, "id"> {
  const range = currentMonthRangeEAT();
  return {
    invoiceNo: generateNextInvoiceNumber(existing),
    plate: "",
    cls: "7T",
    route: INVOICE_DEFAULTS.defaultParticulars,
    days: 1,
    net: 8500,
    vat: 1360,
    total: 9860,
    status: "draft",
    serviceDate: todayEAT(),
    periodStart: range.from,
    periodEnd: range.to,
    period: currentBillingPeriodLabel(),
    deliveryNoteNo: "",
  };
}

export function syncBillingPeriod(
  form: Omit<Invoice, "id">,
  patch: Partial<Pick<Invoice, "periodStart" | "periodEnd">>,
): Pick<Invoice, "periodStart" | "periodEnd" | "period"> {
  const periodStart = patch.periodStart ?? form.periodStart ?? form.serviceDate ?? todayEAT();
  const periodEnd = patch.periodEnd ?? form.periodEnd ?? periodStart;
  return {
    periodStart,
    periodEnd,
    period: formatPeriodLabel(periodStart, periodEnd),
  };
}

export function generateNextInvoiceNumber(existing: { invoiceNo: string }[]): string {
  let max = INVOICE_DEFAULTS.seriesStart - 1;
  for (const inv of existing) {
    if (inv.invoiceNo.startsWith("WT-")) continue;
    const n = parseInt(inv.invoiceNo.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}
