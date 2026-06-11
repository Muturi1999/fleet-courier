"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconDownload, IconEdit, IconEye, IconPlus, IconTrash } from "@tabler/icons-react";
import { IconCalendarStats, IconChartLine, IconClockExclamation, IconListCheck } from "@tabler/icons-react";
import { Badge, clsToBadgeVariant } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { calcBilling } from "@/lib/billing";
import { clearedFilters, filterSchedules, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, LocalDelivery, SafariEntry, ScheduleEntry } from "@/lib/types";
import { fmtN, formatRoute } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";

const PAGE = "Schedule entry";

const emptyForm = (): Omit<ScheduleEntry, "id"> => ({
  plate: "",
  cls: "7T",
  dest: "NAIROBI",
  runType: "Morning",
  rate: 8500,
  days: 1,
  cost: 8500,
  vat: 1360,
  total: 9860,
  month: "Mar 2026",
  serviceDate: new Date().toISOString().slice(0, 10),
  status: "saved",
});

export default function SchedulePage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<ScheduleEntry>("schedules");
  const { items: localDeliveries } = useCrud<LocalDelivery>("local-deliveries");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openVehicle, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => filterSchedules(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const totals = useMemo(() => ({
    count: items.length,
    days: items.reduce((s, e) => s + e.days, 0),
    cost: items.reduce((s, e) => s + e.cost, 0),
    draft: items.filter((e) => e.status === "draft").length,
  }), [items]);

  const editEntry = screen.kind === "edit" ? items.find((e) => e.id === screen.id) : null;

  useEffect(() => {
    if (screen.kind === "edit") {
      const e = items.find((x) => x.id === screen.id);
      if (e) setForm({ ...e });
    } else if (screen.kind === "create") {
      setForm(emptyForm());
    }
  }, [screen, items]);

  const setRateDays = (rate: number, days: number) => {
    const bill = calcBilling(rate, days);
    setForm((f) => ({ ...f, rate, days, cost: bill.cost, vat: bill.vat, total: bill.total }));
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Schedule entry updated");
        setFilters(highlightSearch(form.plate));
      } else {
        await create(form);
        toast("Schedule entry created");
        setFilters(highlightSearch(form.plate));
      }
      close();
    } catch {
      toast("Failed to save entry");
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
          schedules={items}
          localDeliveries={localDeliveries}
          safari={safari}
          invoices={invoices}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "view") {
    const viewEntry = items.find((e) => e.id === screen.id);
    if (!viewEntry) { close(); return null; }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: viewEntry.plate }]}
        title={`View — ${viewEntry.plate}`}
        onBack={close}
      >
        <div className="card max-w-2xl space-y-3 text-sm">
          <p><span className="text-fleet-gray-400">Vehicle:</span> <span className="font-mono font-semibold">{viewEntry.plate}</span></p>
          <p><span className="text-fleet-gray-400">Route:</span> {formatRoute(viewEntry.dest)}</p>
          <p><span className="text-fleet-gray-400">Run type:</span> {viewEntry.runType}</p>
          <p><span className="text-fleet-gray-400">Date:</span> {viewEntry.serviceDate ?? viewEntry.month}</p>
          <p><span className="text-fleet-gray-400">Total:</span> <span className="font-mono font-semibold">KES {fmtN(viewEntry.total)}</span></p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="btn-accent btn-sm" onClick={() => { setForm({ ...viewEntry }); openEdit(viewEntry.id); }}>Edit</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openVehicle(viewEntry.plate)}>All vehicle records</button>
          </div>
        </div>
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "Add entry" }]}
        title={screen.kind === "edit" ? "Edit schedule entry" : "Add schedule entry"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Registration *"><input className="field-input" required value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} /></FormField>
          <FormField label="Class *"><select className="field-input" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}><option>7T</option><option>15T</option><option>Canter</option><option>Van</option></select></FormField>
          <FormField label="Destination / route *" className="sm:col-span-2"><input className="field-input" required value={form.dest} onChange={(e) => setForm({ ...form, dest: e.target.value.toUpperCase() })} /></FormField>
          <FormField label="Run type *"><select className="field-input" value={form.runType} onChange={(e) => setForm({ ...form, runType: e.target.value as "Morning" | "Afternoon" })}><option>Morning</option><option>Afternoon</option></select></FormField>
          <FormField label="Service date"><input type="date" className="field-input" value={form.serviceDate ?? ""} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} /></FormField>
          <FormField label="Rate (KES/day) *"><input type="number" className="field-input" required value={form.rate} onChange={(e) => setRateDays(Number(e.target.value), form.days)} /></FormField>
          <FormField label="Days *"><input type="number" className="field-input" required min={1} value={form.days} onChange={(e) => setRateDays(form.rate, Number(e.target.value))} /></FormField>
          <div className="sm:col-span-2 rounded-fleet-md bg-navy p-3 text-xs text-white/80">
            <div className="flex justify-between"><span>Net</span><span className="font-mono">KES {fmtN(form.cost)}</span></div>
            <div className="flex justify-between"><span>VAT 16%</span><span className="font-mono">KES {fmtN(form.vat)}</span></div>
            <div className="flex justify-between font-semibold text-accent"><span>Total</span><span className="font-mono">KES {fmtN(form.total)}</span></div>
          </div>
          <div className="sm:col-span-2"><FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update entry" : "Save entry"} /></div>
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconListCheck} label="Entries logged" value={String(totals.count)} sub="March 2026 schedule" />
        <MetricCard accent="teal" icon={IconCalendarStats} label="Total days worked" value={String(totals.days)} sub="All schedule rows" />
        <MetricCard accent="amber" icon={IconChartLine} label="Est. invoice total" value={`${(totals.cost / 1e6).toFixed(2)}M`} sub="Excl. VAT · KES" />
        <MetricCard accent="red" icon={IconClockExclamation} label="Draft entries" value={String(totals.draft)} sub="Not yet saved" />
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "runType", "date", "status"]}
        statusKind="schedule"
        resultCount={filtered.length}
      >
        <button type="button" className="btn-secondary btn-sm" onClick={() => toast("Exported to CSV")}><IconDownload size={14} /> Export</button>
        <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(emptyForm()); openCreate(); }}><IconPlus size={14} /> Add entry</button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th><th>Class</th><th>Route</th><th>Run type</th><th className="text-center">Days</th>
              <th>Date</th><th>Net</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center text-fleet-gray-400">No entries match filters</td></tr>
            ) : (
              paginated.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono font-semibold">{e.plate}</td>
                  <td><Badge variant={clsToBadgeVariant(e.cls)}>{e.cls}</Badge></td>
                  <td className="max-w-[120px] truncate text-xs sm:max-w-none">{formatRoute(e.dest)}</td>
                  <td><Badge variant={e.runType === "Morning" ? "approved" : "sent"}>{e.runType}</Badge></td>
                  <td className="text-center font-semibold">{e.days}</td>
                  <td className="whitespace-nowrap text-xs text-fleet-gray-400">{e.serviceDate ?? e.month}</td>
                  <td className="font-mono">{fmtN(e.cost)}</td>
                  <td className="font-mono font-semibold">{fmtN(e.total)}</td>
                  <td><Badge variant="paid">{e.status}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openVehicle(e.plate)} title="All records"><IconEye size={14} /></button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...e }); openEdit(e.id); }}><IconEdit size={14} /></button>
                      <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete?")) { await remove(e.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPage={pagination.setPage} />
    </>
  );
}
