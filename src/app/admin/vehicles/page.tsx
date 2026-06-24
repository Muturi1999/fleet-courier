"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IconCalendarStats,
  IconCircleCheck,
  IconCircleX,
  IconDownload,
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
import { FormActions, FormField, FormNotice } from "@/components/ui/Modal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { VehicleRecordView } from "@/components/vehicles/VehicleRecordView";
import { ExcelImportButton } from "@/components/import/ExcelImportButton";
import { ExportFormatModal, type ExportFormat } from "@/components/export/ExportFormatModal";
import { clearedFilters, filterVehicles } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { parseVehiclesExcel } from "@/lib/excel-import";
import type { Invoice, LocalDelivery, SafariEntry, ScheduleEntry, Vehicle } from "@/lib/types";
import {
  downloadVehicleListCsv,
  downloadVehicleListXls,
  downloadVehicleTemplateCsv,
  downloadVehicleTemplateXls,
} from "@/lib/vehicle-export";
import {
  VEHICLE_CLASSIFICATIONS,
  clsFromLabel,
  formatPlateInput,
  labelFromCls,
  normalizeCls,
  normalizePlate,
} from "@/lib/vehicle-fleet";
import { fmtN, sumBy } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";
import {
  findVehicleByPlate,
  vehicleAlreadyExistsMessage,
  vehicleSaveFailureMessage,
  vehicleSavedMessage,
  vehicleUpdatedMessage,
} from "@/lib/vehicle-messages";

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
  const { items, loading, create, update, remove, refresh } = useCrud<Vehicle>("vehicles");
  const { items: schedules } = useCrud<ScheduleEntry>("schedules");
  const { items: localDeliveries } = useCrud<LocalDelivery>("local-deliveries");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const { items: invoices } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openView, close } = usePageScreen();

  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyVehicle());
  const [classInput, setClassInput] = useState(labelFromCls("7T"));
  const [exportModal, setExportModal] = useState<"template" | "fleet" | null>(null);
  const [saving, setSaving] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const showFormNotice = (type: "success" | "error", message: string) => {
    setFormNotice({ type, message });
    window.setTimeout(() => setFormNotice(null), 4000);
  };

  const filtered = useMemo(() => filterVehicles(items, filters), [items, filters]);
  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const totals = useMemo(
    () => ({
      count: items.length,
      active: items.filter((v) => v.status === "active").length,
      inactive: items.filter((v) => v.status === "inactive" || v.status === "suspended").length,
      revenue: sumBy(items, (v) => v.total),
    }),
    [items],
  );

  useEffect(() => {
    if (screen.kind === "edit") {
      const v = items.find((x) => x.id === screen.id);
      if (v) {
        setForm({ ...v });
        setClassInput(labelFromCls(v.cls));
        setFormNotice(null);
      }
    } else if (screen.kind === "create") {
      setForm(emptyVehicle());
      setClassInput(labelFromCls("7T"));
      setFormNotice(null);
    }
  }, [screen, items]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    const payload = {
      ...form,
      plate: normalizePlate(form.plate),
      cls: normalizeCls(clsFromLabel(classInput)),
      dests: form.dests.length ? form.dests : ["NAIROBI"],
      runs: Math.max(0, Math.floor(form.runs || 0)),
      days: Math.max(0, Math.floor(form.days || 0)),
      total: Number(form.total) || 0,
    };
    setSaving(true);
    setFormNotice(null);
    try {
      if (screen.kind === "edit") {
        const duplicate = findVehicleByPlate(items, payload.plate, screen.id);
        if (duplicate) {
          showFormNotice("error", vehicleAlreadyExistsMessage());
          return;
        }
        await update(screen.id, payload);
        showFormNotice("success", vehicleUpdatedMessage(payload.plate));
        setFilters(clearedFilters());
        window.setTimeout(() => close(), 900);
        void refresh().catch(() => {});
        return;
      }

      const duplicate = findVehicleByPlate(items, payload.plate);
      if (duplicate) {
        showFormNotice("error", vehicleAlreadyExistsMessage());
        return;
      }
      await create(payload);
      showFormNotice("success", vehicleSavedMessage(payload.plate));
      setFilters(clearedFilters());
      window.setTimeout(() => close(), 900);
      void refresh().catch(() => {});
    } catch (error) {
      showFormNotice("error", vehicleSaveFailureMessage(error, payload.plate));
    } finally {
      setSaving(false);
    }
  };

  const importVehicles = async (file: File) => {
    try {
      const rows = await parseVehiclesExcel(file);
      if (!rows.length) {
        toast("No vehicle rows found — use No., License Plate, Vehicle Classification columns");
        return;
      }
      const res = await fetch("/api/vehicles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Import failed");
      const json = (await res.json()) as { imported?: number; inserted?: number; updated?: number };
      const parts = [
        json.imported != null ? `${json.imported} processed` : null,
        json.inserted != null ? `${json.inserted} new` : null,
        json.updated != null ? `${json.updated} updated` : null,
      ].filter(Boolean);
      toast(`Fleet import complete — ${parts.join(", ")}`);
      await refresh();
    } catch {
      toast("Import failed — use CSV or XLS with RNTL fleet list columns");
    }
  };

  const exportRows = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const da = a.createdAt ?? "";
          const db = b.createdAt ?? "";
          if (da && db) return db.localeCompare(da);
          return a.plate.localeCompare(b.plate);
        })
        .map((v, i) => [i + 1, v.plate, labelFromCls(v.cls)] as [number, string, string]),
    [items],
  );

  const handleExport = (kind: "template" | "fleet", format: ExportFormat) => {
    if (kind === "template") {
      if (format === "csv") downloadVehicleTemplateCsv();
      else void downloadVehicleTemplateXls();
      return;
    }
    if (!exportRows.length) return;
    if (format === "csv") downloadVehicleListCsv("rntl-fleet-list", exportRows);
    else void downloadVehicleListXls("rntl-fleet-list.xls", exportRows);
  };

  const classificationOptions = VEHICLE_CLASSIFICATIONS.map((c) => ({ value: c.label }));

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
          <p className="text-xs text-fleet-gray-400">
            Matches RNTL fleet list format — License Plate and Vehicle Classification (e.g. 7 Tonnes Truck).
          </p>
          <FormField label="License Plate *">
            <input
              className="field-input font-mono uppercase"
              required
              placeholder="KBH 667W"
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: formatPlateInput(e.target.value) })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vehicle Classification *">
              <SearchSelect
                listId="vehicle-classification"
                value={classInput}
                onChange={setClassInput}
                options={classificationOptions}
                placeholder="7 Tonnes Truck"
                required
              />
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
          <details className="rounded-lg border border-fleet-gray-100 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-fleet-gray-500">Optional fields</summary>
            <div className="mt-3 space-y-3">
              <FormField label="Run type">
                <input className="field-input" value={form.runType} onChange={(e) => setForm({ ...form, runType: e.target.value })} />
              </FormField>
              <FormField label="Client">
                <input className="field-input" value={form.client ?? ""} onChange={(e) => setForm({ ...form, client: e.target.value })} />
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
              {screen.kind === "edit" && (
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
              )}
            </div>
          </details>
          {formNotice && <FormNotice type={formNotice.type} message={formNotice.message} />}
          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update vehicle" : "Register vehicle"} saving={saving} />
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
        <ExcelImportButton label="Import CSV/XLS" onImport={importVehicles} />
        <button type="button" className="btn-secondary btn-sm" onClick={() => setExportModal("template")}>
          <IconDownload size={14} /> Export template
        </button>
        {exportRows.length > 0 && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setExportModal("fleet")}>
            <IconDownload size={14} /> Export
          </button>
        )}
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
                    <Badge variant={clsToBadgeVariant(v.cls)}>{normalizeCls(v.cls)}</Badge>
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
                          setClassInput(labelFromCls(v.cls));
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

      <ExportFormatModal
        open={exportModal !== null}
        title={exportModal === "template" ? "Download template" : "Export fleet"}
        onClose={() => setExportModal(null)}
        onConfirm={(format) => {
          if (exportModal) handleExport(exportModal, format);
          setExportModal(null);
        }}
      />
    </>
  );
}
