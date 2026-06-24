import type { Invoice, LocalDelivery, RouteRecord, SafariEntry, ScheduleEntry, Vehicle, WorkTicket } from "@/lib/types";
import { dateKey, todayEAT } from "@/lib/dates";

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
  return todayEAT();
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

/** Default list filters — today in East Africa */
export function defaultFilters(): FleetFilters {
  return { ...empty, date: todayEAT() };
}

export function clearedFilters(): FleetFilters {
  return { ...empty };
}

export function filtersAreCleared(f: FleetFilters): boolean {
  return !f.search && !f.destination && !f.runType && !f.shift && !f.date && !f.status;
}

export function filtersAreDefault(f: FleetFilters): boolean {
  return f.date === todayEAT() && !f.search && !f.destination && !f.runType && !f.shift && !f.status;
}

type DatedRow = {
  serviceDate?: string;
  tripDate?: string;
  date?: string;
  createdAt?: string;
};

function rowDateKey(row: DatedRow): string {
  return dateKey(row.serviceDate ?? row.tripDate ?? row.date ?? row.createdAt);
}

/** Most recent first by service/trip/created date when available */
export function newestFirst<T>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = rowDateKey(a as DatedRow);
    const db = rowDateKey(b as DatedRow);
    if (da && db) return db.localeCompare(da);
    if (db) return 1;
    if (da) return -1;
    return 0;
  });
}

/** After save, focus list on today + search term */
export function highlightSearch(term: string): FleetFilters {
  return { ...defaultFilters(), search: term.trim() };
}

function matchSearch(q: string, ...fields: (string | number | undefined)[]): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  return fields.some((f) => String(f ?? "").toLowerCase().includes(lower));
}

function matchDate(serviceDate: string | undefined, filterDate: string): boolean {
  if (!filterDate) return true;
  return dateKey(serviceDate) === filterDate;
}

/** Date filter matches service/trip date OR created date (for invoices created today with earlier billing period) */
function matchRecordDate(row: DatedRow, filterDate: string): boolean {
  if (!filterDate) return true;
  const key = filterDate;
  return (
    dateKey(row.serviceDate) === key ||
    dateKey(row.tripDate) === key ||
    dateKey(row.date) === key ||
    dateKey(row.createdAt) === key
  );
}

/** Sort invoices: newest created first, then by service date */
export function newestInvoicesFirst(items: Invoice[]): Invoice[] {
  return [...items].sort((a, b) => {
    const ca = a.createdAt ?? "";
    const cb = b.createdAt ?? "";
    if (ca && cb && ca !== cb) return cb.localeCompare(ca);
    return dateKey(b.serviceDate).localeCompare(dateKey(a.serviceDate));
  });
}

/** After invoice save — show full list (no date filter) and highlight the new record */
export function filtersAfterSave(term: string): FleetFilters {
  return { ...clearedFilters(), search: term.trim() };
}

export function filterWorkTickets(items: WorkTicket[], f: FleetFilters, tab: string): WorkTicket[] {
  return newestFirst(items.filter((t) => {
    if (tab !== "all" && t.status !== tab) return false;
    if (!matchSearch(f.search, t.serialNo, t.plate, t.driverName, t.route)) return false;
    if (f.destination && !t.route.toLowerCase().includes(f.destination.toLowerCase())) return false;
    if (!matchDate(t.tripDate, f.date)) return false;
    if (f.status && t.status !== f.status) return false;
    return true;
  }));
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
  return newestInvoicesFirst(
    items.filter((e) => {
      if (tab !== "all" && e.status !== tab) return false;
      if (!matchSearch(f.search, e.plate, e.route, e.invoiceNo, e.cls, e.period)) return false;
      if (f.destination && !e.route.toLowerCase().includes(f.destination.toLowerCase())) return false;
      if (!matchRecordDate(e, f.date)) return false;
      if (f.status && e.status !== f.status) return false;
      return true;
    }),
  );
}

export function filterVehicles(items: Vehicle[], f: FleetFilters): Vehicle[] {
  return items
    .filter((e) => {
      if (!matchSearch(f.search, e.plate, e.cls, e.runType, e.client, ...e.dests)) return false;
      if (f.destination && !e.dests.some((d) => d.toLowerCase().includes(f.destination.toLowerCase()))) return false;
      if (f.runType && e.runType !== f.runType) return false;
      if (f.status && e.status !== f.status) return false;
      return true;
    })
    .sort((a, b) => {
      const da = a.createdAt ?? "";
      const db = b.createdAt ?? "";
      if (da && db) return db.localeCompare(da);
      if (db) return 1;
      if (da) return -1;
      return a.plate.localeCompare(b.plate);
    });
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

export function filterExpenses<T extends { date?: string; expenseDate?: string }>(items: T[], f: FleetFilters): T[] {
  return newestFirst(items.filter((e) => {
    const d = dateKey(e.date ?? e.expenseDate);
    if (!matchSearch(f.search, d, (e as { description?: string }).description, (e as { category?: string }).category)) return false;
    if (!matchDate(d, f.date)) return false;
    return true;
  }));
}

export function filterSoaLines<T extends { inv: number; reg: string; period?: string; serviceDate?: string }>(
  items: T[],
  f: FleetFilters,
): T[] {
  return items.filter((e) => {
    if (!matchSearch(f.search, e.reg, e.inv)) return false;
    if (f.date && e.serviceDate && dateKey(e.serviceDate) !== f.date) return false;
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
