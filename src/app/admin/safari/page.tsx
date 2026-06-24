"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconAlertCircle, IconEdit, IconEye, IconListCheck, IconPlus, IconRoad, IconTrash, IconTrophy } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { clearedFilters, filterSafari, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, LocalDelivery, SafariEntry, SafariFlag, ScheduleEntry } from "@/lib/types";
import { sumBy, toNum } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";

const PAGE = "Safari / upcountry";

const emptySafari = (): Omit<SafariEntry, "id"> => ({
  reg: "",
  total: 1,
  flag: "",
  dest: "",
  serviceDate: new Date().toISOString().slice(0, 10),
  period: "Apr 2026",
});

export default function SafariPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<SafariEntry>("safari");
  const { items: schedules } = useCrud<ScheduleEntry>("schedules");
  const { items: localDeliveries } = useCrud<LocalDelivery>("local-deliveries");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openVehicle, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptySafari());

  const filtered = useMemo(() => filterSafari(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const metrics = useMemo(() => {
    const tripTotal = sumBy(items, (r) => r.total);
    const top = items.reduce<SafariEntry | null>(
      (best, r) => (!best || toNum(r.total) > toNum(best.total) ? r : best),
      null,
    );
    const flagged = items.filter((r) => r.flag === "VERIFY").length;
    return { tripTotal, entries: items.length, top, flagged };
  }, [items]);

  useEffect(() => {
    if (screen.kind === "edit") {
      const e = items.find((x) => x.id === screen.id);
      if (e) setForm({ ...e });
    } else if (screen.kind === "create") {
      setForm(emptySafari());
    }
  }, [screen, items]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Safari entry updated");
        setFilters(highlightSearch(form.reg));
      } else {
        await create(form);
        toast("Safari entry added");
        setFilters(highlightSearch(form.reg));
      }
      close();
    } catch (error) {
      toast(saveErrorMessage(error));
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "vehicle") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.plate }]}
        title={`Safari record — ${screen.plate}`}
        onBack={close}
      >
        <VehicleRecordView
          plate={screen.plate}
          schedules={schedules}
          localDeliveries={localDeliveries}
          safari={items}
          invoices={invoices}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "Add entry" }]}
        title={screen.kind === "edit" ? "Edit safari entry" : "Add safari / upcountry entry"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card max-w-2xl space-y-3">
          <FormField label="Registration *">
            <input className="field-input" required value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value.toUpperCase() })} />
          </FormField>
          <FormField label="Service date">
            <input type="date" className="field-input" value={form.serviceDate ?? ""} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
          </FormField>
          <FormField label="Total trips *">
            <input type="number" min={1} required className="field-input" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
          </FormField>
          <FormField label="Flag">
            <select className="field-input" value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value as SafariFlag })}>
              <option value="">None</option>
              <option value="VERIFY">VERIFY</option>
              <option value="DAY">DAY</option>
            </select>
          </FormField>
          <FormField label="Destinations breakdown *">
            <textarea className="field-input min-h-[80px]" required placeholder="Kisumu (5); Mombasa (2)" value={form.dest} onChange={(e) => setForm({ ...form, dest: e.target.value })} />
          </FormField>
          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update entry" : "Save entry"} />
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconRoad} label="Safari trips" value={String(metrics.tripTotal)} sub={`Across ${metrics.entries} vehicles`} />
        <MetricCard accent="teal" icon={IconListCheck} label="Entries" value={String(metrics.entries)} sub="April 2026 logbook" />
        <MetricCard accent="amber" icon={IconTrophy} label="Top vehicle" value={metrics.top ? String(metrics.top.total) : "—"} sub={metrics.top ? `${metrics.top.reg} — ${metrics.top.total} trips` : "No data"} />
        <MetricCard accent="red" icon={IconAlertCircle} label="Flagged" value={String(metrics.flagged)} sub="Verify before invoicing" />
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "date"]}
        resultCount={filtered.length}
      >
        <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(emptySafari()); openCreate(); }}>
          <IconPlus size={14} /> Add entry
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Registration</th><th>Date</th><th className="text-center">Trips</th><th>Destinations</th><th>Flag</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-fleet-gray-400">No entries match filters — try &quot;Today&quot; or clear date</td></tr>
            ) : (
              paginated.map((r) => (
                <tr key={r.id} className={r.flag === "VERIFY" ? "[&>td]:!bg-[#FFFBEB]" : ""}>
                  <td className="font-mono font-bold">{r.reg}</td>
                  <td className="text-xs text-fleet-gray-400">{r.serviceDate ?? r.period}</td>
                  <td className="text-center font-mono text-lg font-bold text-navy">{r.total}</td>
                  <td className="max-w-md text-xs">{r.dest}</td>
                  <td>{r.flag ? <Badge variant={r.flag === "VERIFY" ? "flag" : "both"}>{r.flag}</Badge> : "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openVehicle(r.reg)} title="All records"><IconEye size={14} /></button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...r }); openEdit(r.id); }}><IconEdit size={14} /></button>
                      <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete?")) { await remove(r.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
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
