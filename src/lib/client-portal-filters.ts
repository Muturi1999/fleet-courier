import type { FleetFilters } from "./filters";
import { clearedFilters, todayISO } from "./filters";
import { currentMonthRangeEAT } from "./dates";

export const VEHICLE_CLASSES = ["7T", "15T", "CANTER", "VAN"] as const;

export type ClientPortalFilters = FleetFilters & {
  cls: string;
  plate: string;
  month: string;
  period: string;
};

const empty: ClientPortalFilters = {
  ...clearedFilters(),
  cls: "",
  plate: "",
  month: "",
  period: "",
};

export function clearedClientFilters(): ClientPortalFilters {
  return { ...empty };
}

/** Default list filters — current billing month */
export function defaultClientFilters(): ClientPortalFilters {
  const { from } = currentMonthRangeEAT();
  return { ...empty, month: from.slice(0, 7) };
}

export function clientFiltersAreCleared(f: ClientPortalFilters): boolean {
  return (
    !f.search &&
    !f.destination &&
    !f.runType &&
    !f.shift &&
    !f.date &&
    !f.status &&
    !f.cls &&
    !f.plate &&
    !f.month &&
    !f.period
  );
}

export function clientFiltersToFleet(f: ClientPortalFilters): FleetFilters {
  return {
    search: f.search,
    destination: f.destination,
    runType: f.runType,
    shift: f.shift,
    date: f.date,
    status: f.status,
  };
}

export function appendClientFilterQuery(q: URLSearchParams, f: ClientPortalFilters) {
  if (f.cls.trim()) q.set("cls", f.cls.trim());
  if (f.plate.trim()) q.set("plate", f.plate.trim());
  if (f.month.trim()) q.set("month", f.month.trim());
  if (f.period.trim()) q.set("period", f.period.trim());
}

export { todayISO };
