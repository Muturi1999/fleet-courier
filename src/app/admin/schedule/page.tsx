"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IconCalendarStats,
  IconChartLine,
  IconClockExclamation,
  IconDownload,
  IconEdit,
  IconEye,
  IconListCheck,
  IconPlus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { Badge, clsToBadgeVariant } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { calcBilling } from "@/lib/billing";
import { dateKey, formatEATDisplay } from "@/lib/dates";
import { clearedFilters, filtersAfterSave } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { normalizeListJson } from "@/lib/list-query";
import {
  SCHEDULE_RUN_TYPES,
  canShareSchedule,
  emptyScheduleForm,
  schedulePayload,
  schedulePeriodDisplay,
  shareScheduleEntry,
  syncSchedulePeriod,
} from "@/lib/schedule-form";
import { VEHICLE_CLASSIFICATIONS } from "@/lib/vehicle-fleet";
import type { Invoice, LocalDelivery, Rate, SafariEntry, ScheduleEntry, Vehicle } from "@/lib/types";
import { fmtN, formatRoute } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";
import { ExcelImportButton } from "@/components/import/ExcelImportButton";
import { parseScheduleExcel } from "@/lib/excel-import";

const PAGE = "Schedule entries";

type ScheduleSummary = { count: number; days: number; cost: number; draft: number };

export default function SchedulePage() {
  const { toast } = useToast();
  const { items: vehicles } = useCrud<Vehicle>("vehicles");
  const { items: rates } = useCrud<Rate>("rates");
  const { items: localDeliveries } = useCrud<LocalDelivery>("local-deliveries");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openView, openVehicle, close } = usePageScreen();

  const [tab, setTab] = useState<"all" | "saved" | "draft">("all");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyScheduleForm());
  const [summary, setSummary] = useState<ScheduleSummary>({ count: 0, days: 0, cost: 0, draft: 0 });
  const [viewRecord, setViewRecord] = useState<ScheduleEntry | null>(null);
  const [vehicleSchedules, setVehicleSchedules] = useState<ScheduleEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const effectiveStatus = tab !== "all" ? tab : filters.status || undefined;
  const listKey = JSON.stringify({ filters, tab });
  const {
    items,
    meta,
    loading,
    create,
    update,
    remove,
    fetchOne,
    refreshPage,
    totalPages,
    from,
    to,
  } = usePaginatedList<ScheduleEntry>("schedules", { page, filters, status: effectiveStatus });

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const c of VEHICLE_CLASSIFICATIONS) {
      seen.add(c.cls);
      opts.push({ value: c.cls, label: `${c.cls} · ${c.label}` });
    }
    for (const v of vehicles) {
      if (!v.cls || seen.has(v.cls)) continue;
      seen.add(v.cls);
      opts.push({ value: v.cls, label: v.cls });
    }
    for (const r of rates) {
      if (!r.cls || seen.has(r.cls)) continue;
      seen.add(r.cls);
      opts.push({ value: r.cls, label: r.cls });
    }
    return opts;
  }, [vehicles, rates]);

  const runTypeOptions = useMemo(() => {
    const seen = new Set<string>(SCHEDULE_RUN_TYPES);
    const opts = SCHEDULE_RUN_TYPES.map((r) => ({ value: r, label: r }));
    for (const v of vehicles) {
      const rt = v.runType?.trim();
      if (!rt || seen.has(rt) || rt === "Both") continue;
      seen.add(rt);
      opts.push({ value: rt, label: rt });
    }
    return opts;
  }, [vehicles]);

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    fetch("/api/schedules/summary", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: ScheduleSummary | null) => {
        if (s) setSummary(s);
      })
      .catch(() => {});
  }, [meta.total, tab, filters]);

  useEffect(() => {
    if (screen.kind !== "view" && screen.kind !== "edit") {
      setViewRecord(null);
      return;
    }
    const found = items.find((x) => x.id === screen.id);
    if (found) {
      setViewRecord(found);
      return;
    }
    fetchOne(screen.id).then(setViewRecord);
  }, [screen, items, fetchOne]);

  useEffect(() => {
    if (screen.kind === "edit" && viewRecord) {
      setForm({
        ...viewRecord,
        periodStart: viewRecord.periodStart ?? viewRecord.serviceDate,
        periodEnd: viewRecord.periodEnd ?? viewRecord.periodStart ?? viewRecord.serviceDate,
        month: viewRecord.month || schedulePeriodDisplay(viewRecord),
      });
    } else if (screen.kind === "create") {
      setForm(emptyScheduleForm());
    }
  }, [screen, viewRecord]);

  useEffect(() => {
    if (screen.kind !== "vehicle") {
      setVehicleSchedules([]);
      return;
    }
    const plate = screen.plate;
    fetch(`/api/schedules?all=true&search=${encodeURIComponent(plate)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const parsed = normalizeListJson<ScheduleEntry>(json);
        setVehicleSchedules(parsed.data.filter((e) => e.plate.toUpperCase() === plate.toUpperCase()));
      })
      .catch(() => setVehicleSchedules([]));
  }, [screen]);

  const setRateDays = (rate: number, days: number) => {
    const bill = calcBilling(rate, days);
    setForm((f) => ({ ...f, rate, days, cost: bill.cost, vat: bill.vat, total: bill.total }));
  };

  const syncPlate = (plate: string) => {
    const vehicle = vehicles.find((v) => v.plate.toUpperCase() === plate.trim().toUpperCase());
    setForm((f) => {
      const next = {
        ...f,
        plate: plate.trim().toUpperCase(),
        cls: vehicle?.cls ?? f.cls,
        runType:
          vehicle?.runType && vehicle.runType !== "Both"
            ? vehicle.runType
            : f.runType,
      };
      if (vehicle && f.dest) {
        const rate =
          rates.find((r) => r.route === f.dest && r.cls === vehicle.cls) ??
          rates.find((r) => r.route === f.dest);
        if (rate) {
          const b = calcBilling(rate.rate, f.days);
          return { ...next, rate: rate.rate, cost: b.cost, vat: b.vat, total: b.total };
        }
      }
      return next;
    });
  };

  const syncRoute = (routeName: string) => {
    const vehicleCls = vehicles.find((v) => v.plate === form.plate)?.cls ?? form.cls;
    const rate =
      rates.find((r) => r.route === routeName && (!vehicleCls || r.cls === vehicleCls)) ??
      rates.find((r) => r.route === routeName);
    if (!rate) {
      setForm((f) => ({ ...f, dest: routeName }));
      return;
    }
    const b = calcBilling(rate.rate, form.days);
    setForm((f) => ({
      ...f,
      dest: routeName,
      cls: f.cls || rate.cls,
      rate: rate.rate,
      cost: b.cost,
      vat: b.vat,
      total: b.total,
    }));
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form.plate.trim()) {
      toast("Select or type a vehicle plate");
      return;
    }
    if (!form.dest.trim()) {
      toast("Select or type a destination / route");
      return;
    }
    if (!form.cls.trim()) {
      toast("Class is required");
      return;
    }
    if (!form.runType.trim()) {
      toast("Run type is required");
      return;
    }
    setSaving(true);
    try {
      const body = schedulePayload(form);
      if (screen.kind === "edit") {
        await update(screen.id, body);
        toast("Schedule entry updated");
      } else {
        await create(body);
        toast("Schedule entry created");
      }
      setFilters(filtersAfterSave(body.plate));
      setTab("all");
      await refreshPage();
      close();
    } catch {
      toast("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const importSchedule = async (file: File) => {
    try {
      const rows = await parseScheduleExcel(file);
      if (!rows.length) {
        toast("No schedule rows found — need Plate + Dest/Route columns");
        return;
      }
      const res = await fetch("/api/schedules/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Import failed");
      const json = (await res.json()) as { imported?: number };
      toast(`Imported ${json.imported ?? rows.length} schedule rows`);
      setFilters(clearedFilters());
      setTab("all");
      await refreshPage();
    } catch {
      toast("Import failed — use Excel with Plate, Dest/Route, Rate, Days columns");
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "vehicle") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.plate }]}
        title={`Vehicle record — ${screen.plate}`}
        onBack={close}
      >
        <VehicleRecordView
          plate={screen.plate}
          schedules={vehicleSchedules}
          localDeliveries={localDeliveries}
          safari={safari}
          invoices={invoices}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "view") {
    if (!viewRecord) {
      return (
        <RecordScreen crumbs={[...crumbs, { label: "…" }]} title="Schedule entry" onBack={close}>
          <p className="py-8 text-center text-fleet-gray-400">Loading…</p>
        </RecordScreen>
      );
    }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: viewRecord.plate }]}
        title={`View — ${viewRecord.plate}`}
        onBack={close}
      >
        <div className="card max-w-2xl space-y-3 text-sm">
          <p>
            <span className="text-fleet-gray-400">Vehicle:</span>{" "}
            <span className="font-mono font-semibold">{viewRecord.plate}</span>
          </p>
          <p>
            <span className="text-fleet-gray-400">Class:</span> {viewRecord.cls}
          </p>
          <p>
            <span className="text-fleet-gray-400">Route:</span> {formatRoute(viewRecord.dest)}
          </p>
          <p>
            <span className="text-fleet-gray-400">Run type:</span> {viewRecord.runType}
          </p>
          <p>
            <span className="text-fleet-gray-400">Service date:</span>{" "}
            {formatEATDisplay(viewRecord.serviceDate) || "—"}
          </p>
          <p>
            <span className="text-fleet-gray-400">Period:</span> {schedulePeriodDisplay(viewRecord)}
          </p>
          {(viewRecord.periodStart || viewRecord.periodEnd) && (
            <p>
              <span className="text-fleet-gray-400">Range:</span> {dateKey(viewRecord.periodStart)} →{" "}
              {dateKey(viewRecord.periodEnd)}
            </p>
          )}
          <p>
            <span className="text-fleet-gray-400">Days:</span> {viewRecord.days}
          </p>
          <p>
            <span className="text-fleet-gray-400">Rate:</span>{" "}
            <span className="font-mono">KES {fmtN(viewRecord.rate)}</span>
          </p>
          <p>
            <span className="text-fleet-gray-400">Total:</span>{" "}
            <span className="font-mono font-semibold">KES {fmtN(viewRecord.total)}</span>
          </p>
          <p>
            <span className="text-fleet-gray-400">Status:</span>{" "}
            <Badge variant={viewRecord.status === "draft" ? "draft" : "paid"}>{viewRecord.status}</Badge>
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="btn-accent btn-sm" onClick={() => openEdit(viewRecord.id)}>
              Edit
            </button>
            {canShareSchedule(viewRecord) && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={async () => {
                  const res = await shareScheduleEntry(viewRecord.id);
                  if (!res.ok) {
                    toast("Share failed");
                    return;
                  }
                  toast("Schedule entry marked saved");
                  await refreshPage();
                  close();
                }}
              >
                Share / save
              </button>
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={() => openVehicle(viewRecord.plate)}>
              All vehicle records
            </button>
          </div>
        </div>
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "New entry" }]}
        title={screen.kind === "edit" ? "Edit schedule entry" : "Schedule entry"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-fleet-gray-500">
            Pick vehicle and route from your fleet and rates (or type a custom value). Billing period defaults to
            the current month — same pattern as invoices.
          </p>
          <FormField label="Vehicle plate *">
            <SearchSelect
              listId="sch-vehicle-plates"
              mono
              required
              value={form.plate}
              placeholder={vehicles.length ? "Type or select plate" : "Type plate (no fleet loaded)"}
              options={vehicles.map((v) => ({ value: v.plate, label: `${v.plate} · ${v.cls}` }))}
              onChange={syncPlate}
            />
          </FormField>
          <FormField label="Class *">
            <SearchSelect
              listId="sch-vehicle-class"
              required
              value={form.cls}
              placeholder="Type or select class"
              options={classOptions}
              onChange={(cls) => setForm((f) => ({ ...f, cls }))}
            />
          </FormField>
          <FormField label="Destination / route *" className="sm:col-span-2">
            <SearchSelect
              listId="sch-route-options"
              required
              value={form.dest}
              placeholder={rates.length ? "Type or select from rates" : "Type destination / route"}
              options={rates.map((r) => ({ value: r.route, label: `${r.route} · ${r.cls} · KES ${r.rate}` }))}
              onChange={syncRoute}
            />
          </FormField>
          <FormField label="Run type *">
            <SearchSelect
              listId="sch-run-type"
              required
              value={form.runType}
              placeholder="Morning, Afternoon, or type custom"
              options={runTypeOptions}
              onChange={(runType) => setForm((f) => ({ ...f, runType }))}
            />
          </FormField>
          <FormField label="Service date">
            <input
              type="date"
              className="field-input"
              value={dateKey(form.serviceDate)}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
            />
          </FormField>
          <FormField label="Billing period from">
            <input
              type="date"
              className="field-input"
              required
              value={dateKey(form.periodStart ?? form.serviceDate)}
              onChange={(e) => setForm((f) => ({ ...f, ...syncSchedulePeriod(f, { periodStart: e.target.value }) }))}
            />
          </FormField>
          <FormField label="Billing period to">
            <input
              type="date"
              className="field-input"
              required
              value={dateKey(form.periodEnd ?? form.periodStart ?? form.serviceDate)}
              onChange={(e) => setForm((f) => ({ ...f, ...syncSchedulePeriod(f, { periodEnd: e.target.value }) }))}
            />
          </FormField>
          <FormField label="Billing period" className="sm:col-span-2">
            <input className="field-input bg-fleet-gray-50" readOnly value={form.month} />
          </FormField>
          <FormField label="Rate (KES/day) *">
            <input
              type="number"
              className="field-input"
              required
              min={1}
              value={form.rate}
              onChange={(e) => setRateDays(Number(e.target.value), form.days)}
            />
          </FormField>
          <FormField label="Days *">
            <input
              type="number"
              className="field-input"
              required
              min={1}
              value={form.days}
              onChange={(e) => setRateDays(form.rate, Number(e.target.value))}
            />
          </FormField>
          <FormField label="Status">
            <select
              className="field-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "saved" | "draft" })}
            >
              <option value="saved">saved</option>
              <option value="draft">draft</option>
            </select>
          </FormField>
          <div className="sm:col-span-2 rounded-fleet-md bg-navy p-3 text-xs text-white/80">
            <div className="flex justify-between">
              <span>Net</span>
              <span className="font-mono">KES {fmtN(form.cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT 16%</span>
              <span className="font-mono">KES {fmtN(form.vat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-accent">
              <span>Total</span>
              <span className="font-mono">KES {fmtN(form.total)}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <FormActions
              onCancel={close}
              submitLabel={saving ? "Saving…" : screen.kind === "edit" ? "Update entry" : "Save entry"}
            />
          </div>
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <div className="mb-4">
        <nav className="record-breadcrumbs mb-1" aria-label="Breadcrumb">
          <span className="record-crumb-current">{PAGE}</span>
        </nav>
        <h2 className="text-lg font-semibold text-fleet-gray-800">Schedule entries</h2>
        <p className="text-sm text-fleet-gray-500">
          Log vehicle runs by plate, route, and billing period. Saved entries appear in this table.
        </p>
      </div>

      <MetricsGrid>
        <MetricCard accent="navy" icon={IconListCheck} label="Entries logged" value={String(summary.count)} sub="All schedule rows" />
        <MetricCard accent="teal" icon={IconCalendarStats} label="Total days worked" value={String(summary.days)} sub="Fleet-wide" />
        <MetricCard
          accent="amber"
          icon={IconChartLine}
          label="Est. invoice total"
          value={`${(summary.cost / 1e6).toFixed(2)}M`}
          sub="Excl. VAT · KES"
        />
        <MetricCard accent="red" icon={IconClockExclamation} label="Draft entries" value={String(summary.draft)} sub="Not yet shared" />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: `All (${summary.count})` },
            { key: "saved", label: `Saved (${Math.max(0, summary.count - summary.draft)})` },
            { key: "draft", label: `Draft (${summary.draft})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "filter-tab filter-tab-active" : "filter-tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "runType", "date", "status"]}
        statusKind="schedule"
        resultCount={meta.total}
      >
        <ExcelImportButton label="Import Excel" onImport={importSchedule} />
        <button type="button" className="btn-secondary btn-sm" onClick={() => toast("Exported to CSV")}>
          <IconDownload size={14} /> Export
        </button>
        <span className="filter-bar-actions-spacer" aria-hidden />
        <button type="button" className="btn-accent btn-sm" onClick={() => openCreate()}>
          <IconPlus size={14} /> Schedule entry
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Class</th>
              <th>Route</th>
              <th>Run type</th>
              <th>Service date</th>
              <th>Period</th>
              <th className="text-center">Days</th>
              <th>Rate</th>
              <th>Net</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-fleet-gray-400">
                  No schedule entries yet — click Schedule entry to add one
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono font-semibold">{e.plate}</td>
                  <td>
                    <Badge variant={clsToBadgeVariant(e.cls)}>{e.cls}</Badge>
                  </td>
                  <td className="max-w-[140px] truncate text-xs sm:max-w-none">{formatRoute(e.dest)}</td>
                  <td>
                    <Badge variant={e.runType === "Afternoon" ? "sent" : "approved"}>{e.runType}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-xs text-fleet-gray-500">
                    {formatEATDisplay(e.serviceDate) || "—"}
                  </td>
                  <td className="whitespace-nowrap text-xs text-fleet-gray-500">{schedulePeriodDisplay(e)}</td>
                  <td className="text-center font-semibold">{e.days}</td>
                  <td className="font-mono text-xs">{fmtN(e.rate)}</td>
                  <td className="font-mono">{fmtN(e.cost)}</td>
                  <td className="font-mono font-semibold">{fmtN(e.total)}</td>
                  <td>
                    <Badge variant={e.status === "draft" ? "draft" : "paid"}>{e.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        title="View"
                        onClick={() => openView(e.id)}
                      >
                        <IconEye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        title="Edit"
                        onClick={() => openEdit(e.id)}
                      >
                        <IconEdit size={14} />
                      </button>
                      {canShareSchedule(e) && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          title="Share / mark saved"
                          onClick={async () => {
                            const res = await shareScheduleEntry(e.id);
                            if (!res.ok) {
                              toast("Share failed");
                              return;
                            }
                            await refreshPage();
                            toast(`${e.plate} marked saved`);
                          }}
                        >
                          <IconSend size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-fleet-red"
                        title="Delete"
                        onClick={async () => {
                          if (!confirm(`Delete schedule entry for ${e.plate}?`)) return;
                          await remove(e.id);
                          await refreshPage();
                          toast("Deleted");
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={meta.total} from={from} to={to} onPage={setPage} />
    </>
  );
}
