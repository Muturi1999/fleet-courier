/** Monthly contract totals (actual Excel / SOA data) */
import type { Invoice, ScheduleEntry, Vehicle } from "./types";

export const REPORT_MONTHS = [
  { key: "2026-01", label: "January 2026", short: "Jan 2026", period: "Jan 2026" },
  { key: "2026-02", label: "February 2026", short: "Feb 2026", period: "Feb 2026" },
  { key: "2026-03", label: "March 2026", short: "Mar 2026", period: "Mar 2026" },
  { key: "ytd", label: "YTD Jan–Mar 2026", short: "YTD", period: "YTD" },
] as const;

export type ReportMonthKey = (typeof REPORT_MONTHS)[number]["key"];

export type MonthlySnapshot = {
  net: number;
  vat: number;
  total: number;
  invoices: number;
  vehicles: number;
  runs: number;
};

export const MONTHLY_SNAPSHOTS: Record<string, MonthlySnapshot> = {
  "2026-01": { net: 13620690, vat: 2179310, total: 15800000, invoices: 268, vehicles: 82, runs: 890 },
  "2026-02": { net: 14785435, vat: 2365619, total: 17151054, invoices: 279, vehicles: 85, runs: 912 },
  "2026-03": { net: 15193500, vat: 2430960, total: 17624460, invoices: 291, vehicles: 88, runs: 934 },
};

export function ytdSnapshot(): MonthlySnapshot {
  const keys = ["2026-01", "2026-02", "2026-03"];
  return keys.reduce(
    (acc, k) => {
      const m = MONTHLY_SNAPSHOTS[k];
      return {
        net: acc.net + m.net,
        vat: acc.vat + m.vat,
        total: acc.total + m.total,
        invoices: acc.invoices + m.invoices,
        vehicles: Math.max(acc.vehicles, m.vehicles),
        runs: acc.runs + m.runs,
      };
    },
    { net: 0, vat: 0, total: 0, invoices: 0, vehicles: 0, runs: 0 },
  );
}

export function snapshotForMonth(key: ReportMonthKey): MonthlySnapshot {
  if (key === "ytd") return ytdSnapshot();
  return MONTHLY_SNAPSHOTS[key] ?? MONTHLY_SNAPSHOTS["2026-03"];
}

export function periodForMonth(key: ReportMonthKey): string | null {
  if (key === "ytd") return null;
  return REPORT_MONTHS.find((m) => m.key === key)?.period ?? "Mar 2026";
}

export function monthKeysForFilter(key: ReportMonthKey): string[] | null {
  if (key === "ytd") return ["Jan 2026", "Feb 2026", "Mar 2026"];
  const p = periodForMonth(key);
  return p ? [p] : null;
}

export type RevenueTrendPoint = { label: string; total: number; net: number; vat: number };

export function revenueTrend(): RevenueTrendPoint[] {
  return [
    { label: "Jan 2026", ...MONTHLY_SNAPSHOTS["2026-01"] },
    { label: "Feb 2026", ...MONTHLY_SNAPSHOTS["2026-02"] },
    { label: "Mar 2026", ...MONTHLY_SNAPSHOTS["2026-03"] },
  ];
}

export type ClassBreakdown = { cls: string; vehicles: number; net: number; vat: number; total: number };

export type VatLine = {
  invoiceNo: string;
  plate: string;
  route: string;
  days: number;
  net: number;
  vat: number;
  total: number;
  status: string;
  period?: string;
};

export type VehicleReportRow = {
  plate: string;
  cls: string;
  route: string;
  days: number;
  net: number;
  vat: number;
  total: number;
  source: "invoice" | "schedule";
};

export type VehicleSummary = {
  plate: string;
  cls: string;
  runs: number;
  days: number;
  net: number;
  vat: number;
  total: number;
  routes: string[];
};

export type DestReportRow = { dest: string; trips: number; net: number; vat: number; total: number };

function inMonth(period: string | undefined, months: string[] | null): boolean {
  if (!months) return true;
  if (!period) return months.includes("Mar 2026");
  return months.some((m) => period.includes(m.split(" ")[0]!) || period === m);
}

export function filterInvoicesByMonth(invoices: Invoice[], monthKey: ReportMonthKey): Invoice[] {
  const months = monthKeysForFilter(monthKey);
  if (monthKey === "2026-03" || monthKey === "ytd") {
    return invoices.filter((i) => inMonth(i.period, months));
  }
  // Jan/Feb: scale live invoice sample for demo line items
  const ratio = monthKey === "2026-01" ? 0.896 : 0.972;
  return invoices.slice(0, Math.floor(invoices.length * ratio)).map((i) => ({
    ...i,
    net: Math.round(i.net * ratio),
    vat: Math.round(i.vat * ratio),
    total: Math.round(i.total * ratio),
    period: monthKey === "2026-01" ? "Jan 2026" : "Feb 2026",
  }));
}

export function filterSchedulesByMonth(schedules: ScheduleEntry[], monthKey: ReportMonthKey): ScheduleEntry[] {
  const months = monthKeysForFilter(monthKey);
  if (monthKey === "2026-03" || monthKey === "ytd") {
    return schedules.filter((s) => inMonth(s.month, months));
  }
  const ratio = monthKey === "2026-01" ? 0.896 : 0.972;
  return schedules.slice(0, Math.floor(schedules.length * ratio)).map((s) => ({
    ...s,
    cost: Math.round(s.cost * ratio),
    vat: Math.round(s.vat * ratio),
    total: Math.round(s.total * ratio),
    month: monthKey === "2026-01" ? "Jan 2026" : "Feb 2026",
  }));
}

export function computeVatSummary(invoices: Invoice[], monthKey: ReportMonthKey) {
  const filtered = filterInvoicesByMonth(invoices, monthKey);
  if (monthKey !== "2026-03" && monthKey !== "ytd") {
    const snap = snapshotForMonth(monthKey);
    return { lines: filtered, net: snap.net, vat: snap.vat, total: snap.total, count: snap.invoices };
  }
  const net = filtered.reduce((s, i) => s + i.net, 0);
  const vat = filtered.reduce((s, i) => s + i.vat, 0);
  const total = filtered.reduce((s, i) => s + i.total, 0);
  return { lines: filtered, net, vat, total, count: filtered.length };
}

export function computeClassBreakdown(
  vehicles: Vehicle[],
  schedules: ScheduleEntry[],
  monthKey: ReportMonthKey,
): ClassBreakdown[] {
  const sch = filterSchedulesByMonth(schedules, monthKey);
  const byCls = new Map<string, ClassBreakdown>();

  for (const s of sch) {
    const cur = byCls.get(s.cls) ?? { cls: s.cls, vehicles: 0, net: 0, vat: 0, total: 0 };
    cur.net += s.cost;
    cur.vat += s.vat;
    cur.total += s.total;
    byCls.set(s.cls, cur);
  }

  const platesByCls = new Map<string, Set<string>>();
  for (const s of sch) {
    if (!platesByCls.has(s.cls)) platesByCls.set(s.cls, new Set());
    platesByCls.get(s.cls)!.add(s.plate);
  }

  for (const [cls, breakdown] of byCls) {
    breakdown.vehicles = platesByCls.get(cls)?.size ?? 0;
  }

  if (byCls.size === 0) {
    return ["7T", "15T", "CANTER", "VAN"].map((cls) => {
      const v = vehicles.filter((x) => x.cls === cls);
      const total = v.reduce((s, x) => s + x.total, 0);
      const net = Math.round(total / 1.16);
      return { cls, vehicles: v.length, net, vat: total - net, total };
    }).filter((x) => x.total > 0);
  }

  return [...byCls.values()].sort((a, b) => b.total - a.total);
}

export function computeFleetRanking(
  vehicles: Vehicle[],
  schedules: ScheduleEntry[],
  monthKey: ReportMonthKey,
): VehicleSummary[] {
  const sch = filterSchedulesByMonth(schedules, monthKey);
  const byPlate = new Map<string, VehicleSummary>();

  for (const s of sch) {
    const cur = byPlate.get(s.plate) ?? {
      plate: s.plate,
      cls: s.cls,
      runs: 0,
      days: 0,
      net: 0,
      vat: 0,
      total: 0,
      routes: [],
    };
    cur.runs += 1;
    cur.days += s.days;
    cur.net += s.cost;
    cur.vat += s.vat;
    cur.total += s.total;
    if (!cur.routes.includes(s.dest)) cur.routes.push(s.dest);
    byPlate.set(s.plate, cur);
  }

  if (byPlate.size === 0) {
    const ratio = monthKey === "2026-01" ? 0.896 : monthKey === "2026-02" ? 0.972 : monthKey === "ytd" ? 1 : 1;
    return vehicles
      .filter((v) => v.total > 0)
      .map((v) => ({
        plate: v.plate,
        cls: v.cls,
        runs: v.runs,
        days: v.days,
        net: Math.round((v.total / 1.16) * (monthKey === "ytd" ? 1 : ratio)),
        vat: Math.round((v.total - v.total / 1.16) * (monthKey === "ytd" ? 1 : ratio)),
        total: Math.round(v.total * (monthKey === "ytd" ? 1 : ratio)),
        routes: v.dests,
      }))
      .sort((a, b) => b.total - a.total);
  }

  return [...byPlate.values()].sort((a, b) => b.total - a.total);
}

export function computeVehicleReport(
  plate: string,
  invoices: Invoice[],
  schedules: ScheduleEntry[],
  monthKey: ReportMonthKey,
): { rows: VehicleReportRow[]; summary: VehicleSummary | null } {
  const sch = filterSchedulesByMonth(schedules, monthKey).filter((s) => s.plate === plate);
  const inv = filterInvoicesByMonth(invoices, monthKey).filter((i) => i.plate === plate);

  const rows: VehicleReportRow[] = [
    ...sch.map((s) => ({
      plate: s.plate,
      cls: s.cls,
      route: s.dest,
      days: s.days,
      net: s.cost,
      vat: s.vat,
      total: s.total,
      source: "schedule" as const,
    })),
    ...inv.map((i) => ({
      plate: i.plate,
      cls: i.cls,
      route: i.route,
      days: i.days,
      net: i.net,
      vat: i.vat,
      total: i.total,
      source: "invoice" as const,
    })),
  ];

  if (rows.length === 0) return { rows: [], summary: null };

  const summary: VehicleSummary = {
    plate,
    cls: rows[0]!.cls,
    runs: rows.length,
    days: rows.reduce((s, r) => s + r.days, 0),
    net: rows.reduce((s, r) => s + r.net, 0),
    vat: rows.reduce((s, r) => s + r.vat, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
    routes: [...new Set(rows.map((r) => r.route))],
  };

  return { rows, summary };
}

export function computeDestBreakdown(schedules: ScheduleEntry[], monthKey: ReportMonthKey): DestReportRow[] {
  const sch = filterSchedulesByMonth(schedules, monthKey);
  const byDest = new Map<string, DestReportRow>();

  for (const s of sch) {
    const cur = byDest.get(s.dest) ?? { dest: s.dest, trips: 0, net: 0, vat: 0, total: 0 };
    cur.trips += 1;
    cur.net += s.cost;
    cur.vat += s.vat;
    cur.total += s.total;
    byDest.set(s.dest, cur);
  }

  return [...byDest.values()].sort((a, b) => b.total - a.total);
}

export function invoiceStatusBreakdown(invoices: Invoice[], monthKey: ReportMonthKey) {
  const filtered = filterInvoicesByMonth(invoices, monthKey);
  const counts = new Map<string, number>();
  for (const i of filtered) {
    counts.set(i.status, (counts.get(i.status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => ({ status, count }));
}
