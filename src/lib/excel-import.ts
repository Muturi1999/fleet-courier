import { calcBilling } from "./billing";

type Row = Record<string, unknown>;

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function rowMap(raw: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normKey(k)] = v;
  }
  return out;
}

function cellStr(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[normKey(key)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function cellNum(row: Row, ...keys: string[]): number {
  const s = cellStr(row, ...keys).replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function readWorkbook(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function parseRunType(raw: string): "Morning" | "Afternoon" {
  const v = raw.toLowerCase();
  if (v.includes("after")) return "Afternoon";
  return "Morning";
}

export type ScheduleImportRow = {
  plate: string;
  cls: string;
  dest: string;
  runType: "Morning" | "Afternoon";
  rate: number;
  days: number;
  cost: number;
  vat: number;
  total: number;
  month?: string;
  serviceDate?: string;
  status?: "saved" | "draft";
};

export async function parseScheduleExcel(file: File): Promise<ScheduleImportRow[]> {
  const json = await readWorkbook(file);
  const rows: ScheduleImportRow[] = [];

  for (const raw of json) {
    const row = rowMap(raw);
    const plate = cellStr(row, "plate", "registration", "reg", "vehicle").toUpperCase();
    if (!plate) continue;

    const rate = cellNum(row, "rate", "dayrate", "dailyrate") || 8500;
    const days = cellNum(row, "days", "day") || 1;
    const cost = cellNum(row, "cost", "net", "amount") || calcBilling(rate, days).cost;
    const vat = cellNum(row, "vat") || calcBilling(rate, days).vat;
    const total = cellNum(row, "total", "gross") || cost + vat;

    rows.push({
      plate,
      cls: cellStr(row, "cls", "class", "vehicleclass") || "7T",
      dest: cellStr(row, "dest", "destination", "route").toUpperCase() || "NAIROBI",
      runType: parseRunType(cellStr(row, "runtype", "run", "shift")),
      rate,
      days,
      cost,
      vat,
      total,
      month: cellStr(row, "month", "period") || undefined,
      serviceDate: cellStr(row, "servicedate", "date") || undefined,
      status: "saved",
    });
  }

  return rows;
}

export type RateImportRow = {
  route: string;
  cls: string;
  rate: number;
  effectiveFrom: string;
  status: "active" | "inactive";
  category: "nairobi" | "upcountry";
};

export async function parseRatesExcel(file: File): Promise<RateImportRow[]> {
  const json = await readWorkbook(file);
  const rows: RateImportRow[] = [];

  for (const raw of json) {
    const row = rowMap(raw);
    const route = cellStr(row, "route", "destination", "dest");
    if (!route) continue;
    const cls = cellStr(row, "cls", "class") || "7T";
    const rate = cellNum(row, "rate", "amount", "price");
    if (!rate) continue;
    const catRaw = cellStr(row, "category", "type").toLowerCase();
    rows.push({
      route,
      cls,
      rate,
      effectiveFrom: cellStr(row, "effectivefrom", "from", "date") || "2026-01-01",
      status: "active",
      category: catRaw.includes("up") ? "upcountry" : "nairobi",
    });
  }

  return rows;
}

export type InvoiceImportRow = {
  invoiceNo: string;
  plate: string;
  cls: string;
  route: string;
  days: number;
  net: number;
  vat: number;
  total: number;
  status: string;
  period?: string;
  serviceDate?: string;
};

export async function parseInvoicesExcel(file: File): Promise<InvoiceImportRow[]> {
  const json = await readWorkbook(file);
  const rows: InvoiceImportRow[] = [];

  for (const raw of json) {
    const row = rowMap(raw);
    const invoiceNo = cellStr(row, "invoiceno", "invoice", "inv", "number").replace(/^#/, "");
    const plate = cellStr(row, "plate", "registration", "reg").toUpperCase();
    if (!invoiceNo || !plate) continue;

    const net = cellNum(row, "net", "cost", "amount");
    const vat = cellNum(row, "vat");
    const total = cellNum(row, "total", "gross") || net + vat;

    rows.push({
      invoiceNo,
      plate,
      cls: cellStr(row, "cls", "class") || "7T",
      route: cellStr(row, "route", "destination", "dest") || "Nairobi Morning",
      days: cellNum(row, "days", "day") || 1,
      net,
      vat,
      total,
      status: cellStr(row, "status").toLowerCase() || "draft",
      period: cellStr(row, "period", "month") || undefined,
      serviceDate: cellStr(row, "servicedate", "date") || undefined,
    });
  }

  return rows;
}
