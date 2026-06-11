"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconClock, IconDownload, IconEdit, IconEye, IconFileText, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { InvoiceDocument, printInvoice } from "@/components/invoices/InvoiceDocument";
import { calcBilling } from "@/lib/billing";
import { generateNextInvoiceNumber } from "@/lib/invoice-meta";
import { clearedFilters, filterInvoices, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";
import { usePlateFromUrl } from "@/hooks/usePlateFromUrl";

const PAGE = "Invoices";

const statuses: InvoiceStatus[] = ["draft", "sent", "approved", "paid", "pending", "rejected"];

const emptyInvoice = (existing: Invoice[]): Omit<Invoice, "id"> => ({
  invoiceNo: generateNextInvoiceNumber(existing),
  plate: "",
  cls: "7T",
  route: "NBI COLLECTION",
  days: 1,
  net: 8500,
  vat: 1360,
  total: 9860,
  status: "draft",
  serviceDate: new Date().toISOString().slice(0, 10),
  period: "Mar 2026",
  deliveryNoteNo: "",
});

export default function InvoicesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<Invoice>("invoices");
  const { screen, isList, openCreate, openEdit, openView, close } = usePageScreen();

  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  usePlateFromUrl(setFilters);
  const [form, setForm] = useState(emptyInvoice([]));
  const [printOnOpen, setPrintOnOpen] = useState(false);

  useEffect(() => {
    if (screen.kind === "view" && printOnOpen) {
      setPrintOnOpen(false);
      const t = setTimeout(printInvoice, 150);
      return () => clearTimeout(t);
    }
  }, [screen, printOnOpen]);

  useEffect(() => {
    if (screen.kind === "edit") {
      const inv = items.find((x) => x.id === screen.id);
      if (inv) setForm({ ...inv });
    } else if (screen.kind === "create") {
      setForm(emptyInvoice(items));
    }
  }, [screen, items]);

  const filtered = useMemo(() => filterInvoices(items, filters, tab), [items, filters, tab]);
  const filterKey = JSON.stringify({ filters, tab });
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const totals = useMemo(
    () => ({
      count: items.length,
      paid: items.filter((i) => i.status === "paid").length,
      pending: items.filter((i) => i.status === "pending").length,
      draft: items.filter((i) => i.status === "draft").length,
    }),
    [items],
  );

  const setDaysRate = (rate: number, days: number) => {
    const b = calcBilling(rate, days);
    setForm((f) => ({ ...f, days, net: b.cost, vat: b.vat, total: b.total }));
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Invoice updated");
        setFilters(highlightSearch(form.plate || form.invoiceNo));
      } else {
        await create(form);
        toast("Invoice created");
        setTab("all");
        setFilters(highlightSearch(form.plate || form.invoiceNo));
      }
      close();
    } catch {
      toast("Save failed");
    }
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "view") {
    const viewInvoice = items.find((i) => i.id === screen.id);
    if (!viewInvoice) {
      close();
      return null;
    }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: viewInvoice.invoiceNo }]}
        title={`Invoice ${viewInvoice.invoiceNo}`}
        onBack={close}
      >
        <InvoiceDocument invoice={viewInvoice} onPrint={printInvoice} />
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "New invoice" }]}
        title={screen.kind === "edit" ? "Edit invoice" : "New invoice"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card grid max-w-3xl grid-cols-2 gap-3">
          <FormField label="Invoice No.">
            <input className="field-input bg-fleet-gray-50 font-mono" readOnly value={form.invoiceNo} />
          </FormField>
          <FormField label="Vehicle plate *">
            <input
              className="field-input"
              required
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            />
          </FormField>
          <FormField label="Service date">
            <input
              type="date"
              className="field-input"
              value={form.serviceDate ?? ""}
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
          <FormField label="Billing period">
            <input
              className="field-input"
              placeholder="e.g. NOV 2025"
              value={form.period ?? ""}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
          </FormField>
          <FormField label="D/Note No.">
            <input
              className="field-input"
              value={form.deliveryNoteNo ?? ""}
              onChange={(e) => setForm({ ...form, deliveryNoteNo: e.target.value })}
            />
          </FormField>
          <FormField label="Particulars (route / collection)" className="col-span-2">
            <input className="field-input" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
          </FormField>
          <FormField label="Days">
            <input
              type="number"
              min={1}
              className="field-input"
              value={form.days}
              onChange={(e) => setDaysRate(form.net / Math.max(form.days, 1), Number(e.target.value))}
            />
          </FormField>
          <FormField label="Net (KES)">
            <input
              type="number"
              className="field-input"
              value={form.net}
              onChange={(e) => {
                const net = Number(e.target.value);
                const vat = Math.round(net * 0.16);
                setForm({ ...form, net, vat, total: net + vat });
              }}
            />
          </FormField>
          <div className="col-span-2 text-xs text-fleet-gray-400">
            VAT: KES {form.vat.toLocaleString()} · Total: KES {form.total.toLocaleString()}
          </div>
          <div className="col-span-2">
            <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update invoice" : "Save invoice"} />
          </div>
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconFileText} label="Total invoices" value={String(totals.count)} sub="All statuses" />
        <MetricCard accent="teal" icon={IconFileText} label="Paid" value={String(totals.paid)} sub="Settled invoices" />
        <MetricCard accent="amber" icon={IconClock} label="Pending" value={String(totals.pending)} sub="Awaiting payment" />
        <MetricCard accent="red" icon={IconFileText} label="Draft" value={String(totals.draft)} sub="Not yet sent" />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap gap-2">
        {["all", ...statuses].map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "filter-tab filter-tab-active" : "filter-tab"}
            onClick={() => setTab(s)}
          >
            {s === "all" ? `All (${items.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "date", "status"]}
        statusKind="invoice"
        resultCount={filtered.length}
      >
        <button
          type="button"
          className="btn-accent btn-sm"
          onClick={() => {
            setForm(emptyInvoice(items));
            openCreate();
          }}
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
              <th>Days</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  No invoices match filters
                </td>
              </tr>
            ) : (
              paginated.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono font-medium">{inv.invoiceNo}</td>
                  <td className="font-mono">{inv.plate}</td>
                  <td>
                    <Badge variant="draft">{inv.cls}</Badge>
                  </td>
                  <td className="text-xs">{inv.route}</td>
                  <td className="text-xs text-fleet-gray-400">{inv.serviceDate ?? inv.period}</td>
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

      <Pagination {...pagination} onPage={pagination.setPage} />
    </>
  );
}
