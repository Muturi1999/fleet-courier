import type { Invoice } from "./types";

/** Road Network Transporters — supplier on every invoice */
export const SUPPLIER = {
  name: "Road network transporters",
  address: "P.O. Box 4622-00200, Nairobi.",
  phone: "Tel: 020 2011330",
  vatNo: "0161681P",
  pin: "P051470271Y",
} as const;

export const CLIENT = {
  name: "G4S COURIER",
  legalName: "G4S Courier Services Kenya Ltd",
  address: "G4S House, Waiyaki Way",
  city: "Nairobi, Kenya",
  pin: "P051987654G",
  contact: "Accounts Payable",
  email: "accounts@g4s.co.ke",
  contractRef: "G4S-RNT-2026-001",
} as const;

export const INVOICE_DEFAULTS = {
  paymentTerms: "Accounts are due on demand",
  currency: "KES",
  vatRate: 16,
  etimsNote: "This invoice is generated in compliance with KRA eTIMS requirements.",
  /** First number in the series when no prior invoices exist */
  seriesStart: 17206,
} as const;

/** Next sequential invoice number (stored as plain digits, e.g. "17207") */
export function generateNextInvoiceNumber(existing: { invoiceNo: string }[]): string {
  let max = INVOICE_DEFAULTS.seriesStart - 1;
  for (const inv of existing) {
    const n = parseInt(inv.invoiceNo.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function formatInvoiceNumber(invoiceNo: string): string {
  const digits = invoiceNo.replace(/\D/g, "");
  return digits || invoiceNo;
}

/** DD.MM.YY — matches handwritten Road Network invoices */
export function formatRntDate(isoOrDate?: string): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export function invoiceIssueDate(invoice: Pick<Invoice, "serviceDate" | "invoiceNo">): string {
  if (invoice.serviceDate) return invoice.serviceDate;
  const seed = invoice.invoiceNo.replace(/\D/g, "");
  const day = Math.min(28, Math.max(1, (parseInt(seed.slice(-2), 10) || 15) % 28 + 1));
  return `2026-03-${String(day).padStart(2, "0")}`;
}

export function unitRate(net: number, days: number): number {
  return days > 0 ? Math.round(net / days) : net;
}

export function buildParticulars(invoice: Pick<Invoice, "route" | "period" | "cls">): string {
  const route = invoice.route.toUpperCase();
  if (invoice.period?.trim()) {
    const period = invoice.period.toUpperCase();
    return `TRUCK HIRE FOR THE MONTH OF ${period} FOR ${route}.`;
  }
  return `TRUCK HIRE — ${route} (${invoice.cls}).`;
}

export function splitAmountKshsCts(amount: number): { kshs: string; cts: string } {
  const kshs = Math.floor(amount);
  const cents = Math.round((amount - kshs) * 100);
  return {
    kshs: kshs.toLocaleString("en-KE"),
    cts: cents > 0 ? String(cents).padStart(2, "0") : "",
  };
}
