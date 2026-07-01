import type { DigitaxSaleWithItemsPayload } from "./digitax.types";

type ConsolidatedInvoice = {
  id: string;
  invoice_no: string;
  description: string;
  period_start: string | Date;
  period_end: string | Date;
  invoice_date?: string | Date | null;
  total_trips: number;
  net: string | number;
  vat: string | number;
  total: string | number;
};

type BillingClient = {
  name?: string;
  legalName?: string;
  pin?: string;
};

export type ConsolidatedEtimsDisplayLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  vatBand: string;
};

function formatSaleDate(value?: string | Date | null): string {
  if (value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function formatPeriod(start: string | Date, end: string | Date): string {
  const s = start instanceof Date ? start.toISOString().slice(0, 10) : String(start).slice(0, 10);
  const e = end instanceof Date ? end.toISOString().slice(0, 10) : String(end).slice(0, 10);
  return `${s} to ${e}`;
}

/** Option B: qty = trips, unit = average trip pay (ex VAT), line amount = SOA net. */
export function resolveConsolidatedEtimsLine(invoice: ConsolidatedInvoice): {
  quantity: number;
  unitPrice: number;
  lineNet: number;
} {
  const trips = Math.max(1, Number(invoice.total_trips) || 1);
  const net = Number(invoice.net);
  const unitPrice = Math.round((net / trips) * 100) / 100;
  const lineNet = Math.round(unitPrice * trips * 100) / 100;
  return { quantity: trips, unitPrice, lineNet: lineNet || net };
}

/**
 * Digitax/KRA payload for a consolidated SOA.
 * Line is ex-VAT (net); VAT and grand total come from SOA totals below the line.
 */
export function buildDigitaxConsolidatedSalePayload(
  invoice: ConsolidatedInvoice,
  client: BillingClient,
  itemClassCode: string,
): DigitaxSaleWithItemsPayload {
  const { quantity, unitPrice, lineNet } = resolveConsolidatedEtimsLine(invoice);
  const saleDate = formatSaleDate(invoice.invoice_date);
  const customerName = (client.legalName || client.name || "Customer").trim();
  const customerTin = (client.pin || "").trim().toUpperCase();
  const period = formatPeriod(invoice.period_start, invoice.period_end);
  const trips = Math.max(1, Number(invoice.total_trips) || 1);
  const details = [invoice.description.trim(), period, `${trips} trip(s)`].filter(Boolean).join(" · ");
  const itemName = `${invoice.description} — ${period}`.slice(0, 200);

  return {
    sale_date: saleDate,
    customer_name: customerName,
    customer_tin: customerTin,
    trader_invoice_number: invoice.invoice_no.trim(),
    payment_type_code: "02",
    invoice_status_code: "02",
    invoice_details: details.slice(0, 255),
    items: [
      {
        id: invoice.id,
        item_name: itemName,
        item_class_code: itemClassCode,
        item_bar_code: invoice.invoice_no.trim().slice(0, 40),
        item_tax_type_code: "B",
        quantity,
        unit_price: unitPrice,
        total_amount: lineNet,
        is_stockable: false,
      },
    ],
  };
}

/** Preview/print line — matches Digitax payload (trips × avg trip pay ex VAT = line net). */
export function consolidatedEtimsDisplayLine(item: {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  item_tax_type_code: string;
}): ConsolidatedEtimsDisplayLine {
  return {
    description: item.item_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalAmount: item.total_amount,
    vatBand: item.item_tax_type_code,
  };
}
