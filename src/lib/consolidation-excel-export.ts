import {
  breakdownPeriodTitle,
  formatBreakdownDate,
  groupBreakdownByVehicle,
  mapToBreakdownLine,
  sumBreakdownLines,
  type ConsolidationBreakdownLine,
} from "@/lib/consolidation-breakdown";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";

const HEADERS = [
  "DATE",
  "MAKE/MODEL",
  "REG NO",
  "BRANCH",
  "TON",
  "SERVICE TYPE",
  "ROUTE",
  "DAYS/TRIP",
  "NET",
  "VAT",
  "TOTAL",
  "WORK TICKET NO",
] as const;

function pickString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
  }
  return "";
}

function ticketMeta(row: Record<string, unknown> | WorkTicket) {
  const r = row as Record<string, unknown>;
  return {
    make: pickString(r, "make"),
    serial: pickString(r, "serialNo", "serial_no", "workTicketSerialNo", "invoice_no", "invoiceNo"),
  };
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildSheetRows(
  tickets: Array<WorkTicket | Record<string, unknown>>,
): (string | number)[][] {
  const lines: ConsolidationBreakdownLine[] = [];
  const metaById = new Map<string, { make: string; serial: string }>();

  for (const ticket of tickets) {
    const line = mapToBreakdownLine(ticket);
    lines.push(line);
    metaById.set(line.id, ticketMeta(ticket));
  }

  const groups = groupBreakdownByVehicle(lines);
  const rows: (string | number)[][] = [[...HEADERS]];

  for (const group of groups) {
    for (const line of group.lines) {
      const meta = metaById.get(line.id) ?? { make: "", serial: "" };
      rows.push([
        formatBreakdownDate(line.tripDate),
        meta.make,
        line.plate || "",
        line.branch || "Nairobi",
        line.ton || "",
        line.serviceType || "",
        line.route || "",
        line.trips,
        money(line.net),
        money(line.vat),
        money(line.total),
        meta.serial,
      ]);
    }
    rows.push([
      "",
      "",
      group.plate,
      "",
      "",
      "",
      `${group.plate} subtotal`,
      group.trips,
      money(group.net),
      money(group.vat),
      money(group.total),
      "",
    ]);
  }

  const totals = sumBreakdownLines(lines);
  rows.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "TOTAL",
    totals.trips,
    money(totals.net),
    money(totals.vat),
    money(totals.total),
    "",
  ]);

  return rows;
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "SOA";
}

export async function downloadConsolidatedInvoiceExcel(
  invoice: ConsolidatedInvoice,
  tickets: Array<WorkTicket | Record<string, unknown>>,
): Promise<void> {
  const XLSX = await import("xlsx");
  const periodLabel = breakdownPeriodTitle(invoice.periodStart, invoice.periodEnd);
  const sheetName = periodLabel.slice(0, 31) || "SOA";
  const rows = buildSheetRows(tickets);

  // Title + summary rows above the trip table
  const sheetAoA: (string | number)[][] = [
    [`Consolidated invoice ${invoice.invoiceNo}`],
    [`Ref ${invoice.refNo} · ${periodLabel}`],
    [`Status: ${invoice.status} · Trips: ${invoice.totalTrips}`],
    [`Net: ${money(invoice.net)} · VAT: ${money(invoice.vat)} · Total: ${money(invoice.total)}`],
    [],
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 6 },
    { wch: 12 },
    { wch: 40 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilenamePart(invoice.invoiceNo)}-${safeFilenamePart(periodLabel)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fetch full SOA detail and download Excel. */
export async function exportConsolidatedInvoiceExcelById(id: string): Promise<ConsolidatedInvoice> {
  const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load consolidated invoice");
  const data = (await res.json()) as {
    invoice: ConsolidatedInvoice;
    tickets: Array<WorkTicket | Record<string, unknown>>;
  };
  await downloadConsolidatedInvoiceExcel(data.invoice, data.tickets ?? []);
  return data.invoice;
}
