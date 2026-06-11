import type { Invoice, LocalDelivery, RouteRecord, SafariEntry, ScheduleEntry, Vehicle } from "@/lib/types";

export const PAGE_SIZE = 10;

export type FleetFilters = {
  search: string;
  destination: string;
  runType: string;
  shift: string;
  date: string;
  status: string;
};

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const empty: FleetFilters = {
  search: "",
  destination: "",
  runType: "",
  shift: "",
  date: "",
  status: "",
};

export function emptyFilters(): FleetFilters {
  return { ...empty };
}

export function clearedFilters(): FleetFilters {
  return { ...empty };
}

/** Alias — no filters applied on load */
export function defaultFilters(): FleetFilters {
  return clearedFilters();
}

export function filtersAreCleared(f: FleetFilters): boolean {
  return !f.search && !f.destination && !f.runType && !f.shift && !f.date && !f.status;
}

export function filtersAreDefault(f: FleetFilters): boolean {
  return filtersAreCleared(f);
}

/** Newest entries first (last saved appears at top of list) */
export function newestFirst<T>(items: T[]): T[] {
  return [...items].reverse();
}

/** After save, focus list search on the new record */
export function highlightSearch(term: string): FleetFilters {
  return { ...clearedFilters(), search: term.trim() };
}

function matchSearch(q: string, ...fields: (string | number | undefined)[]): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  return fields.some((f) => String(f ?? "").toLowerCase().includes(lower));
}

function matchDate(serviceDate: string | undefined, filterDate: string): boolean {
  if (!filterDate) return true;
  return (serviceDate ?? "") === filterDate;
}

export function filterSchedules(items: ScheduleEntry[], f: FleetFilters): ScheduleEntry[] {
  return newestFirst(items.filter((e) => {
    if (!matchSearch(f.search, e.plate, e.dest, e.cls)) return false;
    if (f.destination && !e.dest.toLowerCase().includes(f.destination.toLowerCase())) return false;
    if (f.runType && e.runType !== f.runType) return false;
    if (!matchDate(e.serviceDate, f.date)) return false;
    if (f.status && e.status !== f.status) return false;
    return true;
  }));
}

export function filterInvoices(items: Invoice[], f: FleetFilters, tab: string): Invoice[] {
  return newestFirst(items.filter((e) => {
    if (tab !== "all" && e.status !== tab) return false;
    if (!matchSearch(f.search, e.plate, e.route, e.invoiceNo, e.cls)) return false;
    if (f.destination && !e.route.toLowerCase().includes(f.destination.toLowerCase())) return false;
    if (!matchDate(e.serviceDate, f.date)) return false;
    if (f.status && e.status !== f.status) return false;
    return true;
  }));
}

export function filterVehicles(items: Vehicle[], f: FleetFilters): Vehicle[] {
  return newestFirst(items.filter((e) => {
    if (!matchSearch(f.search, e.plate, e.cls, e.runType, e.client, ...e.dests)) return false;
    if (f.destination && !e.dests.some((d) => d.toLowerCase().includes(f.destination.toLowerCase()))) return false;
    if (f.runType && e.runType !== f.runType) return false;
    if (f.status && e.status !== f.status) return false;
    return true;
  }));
}

export function filterLocalDeliveries(items: LocalDelivery[], f: FleetFilters): LocalDelivery[] {
  return newestFirst(items.filter((e) => {
    if (!matchSearch(f.search, e.reg)) return false;
    if (f.shift === "morning" && e.m <= 0) return false;
    if (f.shift === "afternoon" && e.a <= 0) return false;
    if (f.shift === "both" && !(e.m > 0 && e.a > 0)) return false;
    if (f.runType === "Morning" && e.m <= 0) return false;
    if (f.runType === "Afternoon" && e.a <= 0) return false;
    if (!matchDate(e.serviceDate, f.date)) return false;
    return true;
  }));
}

export function filterSafari(items: SafariEntry[], f: FleetFilters): SafariEntry[] {
  return newestFirst(items.filter((e) => {
    if (!matchSearch(f.search, e.reg, e.dest)) return false;
    if (f.destination && !e.dest.toLowerCase().includes(f.destination.toLowerCase())) return false;
    if (!matchDate(e.serviceDate, f.date)) return false;
    return true;
  }));
}

export function filterRoutes(items: RouteRecord[], f: FleetFilters): RouteRecord[] {
  return newestFirst(items.filter((e) => {
    if (!matchSearch(f.search, e.name)) return false;
    if (f.destination && !e.name.toLowerCase().includes(f.destination.toLowerCase())) return false;
    if (f.status && e.status !== f.status) return false;
    return true;
  }));
}

export function filterSoaLines<T extends { inv: number; reg: string; period?: string; serviceDate?: string }>(
  items: T[],
  f: FleetFilters,
): T[] {
  return items.filter((e) => {
    if (!matchSearch(f.search, e.reg, e.inv)) return false;
    if (f.date && e.serviceDate && e.serviceDate !== f.date) return false;
    return true;
  });
}

export function seedServiceDate(index: number, year: number, month: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = (index % daysInMonth) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizePlate(p: string): string {
  return p.trim().toUpperCase();
}

export function recordsForPlate(
  plate: string,
  schedules: ScheduleEntry[],
  localDeliveries: LocalDelivery[],
  safari: SafariEntry[],
  invoices: Invoice[],
) {
  const p = normalizePlate(plate);
  return {
    schedules: schedules.filter((s) => normalizePlate(s.plate) === p),
    locals: localDeliveries.filter((l) => normalizePlate(l.reg) === p),
    safari: safari.filter((s) => normalizePlate(s.reg) === p),
    invoices: invoices.filter((i) => normalizePlate(i.plate) === p),
  };
}
