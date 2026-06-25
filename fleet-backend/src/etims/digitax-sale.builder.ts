import type { DigitaxSaleWithItemsPayload } from "./digitax.types";

type FleetInvoice = {
  id: string;
  invoice_no: string;
  plate: string;
  route: string;
  days: number;
  net: string | number;
  vat: string | number;
  total: string | number;
  service_date?: string | Date | null;
  period?: string | null;
};

type BillingClient = {
  name?: string;
  legalName?: string;
  pin?: string;
};

export function buildDigitaxSalePayload(
  invoice: FleetInvoice,
  client: BillingClient,
  itemClassCode: string,
): DigitaxSaleWithItemsPayload {
  const days = Math.max(1, Number(invoice.days) || 1);
  const total = Number(invoice.total);
  const unitPrice = Math.round((total / days) * 100) / 100;
  const saleDate = formatSaleDate(invoice.service_date);
  const customerName = (client.legalName || client.name || "Customer").trim();
  const customerTin = (client.pin || "").trim().toUpperCase();
  const details = [
    invoice.route.trim(),
    invoice.plate.trim(),
    `${days} day${days === 1 ? "" : "s"}`,
    invoice.period?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

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
        item_name: `Courier transport — ${invoice.route}`.slice(0, 200),
        item_class_code: itemClassCode,
        item_bar_code: invoice.invoice_no.trim().slice(0, 40),
        item_tax_type_code: "B",
        quantity: days,
        unit_price: unitPrice,
        total_amount: total,
        is_stockable: false,
      },
    ],
  };
}

function formatSaleDate(value?: string | Date | null): string {
  if (value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}
