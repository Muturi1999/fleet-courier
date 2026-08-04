import {
  breakdownPeriodTitle,
  formatBreakdownDate,
  groupBreakdownByVehicle,
  mapToBreakdownLine,
  sumBreakdownLines,
  type ConsolidationBreakdownLine,
} from "@/lib/consolidation-breakdown";
import { formatPeriodRange } from "@/lib/consolidation";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";

const HEADERS = [
  "Date",
  "Make / Model",
  "Reg No",
  "Branch",
  "Ton",
  "Service Type",
  "Route",
  "Days / Trip",
  "Net (KES)",
  "VAT (KES)",
  "Total (KES)",
  "Work Ticket No",
] as const;

const COL_COUNT = HEADERS.length;

/** Fleet brand palette (ARGB hex for xlsx-js-style). */
const C = {
  navy: "0B1C3B",
  muted: "5B6B7C",
  border: "D8DAE2",
  zebra: "F7F8FA",
  white: "FFFFFF",
  subtotalBg: "E6F1FB",
  subtotalFg: "0B1C3B",
  summaryBg: "FFF4DC",
  text: "1E2340",
} as const;

type CellStyle = {
  font?: { name?: string; sz?: number; bold?: boolean; color?: { rgb: string } };
  fill?: { patternType: "solid"; fgColor: { rgb: string } };
  alignment?: { vertical?: string; horizontal?: string; wrapText?: boolean };
  border?: Record<string, { style: string; color: { rgb: string } }>;
  numFmt?: string;
};

type SheetCell = { v: string | number; t?: "s" | "n"; s?: CellStyle; z?: string };

const thin = {
  top: { style: "thin", color: { rgb: C.border } },
  bottom: { style: "thin", color: { rgb: C.border } },
  left: { style: "thin", color: { rgb: C.border } },
  right: { style: "thin", color: { rgb: C.border } },
};

const MONEY_FMT = "#,##0.00";
const INT_FMT = "#,##0";

function cell(v: string | number, s?: CellStyle, numFmt?: string): SheetCell {
  const isNum = typeof v === "number";
  return {
    v,
    t: isNum ? "n" : "s",
    s,
    ...(numFmt ? { z: numFmt } : {}),
  };
}

function dataStyle(opts: {
  align?: "left" | "center" | "right";
  bold?: boolean;
  fill?: string;
  fontColor?: string;
  sz?: number;
  mono?: boolean;
}): CellStyle {
  return {
    font: {
      name: opts.mono ? "Consolas" : "Calibri",
      sz: opts.sz ?? 10,
      bold: opts.bold ?? false,
      color: { rgb: opts.fontColor ?? C.text },
    },
    fill: opts.fill
      ? { patternType: "solid", fgColor: { rgb: opts.fill } }
      : undefined,
    alignment: {
      vertical: "center",
      horizontal: opts.align ?? "left",
      wrapText: true,
    },
    border: thin,
  };
}

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
    make: pickString(r, "make", "vehicleType", "vehicle_type"),
    serial: pickString(r, "serialNo", "serial_no", "workTicketSerialNo", "invoice_no", "invoiceNo"),
  };
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "SOA";
}

function emptyRow(): SheetCell[] {
  return Array.from({ length: COL_COUNT }, () => cell(""));
}

function buildSheet(
  invoice: ConsolidatedInvoice,
  tickets: Array<WorkTicket | Record<string, unknown>>,
): { rows: SheetCell[][]; merges: string[]; headerRowIndex: number; colWidths: number[] } {
  const lines: ConsolidationBreakdownLine[] = [];
  const metaById = new Map<string, { make: string; serial: string }>();
  for (const ticket of tickets) {
    const line = mapToBreakdownLine(ticket);
    lines.push(line);
    metaById.set(line.id, ticketMeta(ticket));
  }
  const groups = groupBreakdownByVehicle(lines);
  const totals = sumBreakdownLines(lines);
  const periodLabel = breakdownPeriodTitle(invoice.periodStart, invoice.periodEnd);

  const rows: SheetCell[][] = [];
  const merges: string[] = [];

  // Title
  const titleStyle: CellStyle = {
    font: { name: "Calibri", sz: 16, bold: true, color: { rgb: C.navy } },
    alignment: { vertical: "center", horizontal: "left" },
  };
  rows.push([cell(`Consolidated Tax Invoice  ·  ${invoice.invoiceNo}`, titleStyle), ...Array(COL_COUNT - 1).fill(cell(""))]);
  merges.push("A1:L1");

  const subtitleStyle: CellStyle = {
    font: { name: "Calibri", sz: 11, color: { rgb: C.muted } },
    alignment: { vertical: "center", horizontal: "left" },
  };
  rows.push([
    cell(
      `Statement of Account  ·  Ref ${invoice.refNo}  ·  ${formatPeriodRange(invoice.periodStart, invoice.periodEnd)}`,
      subtitleStyle,
    ),
    ...Array(COL_COUNT - 1).fill(cell("")),
  ]);
  merges.push("A2:L2");

  rows.push(emptyRow());

  // Summary strip — labels + values
  const labelS = dataStyle({ bold: true, fill: C.summaryBg, fontColor: C.muted, align: "left" });
  const valueS = dataStyle({ bold: true, fill: C.summaryBg, fontColor: C.navy, align: "left" });
  const moneyS = dataStyle({ bold: true, fill: C.summaryBg, fontColor: C.navy, align: "right" });

  rows.push([
    cell("Period", labelS),
    cell(periodLabel, valueS),
    cell("Status", labelS),
    cell(String(invoice.status).replace(/_/g, " "), valueS),
    cell("Trips", labelS),
    cell(invoice.totalTrips, valueS, INT_FMT),
    cell("Vehicles", labelS),
    cell(groups.length, valueS, INT_FMT),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
  ]);

  rows.push([
    cell("Net (KES)", labelS),
    cell(money(invoice.net), moneyS, MONEY_FMT),
    cell("VAT (KES)", labelS),
    cell(money(invoice.vat), moneyS, MONEY_FMT),
    cell("Total (KES)", labelS),
    cell(money(invoice.total), moneyS, MONEY_FMT),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
    cell("", labelS),
  ]);

  rows.push(emptyRow());
  rows.push(emptyRow());

  // Column headers
  const headerStyle: CellStyle = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: C.white } },
    fill: { patternType: "solid", fgColor: { rgb: C.navy } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: thin,
  };
  const headerRowIndex = rows.length; // 0-based
  rows.push(HEADERS.map((h) => cell(h, headerStyle)));

  // Data + subtotals
  let zebra = false;
  for (const group of groups) {
    for (const line of group.lines) {
      const meta = metaById.get(line.id) ?? { make: "", serial: "" };
      const fill = zebra ? C.zebra : C.white;
      const left = dataStyle({ fill, align: "left" });
      const center = dataStyle({ fill, align: "center" });
      const right = dataStyle({ fill, align: "right" });
      const mono = dataStyle({ fill, align: "left", mono: true });

      rows.push([
        cell(formatBreakdownDate(line.tripDate), left),
        cell(meta.make || "—", left),
        cell(line.plate || "—", mono),
        cell(line.branch || "Nairobi", left),
        cell(line.ton || "—", center),
        cell(line.serviceType || "—", center),
        cell(line.route || "—", left),
        cell(line.trips, center, INT_FMT),
        cell(money(line.net), right, MONEY_FMT),
        cell(money(line.vat), right, MONEY_FMT),
        cell(money(line.total), right, MONEY_FMT),
        cell(meta.serial || "—", mono),
      ]);
      zebra = !zebra;
    }

    const sub = dataStyle({
      bold: true,
      fill: C.subtotalBg,
      fontColor: C.subtotalFg,
      align: "right",
    });
    const subRight = dataStyle({
      bold: true,
      fill: C.subtotalBg,
      fontColor: C.subtotalFg,
      align: "right",
    });

    // Date → Days/Trip merged as "Subtotal"; amounts only after that
    const subRowIndex = rows.length;
    rows.push([
      cell("Subtotal", sub),
      cell("", sub),
      cell("", sub),
      cell("", sub),
      cell("", sub),
      cell("", sub),
      cell("", sub),
      cell("", sub),
      cell(money(group.net), subRight, MONEY_FMT),
      cell(money(group.vat), subRight, MONEY_FMT),
      cell(money(group.total), subRight, MONEY_FMT),
      cell("", sub),
    ]);
    merges.push(`A${subRowIndex + 1}:H${subRowIndex + 1}`);

    // Spacer between vehicle groups
    rows.push(emptyRow());
    zebra = false;
  }

  const totalStyle: CellStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C.white } },
    fill: { patternType: "solid", fgColor: { rgb: C.navy } },
    alignment: { vertical: "center", horizontal: "left" },
    border: thin,
  };
  const totalCenter: CellStyle = {
    ...totalStyle,
    alignment: { vertical: "center", horizontal: "center" },
  };
  const totalRight: CellStyle = {
    ...totalStyle,
    alignment: { vertical: "center", horizontal: "right" },
  };

  rows.push([
    cell("", totalStyle),
    cell("", totalStyle),
    cell("", totalStyle),
    cell("", totalStyle),
    cell("", totalStyle),
    cell("", totalStyle),
    cell("GRAND TOTAL", totalStyle),
    cell(totals.trips, totalCenter, INT_FMT),
    cell(money(totals.net), totalRight, MONEY_FMT),
    cell(money(totals.vat), totalRight, MONEY_FMT),
    cell(money(totals.total), totalRight, MONEY_FMT),
    cell("", totalStyle),
  ]);

  return {
    rows,
    merges,
    headerRowIndex,
    colWidths: [12, 18, 12, 12, 8, 13, 42, 11, 14, 12, 14, 16],
  };
}

export async function downloadConsolidatedInvoiceExcel(
  invoice: ConsolidatedInvoice,
  tickets: Array<WorkTicket | Record<string, unknown>>,
): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const periodLabel = breakdownPeriodTitle(invoice.periodStart, invoice.periodEnd);
  const sheetName = periodLabel.slice(0, 31) || "SOA";
  const { rows, merges, headerRowIndex, colWidths } = buildSheet(invoice, tickets);

  const ws: Record<string, unknown> = {};
  const range = { s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: COL_COUNT - 1 } };

  rows.forEach((row, r) => {
    row.forEach((item, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      const excelCell: Record<string, unknown> = {
        v: item.v,
        t: item.t ?? (typeof item.v === "number" ? "n" : "s"),
      };
      if (item.s) excelCell.s = item.s;
      if (item.z) excelCell.z = item.z;
      ws[addr] = excelCell;
    });
  });

  ws["!ref"] = XLSX.utils.encode_range(range);
  ws["!merges"] = merges.map((ref) => XLSX.utils.decode_range(ref));
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  ws["!rows"] = rows.map((_, i) => {
    if (i === 0) return { hpt: 28 };
    if (i === headerRowIndex) return { hpt: 22 };
    return { hpt: 18 };
  });
  // Keep column headers visible while scrolling
  ws["!views"] = [{ state: "frozen", ySplit: headerRowIndex + 1 }];

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
