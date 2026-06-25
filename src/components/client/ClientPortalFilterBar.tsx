"use client";

import { IconFilterOff, IconSearch } from "@tabler/icons-react";
import {
  VEHICLE_CLASSES,
  clearedClientFilters,
  clientFiltersAreCleared,
  todayISO,
  type ClientPortalFilters,
} from "@/lib/client-portal-filters";
import { monthInputToPeriodLabel } from "@/lib/dates";

export function ClientPortalFilterBar({
  filters,
  onChange,
  resultCount,
  showPeriod = true,
  showClass = true,
}: {
  filters: ClientPortalFilters;
  onChange: (f: ClientPortalFilters) => void;
  resultCount?: number;
  showPeriod?: boolean;
  showClass?: boolean;
}) {
  const set = (patch: Partial<ClientPortalFilters>) => onChange({ ...filters, ...patch });
  const canClear = !clientFiltersAreCleared(filters);

  return (
    <div className="filter-bar">
      <div className="filter-bar-grid">
        <div className="filter-field sm:col-span-2 lg:col-span-2">
          <label className="filter-label">Search</label>
          <div className="filter-search-wrap">
            <IconSearch size={16} stroke={1.75} className="filter-search-icon" aria-hidden />
            <input
              type="search"
              className="field-input filter-search-input"
              placeholder="Invoice #, plate, route…"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              autoComplete="off"
            />
          </div>
        </div>

        {showClass && (
          <div className="filter-field">
            <label className="filter-label">Class (tonnes)</label>
            <select className="field-input filter-control" value={filters.cls} onChange={(e) => set({ cls: e.target.value })}>
              <option value="">All classes</option>
              {VEHICLE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-field">
          <label className="filter-label">Vehicle</label>
          <input
            className="field-input filter-control"
            placeholder="Plate e.g. KCF…"
            value={filters.plate}
            onChange={(e) => set({ plate: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="filter-field">
          <label className="filter-label">Month</label>
          <input
            type="month"
            className="field-input filter-control"
            value={filters.month}
            onChange={(e) => set({ month: e.target.value })}
          />
        </div>

        {showPeriod && (
          <div className="filter-field">
            <label className="filter-label">Period</label>
            <input
              className="field-input filter-control"
              placeholder={monthInputToPeriodLabel(filters.month) || "June 2026"}
              value={filters.period}
              onChange={(e) => set({ period: e.target.value })}
            />
          </div>
        )}

        <div className="filter-field">
          <label className="filter-label">Date</label>
          <div className="flex gap-1">
            <input
              type="date"
              className="field-input filter-control min-w-0 flex-1"
              value={filters.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {filters.date && (
              <button type="button" className="btn-secondary btn-sm shrink-0 px-2" onClick={() => set({ date: "" })}>
                All
              </button>
            )}
          </div>
        </div>

        <div className="filter-field">
          <label className="filter-label">Route</label>
          <input
            className="field-input filter-control"
            placeholder="Nairobi, Kisumu…"
            value={filters.destination}
            onChange={(e) => set({ destination: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-bar-actions">
        {resultCount !== undefined && (
          <span className="text-xs text-fleet-gray-400">
            {resultCount} record{resultCount !== 1 ? "s" : ""}
          </span>
        )}
        {canClear && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => onChange(clearedClientFilters())}>
            <IconFilterOff size={14} /> Clear filters
          </button>
        )}
        <button type="button" className="btn-secondary btn-sm" onClick={() => set({ date: todayISO() })}>
          Today
        </button>
      </div>
    </div>
  );
}
