import { monthRange } from "./consolidation-period";

/** Derive billing period bounds from trip/service dates on linked lines. */
export function suggestPeriodFromTripDates(
  rows: { tripDate?: string; trip_date?: string; serviceDate?: string; service_date?: string }[],
): { from: string; to: string } | null {
  const dates = rows
    .map((r) => {
      const raw = r.tripDate ?? r.trip_date ?? r.serviceDate ?? r.service_date ?? "";
      const iso = String(raw).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
    })
    .filter(Boolean)
    .sort();

  if (!dates.length) return null;

  const from = dates[0]!;
  const to = dates[dates.length - 1]!;
  if (from.slice(0, 7) === to.slice(0, 7)) {
    const [y, m] = from.split("-").map(Number);
    return monthRange(y, m);
  }
  return { from, to };
}

export async function reviseConsolidatedInvoice(
  id: string,
  body: { periodStart: string; periodEnd: string; invoiceDate?: string },
): Promise<Response> {
  return fetch(`/api/consolidated-invoices/${id}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
