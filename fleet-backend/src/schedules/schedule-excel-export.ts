import * as XLSX from "xlsx";

/** Column headers mirror schedule fields (import-friendly names). */
export const SCHEDULE_EXPORT_HEADERS = [
  "Plate",
  "Class",
  "Dest",
  "Run Type",
  "Rate",
  "Days",
  "Cost",
  "VAT",
  "Total",
  "Month",
  "Period Start",
  "Period End",
  "Service Date",
  "Status",
] as const;

export type ScheduleExportRow = {
  plate?: string | null;
  cls?: string | null;
  dest?: string | null;
  run_type?: string | null;
  runType?: string | null;
  rate?: string | number | null;
  days?: string | number | null;
  cost?: string | number | null;
  vat?: string | number | null;
  total?: string | number | null;
  month?: string | null;
  period_start?: string | Date | null;
  periodStart?: string | Date | null;
  period_end?: string | Date | null;
  periodEnd?: string | Date | null;
  service_date?: string | Date | null;
  serviceDate?: string | Date | null;
  status?: string | null;
  created_at?: string | Date | null;
};

export type ScheduleExportSheet = {
  title: string;
  headers: readonly string[];
  /** Data rows including blank separator rows (empty arrays) and final GRAND TOTAL row. */
  rows: (string | number)[][];
  entryCount: number;
  vehicleCount: number;
  grandTotal: { cost: number; vat: number; total: number };
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function dateStr(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function plateKey(row: ScheduleExportRow): string {
  return str(row.plate).toUpperCase() || "—";
}

function sortKey(row: ScheduleExportRow): string {
  return [
    plateKey(row),
    dateStr(row.service_date ?? row.serviceDate) || "9999-99-99",
    dateStr(row.period_start ?? row.periodStart) || "9999-99-99",
    dateStr(row.created_at) || "",
  ].join("|");
}

function toCells(row: ScheduleExportRow): (string | number)[] {
  return [
    str(row.plate).toUpperCase(),
    str(row.cls),
    str(row.dest).toUpperCase(),
    str(row.run_type ?? row.runType),
    num(row.rate),
    num(row.days),
    num(row.cost),
    num(row.vat),
    num(row.total),
    str(row.month),
    dateStr(row.period_start ?? row.periodStart),
    dateStr(row.period_end ?? row.periodEnd),
    dateStr(row.service_date ?? row.serviceDate),
    str(row.status),
  ];
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build sheet model: rows grouped by plate with a blank separator between
 * vehicles, and a single GRAND TOTAL (Cost / VAT / Total only) at the bottom.
 */
export function buildScheduleExportSheet(rows: ScheduleExportRow[]): ScheduleExportSheet {
  const sorted = [...rows].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const sheetRows: (string | number)[][] = [];

  let grandCost = 0;
  let grandVat = 0;
  let grandTotal = 0;
  let prevPlate: string | null = null;
  const plates = new Set<string>();

  for (const row of sorted) {
    const plate = plateKey(row);
    plates.add(plate);
    if (prevPlate !== null && plate !== prevPlate) {
      sheetRows.push([]); // blank line between vehicle groups
    }
    sheetRows.push(toCells(row));
    grandCost += num(row.cost);
    grandVat += num(row.vat);
    grandTotal += num(row.total);
    prevPlate = plate;
  }

  if (sorted.length) {
    sheetRows.push([]); // blank before grand total
  }

  sheetRows.push([
    "GRAND TOTAL",
    "",
    "",
    "",
    "",
    "",
    money(grandCost),
    money(grandVat),
    money(grandTotal),
    "",
    "",
    "",
    "",
    "",
  ]);

  return {
    title: "Schedule entries",
    headers: SCHEDULE_EXPORT_HEADERS,
    rows: sheetRows,
    entryCount: sorted.length,
    vehicleCount: plates.size,
    grandTotal: { cost: money(grandCost), vat: money(grandVat), total: money(grandTotal) },
  };
}

export function buildScheduleExportWorkbook(rows: ScheduleExportRow[]): Buffer {
  const sheet = buildScheduleExportSheet(rows);
  const aoa: (string | number)[][] = [[sheet.title], [...sheet.headers], ...sheet.rows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 28 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: SCHEDULE_EXPORT_HEADERS.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Schedule");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
