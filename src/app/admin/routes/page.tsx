"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconEdit, IconHome, IconMap2, IconPlus, IconRoad, IconStar, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { clearedFilters, filterRoutes, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { RouteRecord } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";

const PAGE = "Routes & destinations";

const emptyRoute = (): Omit<RouteRecord, "id"> => ({
  name: "",
  rate7: 8500,
  rate15: 9000,
  category: "nairobi",
  trips: 0,
  total: 0,
  status: "active",
});

export default function RoutesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<RouteRecord>("routes");
  const { screen, isList, openCreate, openEdit, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [form, setForm] = useState(emptyRoute());

  const filtered = useMemo(() => filterRoutes(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);
  const grandTotal = filtered.reduce((s, d) => s + d.total, 0);
  const maxTotal = Math.max(...filtered.map((d) => d.total), 1);

  const metrics = useMemo(() => {
    const nairobi = items.filter((d) => d.category === "nairobi");
    const upcountry = items.filter((d) => d.category === "upcountry");
    const nairobiRev = nairobi.reduce((s, d) => s + d.total, 0);
    const upcountryRev = upcountry.reduce((s, d) => s + d.total, 0);
    const top = items.reduce<RouteRecord | null>((best, d) => (!best || d.total > best.total ? d : best), null);
    return {
      destinations: items.length,
      nairobiRev,
      nairobiTrips: nairobi.reduce((s, d) => s + d.trips, 0),
      upcountryRev,
      upcountryCount: upcountry.length,
      top,
    };
  }, [items]);

  useEffect(() => {
    if (screen.kind === "edit") {
      const e = items.find((x) => x.id === screen.id);
      if (e) setForm({ ...e });
    } else if (screen.kind === "create") {
      setForm(emptyRoute());
    }
  }, [screen, items]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Route updated");
        setFilters(highlightSearch(form.name));
      } else {
        await create(form);
        toast("Route added");
        setFilters(highlightSearch(form.name));
      }
      close();
    } catch {
      toast("Save failed");
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "Add route" }]}
        title={screen.kind === "edit" ? "Edit route" : "Add route"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card max-w-2xl space-y-3">
          <FormField label="Destination name *">
            <input className="field-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RouteRecord["category"] })}>
                <option value="nairobi">Nairobi</option>
                <option value="upcountry">Upcountry</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RouteRecord["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="7T rate">
              <input type="number" className="field-input" value={form.rate7} onChange={(e) => setForm({ ...form, rate7: Number(e.target.value) })} />
            </FormField>
            <FormField label="15T rate">
              <input type="number" className="field-input" value={form.rate15} onChange={(e) => setForm({ ...form, rate15: Number(e.target.value) })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Trips (Mar)">
              <input type="number" className="field-input" value={form.trips} onChange={(e) => setForm({ ...form, trips: Number(e.target.value) })} />
            </FormField>
            <FormField label="Total revenue">
              <input type="number" className="field-input" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
            </FormField>
          </div>
          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update route" : "Save route"} />
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconMap2} label="Destinations covered" value={String(metrics.destinations)} sub="Across Kenya" />
        <MetricCard accent="teal" icon={IconHome} label="Nairobi revenue" value={`KES ${(metrics.nairobiRev / 1e6).toFixed(2)}M`} sub={`Morning + Afternoon · ${metrics.nairobiTrips} trips`} />
        <MetricCard accent="amber" icon={IconRoad} label="Upcountry revenue" value={`KES ${(metrics.upcountryRev / 1e6).toFixed(2)}M`} sub={`${metrics.upcountryCount} destinations`} />
        <MetricCard accent="red" icon={IconStar} label="Top route" value={metrics.top ? metrics.top.name.split(" ")[0] : "—"} sub={metrics.top ? `KES ${fmtN(metrics.top.total)} · ${metrics.top.trips} trips` : "No data"} />
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "status"]}
        statusKind="route"
        resultCount={filtered.length}
      >
        <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(emptyRoute()); openCreate(); }}>
          <IconPlus size={14} /> Add route
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Destination</th><th>Category</th><th>7T Rate</th><th>15T Rate</th>
              <th className="text-center">Trips</th><th>Revenue</th><th>%</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-fleet-gray-400">No routes match filters</td></tr>
            ) : (
              paginated.map((d) => (
                <tr key={d.id}>
                  <td className="text-xs font-medium capitalize">{d.name.toLowerCase()}</td>
                  <td><Badge variant={d.category === "nairobi" ? "approved" : "sent"}>{d.category}</Badge></td>
                  <td className="font-mono">{d.rate7 ? fmtN(d.rate7) : "—"}</td>
                  <td className="font-mono">{d.rate15 ? fmtN(d.rate15) : "—"}</td>
                  <td className="text-center font-semibold">{d.trips}</td>
                  <td className="font-mono font-semibold">{fmtN(d.total)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-[68px] overflow-hidden rounded bg-fleet-gray-100">
                        <div className="h-full rounded bg-teal" style={{ width: `${Math.round((d.total / maxTotal) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-fleet-gray-400">{grandTotal ? ((d.total / grandTotal) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </td>
                  <td><Badge variant={d.status === "active" ? "active" : "inactive"}>{d.status}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...d }); openEdit(d.id); }}><IconEdit size={14} /></button>
                      <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete route?")) { await remove(d.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
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
