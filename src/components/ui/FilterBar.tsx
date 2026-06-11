"use client";

import { IconFilterOff, IconSearch } from "@tabler/icons-react";
import type { FleetFilters } from "@/lib/filters";
import { clearedFilters, filtersAreCleared, todayISO } from "@/lib/filters";

export type FilterField =
  | "search"
  | "destination"
  | "runType"
  | "shift"
  | "date"
  | "status";

const RUN_TYPES = ["", "Morning", "Afternoon"];
const SHIFTS = [
  { value: "", label: "All shifts" },
  { value: "morning", label: "Morning only" },
  { value: "afternoon", label: "Afternoon only" },
  { value: "both", label: "Both shifts" },
];
const STATUSES_SCHEDULE = ["", "saved", "draft"];
const STATUSES_VEHICLE = ["", "active", "inactive", "suspended"];
const STATUSES_INVOICE = ["", "draft", "sent", "approved", "paid", "pending", "rejected"];
const STATUSES_ROUTE = ["", "active", "inactive"];

function statusOptions(kind?: string) {
  if (kind === "vehicle") return STATUSES_VEHICLE;
  if (kind === "invoice") return STATUSES_INVOICE;
  if (kind === "route") return STATUSES_ROUTE;
  return STATUSES_SCHEDULE;
}

function FilterFieldWrap({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`filter-field ${className}`}>
      <label className="filter-label">{label}</label>
      {children}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  fields,
  statusKind,
  resultCount,
  children,
}: {
  filters: FleetFilters;
  onChange: (f: FleetFilters) => void;
  fields: FilterField[];
  statusKind?: "vehicle" | "invoice" | "route" | "schedule";
  resultCount?: number;
  children?: React.ReactNode;
}) {
  const set = (patch: Partial<FleetFilters>) => onChange({ ...filters, ...patch });
  const canClear = !filtersAreCleared(filters);

  return (
    <div className="filter-bar">
      <div className="filter-bar-grid">
        {fields.includes("search") && (
          <FilterFieldWrap label="Search" className="sm:col-span-2 lg:col-span-2">
            <div className="filter-search-wrap">
              <IconSearch size={16} stroke={1.75} className="filter-search-icon" aria-hidden />
              <input
                type="search"
                className="field-input filter-search-input"
                placeholder="Plate, route, invoice…"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                autoComplete="off"
              />
            </div>
          </FilterFieldWrap>
        )}

        {fields.includes("destination") && (
          <FilterFieldWrap label="Destination">
            <input
              className="field-input filter-control"
              placeholder="Nairobi, Kisumu…"
              value={filters.destination}
              onChange={(e) => set({ destination: e.target.value })}
            />
          </FilterFieldWrap>
        )}

        {fields.includes("runType") && (
          <FilterFieldWrap label="Run type">
            <select className="field-input filter-control" value={filters.runType} onChange={(e) => set({ runType: e.target.value })}>
              <option value="">All</option>
              {RUN_TYPES.filter(Boolean).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </FilterFieldWrap>
        )}

        {fields.includes("shift") && (
          <FilterFieldWrap label="Shift">
            <select className="field-input filter-control" value={filters.shift} onChange={(e) => set({ shift: e.target.value })}>
              {SHIFTS.map((s) => (
                <option key={s.value || "all"} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FilterFieldWrap>
        )}

        {fields.includes("date") && (
          <FilterFieldWrap label="Date">
            <div className="flex gap-1">
              <input
                type="date"
                className="field-input filter-control min-w-0 flex-1"
                value={filters.date}
                onChange={(e) => set({ date: e.target.value })}
              />
              {filters.date && (
                <button
                  type="button"
                  className="btn-secondary btn-sm shrink-0 px-2"
                  title="Show all dates"
                  onClick={() => set({ date: "" })}
                >
                  All
                </button>
              )}
            </div>
          </FilterFieldWrap>
        )}

        {fields.includes("status") && (
          <FilterFieldWrap label="Status">
            <select className="field-input filter-control" value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              {statusOptions(statusKind).map((s) => (
                <option key={s || "all"} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All statuses"}</option>
              ))}
            </select>
          </FilterFieldWrap>
        )}
      </div>

      <div className="filter-bar-actions">
        {resultCount !== undefined && (
          <span className="text-xs text-fleet-gray-400">{resultCount} record{resultCount !== 1 ? "s" : ""}</span>
        )}
        {canClear && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => onChange(clearedFilters())}>
            <IconFilterOff size={14} /> Clear filters
          </button>
        )}
        {fields.includes("date") && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => set({ date: todayISO() })}>
            Today
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
