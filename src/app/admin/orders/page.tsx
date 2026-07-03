"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { FeatureGate } from "@/components/admin/FeatureGate";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { TransportOrder } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";

const PAGE = "Orders";

const emptyOrder = (): Omit<TransportOrder, "id" | "status"> => ({
  orderNo: "",
  customerName: "",
  customerPhone: "",
  pickupAddress: "",
  deliveryAddress: "",
  routeHint: "",
  pickupAt: "",
  cargoDescription: "",
  weightKg: 0,
  quotedAmount: 0,
  notes: "",
});

function statusVariant(s: string) {
  if (s === "delivered") return "approved" as const;
  if (s === "cancelled") return "rejected" as const;
  if (s === "in_transit") return "sent" as const;
  return "pending" as const;
}

export default function OrdersPage() {
  return (
    <FeatureGate feature="orders">
      <OrdersPageInner />
    </FeatureGate>
  );
}

function OrdersPageInner() {
  const { toast } = useToast();
  const { screen, isList, openCreate, openEdit, close } = usePageScreen();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [form, setForm] = useState(emptyOrder());

  const listKey = JSON.stringify(filters);
  const { items, meta, loading, create, update, remove, totalPages, from, to } = usePaginatedList<TransportOrder>(
    "orders",
    { page, filters },
  );

  useEffect(() => setPage(1), [listKey]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        routeHint: form.routeHint,
        pickupAt: form.pickupAt || undefined,
        cargoDescription: form.cargoDescription,
        weightKg: form.weightKg || undefined,
        quotedAmount: form.quotedAmount || undefined,
        notes: form.notes,
      };
      if (screen.kind === "create") {
        await create(payload as Omit<TransportOrder, "id">);
        toast("Order created");
      } else if (screen.kind === "edit") {
        await update(screen.id, payload);
        toast("Order updated");
      }
      close();
      setForm(emptyOrder());
    } catch (err) {
      toast(saveErrorMessage(err), "error");
    }
  };

  const startEdit = (o: TransportOrder) => {
    setForm({
      orderNo: o.orderNo,
      customerName: o.customerName,
      customerPhone: o.customerPhone ?? "",
      pickupAddress: o.pickupAddress,
      deliveryAddress: o.deliveryAddress,
      routeHint: o.routeHint ?? "",
      pickupAt: o.pickupAt?.slice(0, 16) ?? "",
      cargoDescription: o.cargoDescription ?? "",
      weightKg: o.weightKg ?? 0,
      quotedAmount: o.quotedAmount ?? 0,
      notes: o.notes ?? "",
    });
    openEdit(o.id);
  };

  if (!isList) {
    const crumbs = [{ label: PAGE, href: "/admin/orders" }];
    return (
      <RecordScreen crumbs={[...crumbs, { label: screen.kind === "create" ? "New" : "Edit" }]} title={screen.kind === "create" ? "New order" : "Edit order"} onBack={close}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Customer name" className="sm:col-span-2">
            <input className="input" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
          </FormField>
          <FormField label="Route hint">
            <input className="input" value={form.routeHint} onChange={(e) => setForm((f) => ({ ...f, routeHint: e.target.value }))} />
          </FormField>
          <FormField label="Pickup address" className="sm:col-span-2">
            <input className="input" value={form.pickupAddress} onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))} />
          </FormField>
          <FormField label="Delivery address" className="sm:col-span-2">
            <input className="input" value={form.deliveryAddress} onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))} />
          </FormField>
          <FormField label="Pickup time">
            <input type="datetime-local" className="input" value={form.pickupAt} onChange={(e) => setForm((f) => ({ ...f, pickupAt: e.target.value }))} />
          </FormField>
          <FormField label="Quoted amount (KES)">
            <input type="number" className="input" value={form.quotedAmount || ""} onChange={(e) => setForm((f) => ({ ...f, quotedAmount: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Cargo" className="sm:col-span-2">
            <textarea className="input min-h-[80px]" value={form.cargoDescription} onChange={(e) => setForm((f) => ({ ...f, cargoDescription: e.target.value }))} />
          </FormField>
          <div className="sm:col-span-2">
            <FormActions onCancel={close} submitLabel={screen.kind === "create" ? "Create order" : "Save"} />
          </div>
        </form>
      </RecordScreen>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fleet-gray-900">{PAGE}</h1>
          <p className="text-sm text-fleet-gray-500">Transport orders — book, assign, deliver, invoice</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setForm(emptyOrder()); openCreate(); }}>
          <IconPlus size={16} /> New order
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} fields={["search", "status"]} statusKind="invoice" />

      <div className="table-wrap rounded-fleet border border-fleet-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-8 text-center text-sm text-fleet-gray-400">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-fleet-gray-400">No orders yet</td></tr>}
            {items.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-sm">{o.orderNo}</td>
                <td>{o.customerName}</td>
                <td className="max-w-[200px] truncate text-sm">{o.routeHint ?? `${o.pickupAddress} → ${o.deliveryAddress}`}</td>
                <td>{o.quotedAmount ? fmtN(o.quotedAmount) : "—"}</td>
                <td><Badge variant={statusVariant(o.status)}>{o.status}</Badge></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" onClick={() => startEdit(o)}><IconEdit size={16} /></button>
                    <button type="button" className="icon-btn text-fleet-red" onClick={async () => { if (confirm("Delete order?")) { await remove(o.id); toast("Deleted"); } }}><IconTrash size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} from={from} to={to} total={meta.total} onPage={setPage} />
    </div>
  );
}
