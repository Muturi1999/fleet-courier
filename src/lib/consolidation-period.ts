import { formatBillingPeriodMonth } from "./dates";
import type { RouteRecord, SafariEntry, Vehicle, WorkTicketJourneyLeg } from "./types";

export type PeriodPreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

const MONTHS = [
  { n: 1, name: "January" },
  { n: 2, name: "February" },
  { n: 3, name: "March" },
  { n: 4, name: "April" },
  { n: 5, name: "May" },
  { n: 6, name: "June" },
  { n: 7, name: "July" },
  { n: 8, name: "August" },
  { n: 9, name: "September" },
  { n: 10, name: "October" },
  { n: 11, name: "November" },
  { n: 12, name: "December" },
] as const;

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const m = String(month).padStart(2, "0");
  const last = lastDayOfMonth(year, month);
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${String(last).padStart(2, "0")}` };
}

export function rangeLabel(from: string, to: string): string {
  if (!from || !to) return "";
  if (from.slice(0, 7) === to.slice(0, 7)) return formatBillingPeriodMonth(from);
  return `${formatBillingPeriodMonth(from)} – ${formatBillingPeriodMonth(to)}`;
}

/** Calendar months for the selected year. */
export function buildPeriodPresets(year = new Date().getFullYear()): PeriodPreset[] {
  return MONTHS.map((m) => {
    const { from, to } = monthRange(year, m.n);
    return { id: `m-${m.n}`, label: m.name, from, to };
  });
}

/** Searchable run / route / destination options for period consolidation filters. */
export function buildRunRouteFilterOptions(sources: {
  vehicles: Vehicle[];
  routes: RouteRecord[];
  safari: SafariEntry[];
  previewLines?: { route: string; runType: string }[];
}): { value: string; label: string }[] {
  const set = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim();
    if (t) set.add(t);
  };

  for (const label of [
    "Nairobi",
    "Morning Run",
    "Afternoon Run",
    "Nairobi Morning Run",
    "Nairobi Afternoon Run",
  ]) {
    add(label);
  }

  for (const v of sources.vehicles) {
    add(v.runType);
    for (const d of v.dests) {
      add(d);
      const upper = d.toUpperCase();
      if (upper.includes("NAIROBI") && upper.includes("AFTERNOON")) add("Nairobi Afternoon Run");
      else if (upper.includes("NAIROBI")) add("Nairobi Morning Run");
    }
  }

  for (const r of sources.routes) add(r.name);
  for (const s of sources.safari) add(s.dest);

  for (const line of sources.previewLines ?? []) {
    add(line.route);
    add(line.runType);
  }

  return [...set]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((value) => ({ value, label: value }));
}

export type PeriodGroupBy = "vehicle" | "route" | "cls" | "runType" | "month";

export const PERIOD_GROUP_OPTIONS: { value: PeriodGroupBy; label: string }[] = [
  { value: "vehicle", label: "Vehicle" },
  { value: "route", label: "Route" },
  { value: "cls", label: "Vehicle class" },
  { value: "runType", label: "Run type" },
  { value: "month", label: "Month" },
];

export type PeriodPreviewLine = {
  id: string;
  serialNo: string;
  tripDate: string;
  plate: string;
  cls: string;
  make: string;
  branch: string;
  route: string;
  driverName: string;
  net: number;
  vat: number;
  total: number;
  invoiceNo: string;
  runType: string;
  tripMonth: string;
  /** Invoice Days/Trip (from billable row). */
  days: number;
  agreedRate: number;
  legs?: WorkTicketJourneyLeg[];
};

export type PeriodPreviewGroup = {
  key: string;
  invoiceCount: number;
  net: number;
  total: number;
  lines: PeriodPreviewLine[];
};

export type PeriodPreview = {
  from: string;
  to: string;
  groupBy: string;
  invoiceCount: number;
  vehicleCount: number;
  net: number;
  total: number;
  groups: PeriodPreviewGroup[];
  lines: PeriodPreviewLine[];
};

export function mapPeriodPreviewLine(row: Record<string, unknown>): PeriodPreviewLine {
  return {
    id: String(row.id ?? ""),
    serialNo: String(row.serialNo ?? row.serial_no ?? ""),
    tripDate: String(row.tripDate ?? row.trip_date ?? ""),
    plate: String(row.plate ?? ""),
    cls: String(row.cls ?? ""),
    make: String(row.make ?? ""),
    branch: String(row.branch ?? ""),
    route: String(row.route ?? ""),
    driverName: String(row.driverName ?? row.driver_name ?? ""),
    net: Number(row.net ?? 0),
    vat: Number(row.vat ?? 0),
    total: Number(row.total ?? 0),
    invoiceNo: String(row.invoiceNo ?? row.invoice_no ?? ""),
    runType: String(row.runType ?? row.run_type ?? ""),
    tripMonth: String(row.tripMonth ?? row.trip_month ?? ""),
    days: Math.max(1, Number(row.days ?? 1)),
    agreedRate: Number(row.agreedRate ?? row.agreed_rate ?? row.dayRate ?? row.day_rate ?? 0),
    legs: Array.isArray(row.legs) ? (row.legs as PeriodPreviewLine["legs"]) : undefined,
  };
}

export function mapPeriodPreview(json: unknown): PeriodPreview | null {
  if (!json || typeof json !== "object") return null;
  const raw = json as Record<string, unknown>;
  const groupsRaw = Array.isArray(raw.groups) ? raw.groups : [];
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];

  return {
    from: String(raw.from ?? ""),
    to: String(raw.to ?? ""),
    groupBy: String(raw.groupBy ?? raw.group_by ?? "vehicle"),
    invoiceCount: Number(raw.invoiceCount ?? raw.invoice_count ?? 0),
    vehicleCount: Number(raw.vehicleCount ?? raw.vehicle_count ?? 0),
    net: Number(raw.net ?? 0),
    total: Number(raw.total ?? 0),
    groups: groupsRaw.map((g) => {
      const gr = g as Record<string, unknown>;
      const lines = Array.isArray(gr.lines) ? gr.lines.map((l) => mapPeriodPreviewLine(l as Record<string, unknown>)) : [];
      return {
        key: String(gr.key ?? ""),
        invoiceCount: Number(gr.invoiceCount ?? gr.invoice_count ?? lines.length),
        net: Number(gr.net ?? 0),
        total: Number(gr.total ?? 0),
        lines,
      };
    }),
    lines: linesRaw.map((l) => mapPeriodPreviewLine(l as Record<string, unknown>)),
  };
}

export function buildPeriodPreviewUrl(params: {
  from: string;
  to: string;
  groupBy: PeriodGroupBy;
  cls?: string;
  runRoute?: string;
}): string {
  const q = new URLSearchParams({
    periodPreview: "true",
    from: params.from,
    to: params.to,
    groupBy: params.groupBy,
  });
  if (params.cls?.trim()) q.set("cls", params.cls.trim());
  if (params.runRoute?.trim()) q.set("runRoute", params.runRoute.trim());
  return `/api/consolidated-invoices?${q.toString()}`;
}
