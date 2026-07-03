"use client";

import { FormEvent, useState } from "react";
import { IconEdit, IconPlus, IconTrash, IconUser } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { FeatureGate } from "@/components/admin/FeatureGate";
import type { Driver } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";

const PAGE = "Drivers";

const emptyDriver = (): Omit<Driver, "id"> => ({
  name: "",
  idNumber: "",
  licenseExpiry: "",
  phone: "",
  portalPin: "",
  active: true,
});

export default function DriversPage() {
  return (
    <FeatureGate feature="drivers">
      <DriversPageInner />
    </FeatureGate>
  );
}

function DriversPageInner() {
  const { toast } = useToast();
  const { screen, isList, openCreate, openEdit, close } = usePageScreen();
  const { items, loading, create, update, remove } = useCrud<Driver>("drivers");
  const [form, setForm] = useState(emptyDriver());

  const activeCount = items.filter((d) => d.active).length;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (screen.kind === "create") {
        await create(form);
        toast("Driver added");
      } else if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Driver updated");
      }
      close();
      setForm(emptyDriver());
    } catch (err) {
      toast(saveErrorMessage(err), "error");
    }
  };

  const startEdit = (driver: Driver) => {
    setForm({
      name: driver.name,
      idNumber: driver.idNumber ?? "",
      licenseExpiry: driver.licenseExpiry ?? "",
      phone: driver.phone ?? "",
      portalPin: driver.portalPin ?? "",
      active: driver.active,
    });
    openEdit(driver.id);
  };

  if (!isList) {
    const crumbs = [{ label: PAGE, href: "/admin/drivers" }];
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "create" ? "Add" : "Edit" }]}
        title={screen.kind === "create" ? "Add driver" : "Edit driver"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Full name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="ID number">
            <input
              className="input"
              value={form.idNumber}
              onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
            />
          </FormField>
          <FormField label="License expiry">
            <input
              type="date"
              className="input"
              value={form.licenseExpiry?.slice(0, 10) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone (driver portal)">
            <input className="input" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormField>
          <FormField label="Portal PIN">
            <input className="input" value={form.portalPin ?? ""} onChange={(e) => setForm((f) => ({ ...f, portalPin: e.target.value }))} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-fleet-gray-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
          <FormActions onCancel={close} submitLabel={screen.kind === "create" ? "Add driver" : "Save"} />
        </form>
      </RecordScreen>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fleet-gray-900">{PAGE}</h1>
          <p className="text-sm text-fleet-gray-500">Driver roster for dispatch and trip assignment</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setForm(emptyDriver()); openCreate(); }}>
          <IconPlus size={16} /> Add driver
        </button>
      </div>

      <MetricsGrid>
        <MetricCard accent="navy" label="Total drivers" value={String(items.length)} sub="Registered" icon={IconUser} />
        <MetricCard accent="teal" label="Active" value={String(activeCount)} sub="Available for dispatch" icon={IconUser} />
      </MetricsGrid>

      <div className="table-wrap rounded-fleet border border-fleet-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>ID number</th>
              <th>License expiry</th>
              <th>Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-fleet-gray-400">Loading…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-fleet-gray-400">
                  No drivers yet. Add your first driver to start dispatch testing.
                </td>
              </tr>
            )}
            {items.map((driver) => (
              <tr key={driver.id}>
                <td className="font-medium">{driver.name}</td>
                <td>{driver.idNumber || "—"}</td>
                <td>{driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : "—"}</td>
                <td>
                  <Badge variant={driver.active ? "active" : "inactive"}>
                    {driver.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" onClick={() => startEdit(driver)} title="Edit">
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn text-fleet-red"
                      onClick={async () => {
                        if (!confirm(`Remove ${driver.name}?`)) return;
                        try {
                          await remove(driver.id);
                          toast("Driver removed");
                        } catch (err) {
                          toast(saveErrorMessage(err), "error");
                        }
                      }}
                      title="Delete"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
