"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconEdit, IconEye, IconMap2, IconMoon, IconPlus, IconRoute, IconSun, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { calcLocalBilling } from "@/lib/billing";
import { defaultFilters, filterLocalDeliveries, highlightSearch } from "@/lib/filters";
import { formatEATDisplay } from "@/lib/dates";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, LocalDelivery, SafariEntry, ScheduleEntry } from "@/lib/types";
import { shiftOf, sumBy, toNum } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";

const PAGE = "Local deliveries";

const empty = (): Omit<LocalDelivery, "id"> => ({
  reg: "",
  m: 0,
  a: 0,
  total: 0,
  serviceDate: new Date().toISOString().slice(0, 10),
  period: "Apr 2026",
});

export default function LocalDeliveriesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<LocalDelivery>("local-deliveries");
  const { items: schedules } = useCrud<ScheduleEntry>("schedules");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openVehicle, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(defaultFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(empty());

  const filtered = useMemo(() => filterLocalDeliveries(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const metrics = useMemo(() => {
    const morning = sumBy(items, (r) => r.m);
    const afternoon = sumBy(items, (r) => r.a);
    const bothCount = items.filter((r) => toNum(r.m) > 0 && toNum(r.a) > 0).length;
    return {
      vehicles: items.length,
      morning,
      afternoon,
      total: sumBy(items, (r) => r.total),
      bothCount,
    };
  }, [items]);

  const totals = useMemo(() => {
    let tNet = 0, tVat = 0, tGross = 0;
    filtered.forEach((r) => {
      const b = calcLocalBilling(r.m, r.a);
      tNet += b.net; tVat += b.vat; tGross += b.gross;
    });
    return { tNet, tVat, tGross };
  }, [filtered]);

  useEffect(() => {
    if (screen.kind === "edit") {
      const e = items.find((x) => x.id === screen.id);
      if (e) setForm({ ...e });
    } else if (screen.kind === "create") {
      setForm(empty());
    }
  }, [screen, items]);

  const setTrips = (m: number, a: number) => setForm((f) => ({ ...f, m, a, total: m + a }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Entry updated");
        setFilters(highlightSearch(form.reg));
      } else {
        await create(form);
        toast("Local delivery added");
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
        title={`Deliveries — ${screen.plate}`}
        onBack={close}
      >
        <VehicleRecordView
          plate={screen.plate}
          schedules={schedules}
          localDeliveries={items}
          safari={safari}
          invoices={invoices}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "Add entry" }]}
        title={screen.kind === "edit" ? "Edit local delivery" : "Add local delivery"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card max-w-2xl space-y-3">
          <FormField label="Registration *">
            <input className="field-input" required value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value.toUpperCase() })} />
          </FormField>
          <FormField label="Service date">
            <input type="date" className="field-input" value={form.serviceDate ?? ""} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Morning trips">
              <input type="number" min={0} className="field-input" value={form.m} onChange={(e) => setTrips(Number(e.target.value), form.a)} />
            </FormField>
            <FormField label="Afternoon trips">
              <input type="number" min={0} className="field-input" value={form.a} onChange={(e) => setTrips(form.m, Number(e.target.value))} />
            </FormField>
          </div>
          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update entry" : "Save entry"} />
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconMap2} label="Vehicles" value={String(metrics.vehicles)} sub="Nairobi area routes" />
        <MetricCard accent="teal" icon={IconSun} label="Morning trips" value={String(metrics.morning)} sub="KES 8,500 / day (7T)" />
        <MetricCard accent="amber" icon={IconMoon} label="Afternoon trips" value={String(metrics.afternoon)} sub="KES 7,000 / day (7T)" />
        <MetricCard accent="blue" icon={IconRoute} label="Total trips" value={String(metrics.total)} sub={`${metrics.bothCount} vehicles on both shifts`} />
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "shift", "date"]}
        resultCount={filtered.length}
      >
        <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(empty()); openCreate(); }}>
          <IconPlus size={14} /> Add entry
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Registration</th><th>Date</th><th className="text-center">Morning</th><th className="text-center">Afternoon</th><th className="text-center">Total</th><th>Shift</th><th>Invoice total</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">No entries match filters — try &quot;Today&quot; or clear date</td></tr>
            ) : (
              paginated.map((r) => {
                const b = calcLocalBilling(r.m, r.a);
                const s = shiftOf(r);
                return (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold">{r.reg}</td>
                    <td className="text-xs text-fleet-gray-400">{formatEATDisplay(r.serviceDate) || r.period}</td>
                    <td className="text-center font-mono">{r.m || "—"}</td>
                    <td className="text-center font-mono">{r.a || "—"}</td>
                    <td className="text-center font-mono font-bold">{r.total}</td>
                    <td><Badge variant={s === "both" ? "both" : s === "morning" ? "morning" : "afternoon"}>{s}</Badge></td>
                    <td className="font-mono font-semibold text-navy">{b.gross.toLocaleString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => openVehicle(r.reg)} title="All records"><IconEye size={14} /></button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...r }); openEdit(r.id); }}><IconEdit size={14} /></button>
                        <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete?")) { await remove(r.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPage={pagination.setPage} />

      <div className="totals-bar">
        <div>Filtered net: <span className="font-mono font-semibold">KES {totals.tNet.toLocaleString()}</span></div>
        <div>VAT: <span className="font-mono font-semibold text-accent-dark">KES {totals.tVat.toLocaleString()}</span></div>
        <div>Grand: <span className="font-mono font-semibold text-navy">KES {totals.tGross.toLocaleString()}</span></div>
      </div>
    </>
  );
}
