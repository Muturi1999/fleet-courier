"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IconCalendarStats,
  IconCircleCheck,
  IconCircleX,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
  IconTruck,
} from "@tabler/icons-react";
import { Badge, clsToBadgeVariant } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { clearedFilters, filterVehicles, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, LocalDelivery, SafariEntry, ScheduleEntry, Vehicle } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";

const PAGE = "Vehicles";

const emptyVehicle = (): Omit<Vehicle, "id"> => ({
  plate: "",
  cls: "7T",
  runType: "Nairobi",
  runs: 0,
  days: 0,
  total: 0,
  dests: ["NAIROBI"],
  status: "active",
  client: "G4S Kenya",
});

export default function VehiclesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<Vehicle>("vehicles");
  const { items: schedules } = useCrud<ScheduleEntry>("schedules");
  const { items: localDeliveries } = useCrud<LocalDelivery>("local-deliveries");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openView, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyVehicle());

  const filtered = useMemo(() => filterVehicles(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const totals = useMemo(
    () => ({
      count: items.length,
      active: items.filter((v) => v.status === "active").length,
      inactive: items.filter((v) => v.status === "inactive" || v.status === "suspended").length,
      revenue: items.reduce((s, v) => s + v.total, 0),
    }),
    [items],
  );

  useEffect(() => {
    if (screen.kind === "edit") {
      const v = items.find((x) => x.id === screen.id);
      if (v) setForm({ ...v });
    } else if (screen.kind === "create") {
      setForm(emptyVehicle());
    }
  }, [screen, items]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const payload = { ...form, dests: form.dests.length ? form.dests : ["NAIROBI"] };
    try {
      if (screen.kind === "edit") {
        await update(screen.id, payload);
        toast("Vehicle updated");
        setFilters(highlightSearch(form.plate));
      } else {
        await create(payload);
        toast("Vehicle registered");
        setFilters(highlightSearch(form.plate));
      }
      close();
    } catch {
      toast("Save failed");
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "view") {
    const viewVehicle = items.find((v) => v.id === screen.id);
    if (!viewVehicle) {
      close();
      return null;
    }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: viewVehicle.plate }]}
        title={`Vehicle — ${viewVehicle.plate}`}
        onBack={close}
      >
        <VehicleRecordView
          plate={viewVehicle.plate}
          vehicle={viewVehicle}
          schedules={schedules}
          localDeliveries={localDeliveries}
          safari={safari}
          invoices={invoices}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "Register" }]}
        title={screen.kind === "edit" ? "Edit vehicle" : "Register vehicle"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card max-w-3xl space-y-3">
          <FormField label="Plate *">
            <input
              className="field-input"
              required
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Class">
              <select className="field-input" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
                <option>7T</option>
                <option>15T</option>
                <option>CANTER</option>
                <option>VAN</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle["status"] })}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </select>
            </FormField>
          </div>
          <FormField label="Run type">
            <input className="field-input" value={form.runType} onChange={(e) => setForm({ ...form, runType: e.target.value })} />
          </FormField>
          <FormField label="Destinations (comma-separated)">
            <input
              className="field-input"
              value={form.dests.join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  dests: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Runs">
              <input
                type="number"
                className="field-input"
                value={form.runs}
                onChange={(e) => setForm({ ...form, runs: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Days">
              <input
                type="number"
                className="field-input"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Revenue">
              <input
                type="number"
                className="field-input"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update vehicle" : "Register vehicle"} />
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconTruck} label="Total vehicles" value={String(totals.count)} sub="All classes" />
        <MetricCard accent="teal" icon={IconCircleCheck} label="Active" value={String(totals.active)} sub="On contract" />
        <MetricCard accent="red" icon={IconCircleX} label="Inactive" value={String(totals.inactive)} sub="Inactive / suspended" />
        <MetricCard
          accent="amber"
          icon={IconCalendarStats}
          label="Fleet revenue"
          value={`${(totals.revenue / 1e6).toFixed(2)}M`}
          sub="KES · all vehicles"
        />
      </MetricsGrid>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "runType", "status"]}
        statusKind="vehicle"
        resultCount={filtered.length}
      >
        <button
          type="button"
          className="btn-accent btn-sm"
          onClick={() => {
            setForm(emptyVehicle());
            openCreate();
          }}
        >
          <IconPlus size={14} /> Add vehicle
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plate</th>
              <th>Class</th>
              <th>Run type</th>
              <th className="text-center">Runs</th>
              <th className="text-center">Days</th>
              <th>Revenue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fleet-gray-400">
                  No vehicles match filters
                </td>
              </tr>
            ) : (
              paginated.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono font-semibold">{v.plate}</td>
                  <td>
                    <Badge variant={clsToBadgeVariant(v.cls)}>{v.cls}</Badge>
                  </td>
                  <td className="text-xs">{v.runType}</td>
                  <td className="text-center font-mono">{v.runs}</td>
                  <td className="text-center font-mono">{v.days}</td>
                  <td className="font-mono font-semibold text-navy">{fmtN(v.total)}</td>
                  <td>
                    <Badge variant={v.status === "active" ? "active" : "inactive"}>{v.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openView(v.id)}>
                        <IconEye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setForm({ ...v });
                          openEdit(v.id);
                        }}
                      >
                        <IconEdit size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-fleet-red"
                        onClick={async () => {
                          if (confirm("Delete?")) {
                            await remove(v.id);
                            toast("Deleted");
                          }
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

      <Pagination {...pagination} onPage={pagination.setPage} />
    </>
  );
}
