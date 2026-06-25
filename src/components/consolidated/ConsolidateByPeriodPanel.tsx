"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { ConsolidatedInvoicesTable } from "@/components/consolidated/ConsolidatedInvoicesTable";
import { usePagination } from "@/hooks/usePagination";
import { PAGE_SIZE } from "@/lib/filters";
import { sortConsolidatedNewestFirst } from "@/lib/consolidation";
import {
  PERIOD_GROUP_OPTIONS,
  buildPeriodPresets,
  buildPeriodPreviewUrl,
  buildRunRouteFilterOptions,
  mapPeriodPreview,
  rangeLabel,
  type PeriodGroupBy,
  type PeriodPreview,
} from "@/lib/consolidation-period";
import { currentMonthRangeEAT, formatEATDisplay } from "@/lib/dates";
import type { ConsolidatedInvoice, RouteRecord, SafariEntry, Vehicle } from "@/lib/types";
import { labelFromCls, normalizeCls, VEHICLE_CLASSIFICATIONS } from "@/lib/vehicle-fleet";
import { fmtN } from "@/lib/utils";

function apiErrorMessage(err: { message?: string | string[]; error?: string }): string {
  if (Array.isArray(err.message)) return err.message.join(", ");
  return err.message ?? err.error ?? "Request failed";
}

export function ConsolidateByPeriodPanel({
  invoices,
  vehicles,
  routes,
  safari,
  loading,
  highlightId,
  onRefresh,
  onView,
  onPrint,
  onDownload,
  onShare,
  onDelete,
  toast,
}: {
  invoices: ConsolidatedInvoice[];
  vehicles: Vehicle[];
  routes: RouteRecord[];
  safari: SafariEntry[];
  loading: boolean;
  highlightId?: string | null;
  onRefresh: () => Promise<void>;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  toast: (msg: string) => void;
}) {
  const defaults = useMemo(() => currentMonthRangeEAT(), []);
  const presets = useMemo(() => buildPeriodPresets(new Date().getFullYear()), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [groupBy, setGroupBy] = useState<PeriodGroupBy>("vehicle");
  const [clsFilter, setClsFilter] = useState("");
  const [runRouteFilter, setRunRouteFilter] = useState("");
  const [preview, setPreview] = useState<PeriodPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const periodConsolidated = useMemo(
    () =>
      sortConsolidatedNewestFirst(
        invoices.filter(
          (inv) => inv.consolidationType === "period" || (!inv.plate?.trim() && inv.consolidationType !== "vehicle"),
        ),
      ),
    [invoices],
  );

  const listKey = `${periodConsolidated.length}-${highlightId ?? ""}`;
  const pagination = usePagination(periodConsolidated, listKey, PAGE_SIZE);

  const runRouteOptions = useMemo(
    () =>
      buildRunRouteFilterOptions({
        vehicles,
        routes,
        safari,
        previewLines: preview?.lines.map((line) => ({ route: line.route, runType: line.runType })),
      }),
    [vehicles, routes, safari, preview?.lines],
  );

  const classOptions = useMemo(
    () => VEHICLE_CLASSIFICATIONS.map((c) => ({ value: c.cls, label: c.label })),
    [],
  );

  const loadPreview = useCallback(async () => {
    if (!from || !to) return;
    setPreviewLoading(true);
    try {
      const url = buildPeriodPreviewUrl({
        from,
        to,
        groupBy,
        cls: clsFilter || undefined,
        runRoute: runRouteFilter || undefined,
      });
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setPreview(null);
        return;
      }
      setPreview(mapPeriodPreview(await res.json()));
    } finally {
      setPreviewLoading(false);
    }
  }, [from, to, groupBy, clsFilter, runRouteFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => void loadPreview(), 250);
    return () => window.clearTimeout(handle);
  }, [loadPreview]);

  const applyPreset = (preset: (typeof presets)[number]) => {
    setFrom(preset.from);
    setTo(preset.to);
    setActivePreset(preset.id);
  };

  const consolidate = async () => {
    if (!preview?.invoiceCount) {
      toast("No billable trip invoices in this period for the selected filters");
      return;
    }
    setConsolidating(true);
    try {
      const res = await fetch("/api/consolidated-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "period",
          periodStart: from,
          periodEnd: to,
          cls: clsFilter || undefined,
          runRoute: runRouteFilter || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
        toast(apiErrorMessage(err));
        return;
      }
      const created = (await res.json()) as ConsolidatedInvoice;
      toast(
        `Period batch ${created.invoiceNo} — ${created.totalTrips} trip(s) · ${rangeLabel(from, to)}`,
      );
      await onRefresh();
      await loadPreview();
    } catch {
      toast("Consolidation failed — check period and filters");
    } finally {
      setConsolidating(false);
    }
  };

  return (
    <div className="card">
      <h2 className="mb-1 text-[15px] font-semibold">Consolidate by period</h2>
      <p className="mb-4 text-xs text-fleet-gray-400">
        Roll all eligible trip invoices in a billing period into one consolidated statement — across every vehicle.
        Pick a month or custom dates, filter the preview, then consolidate. Regenerating creates a new statement (new
        serial); older drafts remain for lookup and the newest sorts to the top.
      </p>

      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fleet-gray-400">Quick periods</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={activePreset === p.id ? "filter-tab filter-tab-active text-xs" : "filter-tab text-xs"}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto]">
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Period from</span>
          <input
            type="date"
            className="field-input"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setActivePreset(null);
            }}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Period to</span>
          <input
            type="date"
            className="field-input"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setActivePreset(null);
            }}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-accent h-[38px] w-full"
            disabled={consolidating || previewLoading || !preview?.invoiceCount}
            onClick={consolidate}
          >
            {consolidating ? "Consolidating…" : "Consolidate period"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Group preview by</span>
          <select className="field-input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as PeriodGroupBy)}>
            {PERIOD_GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Filter class (optional)</span>
          <SearchSelect
            listId="period-class-filter"
            value={clsFilter ? labelFromCls(clsFilter) : ""}
            onChange={(text) => {
              const hit = VEHICLE_CLASSIFICATIONS.find((c) => c.label === text || c.cls === text);
              setClsFilter(hit?.cls ?? "");
            }}
            options={classOptions}
            placeholder="All classes"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Filter by run/route type (optional)</span>
          <SearchSelect
            listId="period-run-route-filter"
            value={runRouteFilter}
            onChange={setRunRouteFilter}
            options={runRouteOptions}
            placeholder="All runs, routes & destinations"
          />
        </label>
      </div>

      {preview && preview.invoiceCount > 0 && (
        <div className="mb-4 rounded-fleet-sm border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-fleet-gray-700">
          <span className="font-medium text-navy">{rangeLabel(from, to)}</span>
          <span className="ml-2 text-fleet-gray-500">
            {preview.invoiceCount} trip invoice(s) · {preview.vehicleCount} vehicle(s) · Subtotal KES {fmtN(preview.net)}{" "}
            · Total KES {fmtN(preview.total)}
          </span>
        </div>
      )}

      <div className="table-wrap mb-4 max-h-80 overflow-y-auto">
        {previewLoading ? (
          <p className="py-8 text-center text-sm text-fleet-gray-400">Loading preview…</p>
        ) : !preview?.invoiceCount ? (
          <p className="py-8 text-center text-sm text-fleet-gray-400">
            No billable trip invoices in this period
            {runRouteFilter || clsFilter ? " for the selected filters" : ""}
          </p>
        ) : groupBy === "vehicle" ? (
          <table className="data-table min-w-[720px] text-xs">
            <thead>
              <tr>
                <th>Date</th>
                <th>Work ticket</th>
                <th>Vehicle</th>
                <th>Class</th>
                <th>Route</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((line) => (
                <tr key={line.id}>
                  <td>{formatEATDisplay(line.tripDate)}</td>
                  <td className="font-mono font-semibold text-[#c41e1e]">{line.serialNo}</td>
                  <td className="font-mono">{line.plate}</td>
                  <td>{normalizeCls(line.cls)}</td>
                  <td>{line.route}</td>
                  <td className="font-mono">{fmtN(line.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-fleet-gray-100">
            {preview.groups.map((group) => (
              <div key={group.key} className="py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-fleet-gray-50"
                  onClick={() => setExpandedGroup((g) => (g === group.key ? null : group.key))}
                >
                  <span className="font-medium text-navy">{group.key}</span>
                  <span className="text-xs text-fleet-gray-500">
                    {group.invoiceCount} trip(s) · KES {fmtN(group.net)}
                  </span>
                </button>
                {expandedGroup === group.key && (
                  <table className="data-table mb-2 text-xs">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ticket</th>
                        <th>Vehicle</th>
                        <th>Route</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{formatEATDisplay(line.tripDate)}</td>
                          <td className="font-mono">{line.serialNo}</td>
                          <td className="font-mono">{line.plate}</td>
                          <td>{line.route}</td>
                          <td className="font-mono">{fmtN(line.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-fleet-gray-100 pt-6">
        <div className="section-header mb-4">
          <div>
            <h3 className="text-[15px] font-semibold">Consolidated by period</h3>
            <p className="text-xs text-fleet-gray-400">
              Period batch statements — newest first · {periodConsolidated.length} total
            </p>
          </div>
        </div>
        <ConsolidatedInvoicesTable
          rows={pagination.paginated}
          loading={loading}
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          from={pagination.from}
          to={pagination.to}
          onPage={pagination.setPage}
          highlightId={highlightId}
          emptyMessage="No period consolidations yet — create one above"
          onView={onView}
          onPrint={onPrint}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
