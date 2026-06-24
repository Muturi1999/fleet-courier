"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconClock, IconDownload, IconEdit, IconEye, IconFileText, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { InvoiceDocument, printInvoice } from "@/components/invoices/InvoiceDocument";
import { InvoiceCreateWizard } from "@/components/invoices/InvoiceCreateWizard";
import { ApprovalWorkflowCard } from "@/components/invoices/ApprovalWorkflowCard";
import { EtimsValidationPanel } from "@/components/invoices/EtimsValidationPanel";
import { calcBilling } from "@/lib/billing";
import { clearedFilters, filtersAfterSave } from "@/lib/filters";
import { dateKey, formatEATDisplay } from "@/lib/dates";
import { emptyInvoiceForm, invoiceCreatePayload, syncBillingPeriod } from "@/lib/invoice-form";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, InvoiceStatus, Rate, Vehicle } from "@/lib/types";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import { ExcelImportButton } from "@/components/import/ExcelImportButton";
import { parseInvoicesExcel } from "@/lib/excel-import";

const PAGE = "Invoices";

const statuses: InvoiceStatus[] = ["draft", "sent", "approved", "paid", "pending", "rejected"];

type InvoiceSummary = {
  total: number;
  paid: number;
  pending: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const { items: vehicles } = useCrud<Vehicle>("vehicles");
  const { items: rates } = useCrud<Rate>("rates");
  const { profile, loading: profileLoading, save: saveProfile } = useBillingProfile();
  const { screen, isList, openCreate, openEdit, openView, close } = usePageScreen();

  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyInvoiceForm([]));
  const [dayRate, setDayRate] = useState(8500);
  const [printOnOpen, setPrintOnOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<InvoiceSummary>({
    total: 0,
    paid: 0,
    pending: 0,
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
  });
  const [viewRecord, setViewRecord] = useState<Invoice | null>(null);

  const effectiveStatus = tab !== "all" ? tab : filters.status || undefined;
  const listKey = JSON.stringify({ filters, tab });
  const {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    create,
    update,
    remove,
    totalPages,
    from,
    to,
  } = usePaginatedList<Invoice>("invoices", { page, filters, status: effectiveStatus });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    fetch("/api/invoices/summary", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: InvoiceSummary | null) => {
        if (s) setSummary(s);
      })
      .catch(() => {});
  }, [items.length, tab, filters]);

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
    fetchOne(screen.id).then((row) => setViewRecord(row));
  }, [screen, items, fetchOne]);

  useEffect(() => {
    if (screen.kind === "view" && printOnOpen) {
      setPrintOnOpen(false);
      const t = setTimeout(printInvoice, 150);
      return () => clearTimeout(t);
    }
  }, [screen, printOnOpen]);

  useEffect(() => {
    if (screen.kind === "edit" && viewRecord) {
      setForm({ ...viewRecord });
      setDayRate(viewRecord.days > 0 ? Math.round(viewRecord.net / viewRecord.days) : 8500);
    } else if (screen.kind === "create") {
      fetch("/api/invoices/next-number", { cache: "no-store", credentials: "same-origin" })
        .then((r) => r.json())
        .then((no) => {
          const blank = emptyInvoiceForm([]);
          setForm({ ...blank, invoiceNo: String(no) });
          setDayRate(8500);
        })
        .catch(() => {
          setForm(emptyInvoiceForm([]));
          setDayRate(8500);
        });
    }
  }, [screen, viewRecord]);

  const syncPlate = (plate: string) => {
    const vehicle = vehicles.find((v) => v.plate.toUpperCase() === plate.trim().toUpperCase());
    setForm((f) => {
      const next = { ...f, plate: plate.trim().toUpperCase(), cls: vehicle?.cls ?? f.cls };
      if (vehicle && f.route) {
        const rate = rates.find((r) => r.route === f.route && r.cls === vehicle.cls) ?? rates.find((r) => r.route === f.route);
        if (rate) {
          const b = calcBilling(rate.rate, f.days);
          setDayRate(rate.rate);
          return { ...next, net: b.cost, vat: b.vat, total: b.total };
        }
      }
      return next;
    });
  };

  const syncRoute = (routeName: string) => {
    const vehicleCls = vehicles.find((v) => v.plate === form.plate)?.cls;
    const rate =
      rates.find((r) => r.route === routeName && (!vehicleCls || r.cls === vehicleCls)) ??
      rates.find((r) => r.route === routeName);
    if (!rate) {
      setForm((f) => ({ ...f, route: routeName }));
      return;
    }
    const b = calcBilling(rate.rate, form.days);
    setDayRate(rate.rate);
    setForm((f) => ({ ...f, route: routeName, cls: vehicleCls ?? rate.cls, net: b.cost, vat: b.vat, total: b.total }));
  };

  const setRateDays = (rate: number, days: number) => {
    const b = calcBilling(rate, days);
    setDayRate(rate);
    setForm((f) => ({ ...f, days, net: b.cost, vat: b.vat, total: b.total }));
  };

  const onEditSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (screen.kind !== "edit") return;
    try {
      await update(screen.id, invoiceCreatePayload(form, form.status));
      toast("Invoice updated");
      setFilters(filtersAfterSave(form.plate || form.invoiceNo));
      close();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleCreateSave = async (status: InvoiceStatus) => {
    setSaving(true);
    try {
      const payload = invoiceCreatePayload(form, status);
      const created = await create(payload as Omit<Invoice, "id">);
      toast(status === "draft" ? "Invoice saved as draft" : "Invoice created and sent to G4S");
      setTab("all");
      setFilters(filtersAfterSave(created.plate || created.invoiceNo || form.plate || form.invoiceNo));
      close();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const importInvoices = async (file: File) => {
    try {
      const rows = await parseInvoicesExcel(file);
      if (!rows.length) {
        toast("No invoice rows found — check column headers");
        return;
      }
      const res = await fetch("/api/invoices/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Import failed");
      const json = (await res.json()) as { imported?: number };
      toast(`Imported ${json.imported ?? rows.length} invoices`);
      await refreshPage();
    } catch {
      toast("Import failed — use Excel with Invoice #, Plate, Route, Net, Total columns");
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "view") {
    if (!viewRecord) {
      return (
        <RecordScreen crumbs={[...crumbs, { label: "…" }]} title="Invoice" onBack={close}>
          <p className="py-8 text-center text-fleet-gray-400">Loading…</p>
        </RecordScreen>
      );
    }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: viewRecord.invoiceNo }]}
        title={`Invoice ${viewRecord.invoiceNo}`}
        onBack={close}
      >
        <InvoiceDocument invoice={viewRecord} profile={profile ?? undefined} onPrint={printInvoice} />
        <EtimsValidationPanel invoiceId={viewRecord.id} invoiceNo={viewRecord.invoiceNo} />
      </RecordScreen>
    );
  }

  if (screen.kind === "create") {
    return (
      <RecordScreen crumbs={[...crumbs, { label: "New invoice" }]} title="New invoice" onBack={close}>
        <InvoiceCreateWizard
          key={form.invoiceNo}
          form={form}
          setForm={setForm}
          dayRate={dayRate}
          setDayRate={setDayRate}
          vehicles={vehicles}
          rates={rates}
          profile={profile}
          profileLoading={profileLoading}
          onSaveProfile={saveProfile}
          onCancel={close}
          onSave={handleCreateSave}
          saving={saving}
        />
      </RecordScreen>
    );
  }

  if (screen.kind === "edit") {
    return (
      <RecordScreen crumbs={[...crumbs, { label: "Edit" }]} title="Edit invoice" onBack={close}>
        <form onSubmit={onEditSubmit} className="card grid max-w-3xl grid-cols-2 gap-3">
          <FormField label="Invoice No.">
            <input className="field-input bg-fleet-gray-50 font-mono" readOnly value={form.invoiceNo} />
          </FormField>
          <FormField label="Vehicle plate *">
            <SearchSelect
              listId="inv-edit-plates"
              mono
              required
              value={form.plate}
              options={vehicles.map((v) => ({ value: v.plate, label: `${v.plate} · ${v.cls}` }))}
              onChange={syncPlate}
            />
          </FormField>
          <FormField label="Vehicle class (tonnes) *">
            <input className="field-input bg-fleet-gray-50 font-mono" readOnly value={form.cls} />
          </FormField>
          <FormField label="Service date">
            <input
              type="date"
              className="field-input"
              value={dateKey(form.serviceDate)}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className="field-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Billing period from">
            <input
              type="date"
              className="field-input"
              value={dateKey(form.periodStart ?? form.serviceDate)}
              onChange={(e) => setForm((f) => ({ ...f, ...syncBillingPeriod(f, { periodStart: e.target.value }) }))}
            />
          </FormField>
          <FormField label="Billing period to">
            <input
              type="date"
              className="field-input"
              value={dateKey(form.periodEnd ?? form.periodStart ?? form.serviceDate)}
              onChange={(e) => setForm((f) => ({ ...f, ...syncBillingPeriod(f, { periodEnd: e.target.value }) }))}
            />
          </FormField>
          <div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="D/Note No.">
              <input
                className="field-input"
                placeholder="Delivery note number"
                value={form.deliveryNoteNo ?? ""}
                onChange={(e) => setForm({ ...form, deliveryNoteNo: e.target.value })}
              />
            </FormField>
            <FormField label="Billing period">
              <input className="field-input bg-fleet-gray-50 text-right" readOnly value={form.period ?? ""} />
            </FormField>
          </div>
          <FormField label="Particulars (route / collection)" className="col-span-2">
            <SearchSelect
              listId="inv-edit-routes"
              value={form.route}
              options={rates.map((r) => ({ value: r.route, label: `${r.route} · ${r.cls} · KES ${r.rate}` }))}
              onChange={syncRoute}
            />
          </FormField>
          <FormField label="Daily rate (KES) *">
            <input
              type="number"
              min={1}
              className="field-input"
              value={dayRate}
              onChange={(e) => setRateDays(Number(e.target.value), form.days)}
            />
          </FormField>
          <FormField label="Days/Trip *">
            <input
              type="number"
              min={1}
              className="field-input"
              value={form.days}
              onChange={(e) => setRateDays(dayRate, Number(e.target.value))}
            />
          </FormField>
          <FormField label="Net (KES) — excl. VAT">
            <input
              type="number"
              className="field-input"
              value={form.net}
              onChange={(e) => {
                const net = Number(e.target.value);
                const vat = Math.round(net * 0.16);
                setForm({ ...form, net, vat, total: net + vat });
                setDayRate(form.days > 0 ? Math.round(net / form.days) : dayRate);
              }}
            />
          </FormField>
          <div className="col-span-2 rounded-fleet-md bg-navy p-3 text-xs text-white/80">
            <div className="flex justify-between">
              <span>Net (excl. VAT)</span>
              <span className="font-mono">KES {form.net.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT @ 16%</span>
              <span className="font-mono">KES {form.vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-accent">
              <span>Total incl. VAT</span>
              <span className="font-mono">KES {form.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="col-span-2">
            <FormActions onCancel={close} submitLabel="Update invoice" />
          </div>
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <ApprovalWorkflowCard />

      <MetricsGrid>
        <MetricCard accent="navy" icon={IconFileText} label="Total invoices" value={String(summary.total)} sub="All statuses" />
        <MetricCard accent="teal" icon={IconFileText} label="Paid" value={String(summary.paid)} sub="Settled invoices" />
        <MetricCard accent="amber" icon={IconClock} label="Pending" value={String(summary.pending)} sub="Awaiting payment" />
        <MetricCard accent="red" icon={IconFileText} label="Draft" value={String(summary.draft)} sub="Not yet sent" />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap gap-2">
        {["all", ...statuses].map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "filter-tab filter-tab-active" : "filter-tab"}
            onClick={() => setTab(s)}
          >
            {s === "all"
              ? `All (${summary.total})`
              : `${s.charAt(0).toUpperCase() + s.slice(1)} (${(summary as Record<string, number>)[s] ?? 0})`}
          </button>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "date", "status"]}
        statusKind="invoice"
        resultCount={meta.total}
      >
        <ExcelImportButton label="Import Excel" onImport={importInvoices} />
        <button
          type="button"
          className="btn-accent btn-sm"
          onClick={() => openCreate()}
        >
          <IconPlus size={14} /> New invoice
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Vehicle</th>
              <th>Class</th>
              <th>Route</th>
              <th>Date</th>
              <th>Period</th>
              <th>Days/Trip</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-fleet-gray-400">
                  No invoices match filters
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono font-medium">{inv.invoiceNo}</td>
                  <td className="font-mono">{inv.plate}</td>
                  <td>
                    <Badge variant="draft">{inv.cls}</Badge>
                  </td>
                  <td className="text-xs">{inv.route}</td>
                  <td className="whitespace-nowrap text-xs">{formatEATDisplay(inv.serviceDate) || "—"}</td>
                  <td className="text-xs text-fleet-gray-500">{inv.period || "—"}</td>
                  <td className="text-center">{inv.days}</td>
                  <td className="font-mono font-medium">{inv.total.toLocaleString()}</td>
                  <td>
                    <Badge variant={inv.status}>{inv.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openView(inv.id)}>
                        <IconEye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setForm({ ...inv });
                          openEdit(inv.id);
                        }}
                      >
                        <IconEdit size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setPrintOnOpen(true);
                          openView(inv.id);
                        }}
                      >
                        <IconDownload size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-fleet-red"
                        onClick={async () => {
                          if (confirm("Delete?")) {
                            await remove(inv.id);
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

      <Pagination page={page} totalPages={totalPages} total={meta.total} from={from} to={to} onPage={setPage} />
    </>
  );
}
