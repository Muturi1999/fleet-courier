"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconEdit, IconPlus, IconReceipt, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";

const PAGE = "Expenses";
const CATEGORIES: ExpenseCategory[] = ["fuel", "maintenance", "insurance", "salaries", "tolls", "other"];

const emptyExpense = (): Omit<Expense, "id"> => ({
  date: new Date().toISOString().slice(0, 10),
  category: "fuel",
  description: "",
  amount: 0,
  vehiclePlate: "",
  month: "Mar 2026",
  status: "recorded",
});

export default function ExpensesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCrud<Expense>("expenses");
  const { screen, isList, openCreate, openEdit, close } = usePageScreen();
  const [form, setForm] = useState(emptyExpense());
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    if (screen.kind === "edit") {
      const e = items.find((x) => x.id === screen.id);
      if (e) setForm({ ...e });
    } else if (screen.kind === "create") {
      setForm(emptyExpense());
    }
  }, [screen, items]);

  const filtered = useMemo(
    () => (monthFilter === "all" ? items : items.filter((e) => e.month === monthFilter)),
    [items, monthFilter],
  );
  const { paginated, ...pagination } = usePagination(filtered, monthFilter);

  const totals = useMemo(() => {
    const mar = items.filter((e) => e.month === "Mar 2026");
    return {
      month: mar.reduce((s, e) => s + e.amount, 0),
      all: items.reduce((s, e) => s + e.amount, 0),
      count: items.length,
    };
  }, [items]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Expense updated");
      } else {
        await create(form);
        toast("Expense recorded");
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
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "New expense" }]}
        title={screen.kind === "edit" ? "Edit expense" : "Record expense"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="card grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Date *">
            <input type="date" className="field-input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormField>
          <FormField label="Billing month *">
            <select className="field-input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              <option>Jan 2026</option>
              <option>Feb 2026</option>
              <option>Mar 2026</option>
            </select>
          </FormField>
          <FormField label="Category *">
            <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Amount (KES) *">
            <input type="number" min={0} className="field-input" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </FormField>
          <FormField label="Description *" className="sm:col-span-2">
            <input className="field-input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label="Vehicle plate (optional)">
            <input className="field-input font-mono uppercase" value={form.vehiclePlate ?? ""} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })} />
          </FormField>
          <FormField label="Status">
            <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Expense["status"] })}>
              <option value="recorded">Recorded</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update" : "Save expense"} />
          </div>
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconReceipt} label="Total expenses (Mar)" value={`KES ${fmtN(totals.month)}`} sub="Operating costs" />
        <MetricCard accent="amber" icon={IconReceipt} label="YTD expenses" value={`KES ${fmtN(totals.all)}`} sub="Jan–Mar 2026" />
        <MetricCard accent="teal" icon={IconReceipt} label="Expense lines" value={String(totals.count)} sub="All categories" />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <select className="field-input h-[38px] w-auto" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="all">All months</option>
          <option value="Jan 2026">Jan 2026</option>
          <option value="Feb 2026">Feb 2026</option>
          <option value="Mar 2026">Mar 2026</option>
        </select>
        <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(emptyExpense()); openCreate(); }}>
          <IconPlus size={14} /> Record expense
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Vehicle</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">No expenses recorded</td></tr>
            ) : (
              paginated.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{e.date}</td>
                  <td><Badge variant="draft">{e.category}</Badge></td>
                  <td className="max-w-[200px] truncate text-xs">{e.description}</td>
                  <td className="font-mono text-xs">{e.vehiclePlate || "—"}</td>
                  <td className="text-xs">{e.month}</td>
                  <td className="font-mono font-medium">KES {fmtN(e.amount)}</td>
                  <td><Badge variant={e.status === "paid" ? "paid" : e.status === "approved" ? "approved" : "pending"}>{e.status}</Badge></td>
                  <td>
                    <div className="flex gap-1">
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
