"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconEdit, IconPlus, IconReceipt, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { FilterBar } from "@/components/ui/FilterBar";
import { clearedFilters, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { formatEATDisplay, todayEAT } from "@/lib/dates";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";

const PAGE = "Expenses";
const CATEGORIES: ExpenseCategory[] = ["fuel", "maintenance", "insurance", "salaries", "tolls", "other"];

const emptyExpense = (): Omit<Expense, "id"> => ({
  date: todayEAT(),
  category: "fuel",
  description: "",
  amount: 0,
  vehiclePlate: "",
  month: "Mar 2026",
  status: "recorded",
});

type ExpenseSummary = { count: number; monthTotal: number; allTotal: number };

export default function ExpensesPage() {
  const { toast } = useToast();
  const { screen, isList, openCreate, openEdit, close } = usePageScreen();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyExpense());
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [monthFilter, setMonthFilter] = useState("all");
  const [summary, setSummary] = useState<ExpenseSummary>({ count: 0, monthTotal: 0, allTotal: 0 });
  const [viewRecord, setViewRecord] = useState<Expense | null>(null);

  const listKey = JSON.stringify({ filters, monthFilter });
  const {
    items,
    meta,
    loading,
    create,
    update,
    remove,
    fetchOne,
    refreshPage,
    totalPages,
    from,
    to,
  } = usePaginatedList<Expense>("expenses", { page, filters, month: monthFilter });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    const qs = monthFilter !== "all" ? `?month=${encodeURIComponent(monthFilter)}` : "";
    fetch(`/api/expenses/summary${qs}`, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: ExpenseSummary | null) => {
        if (s) setSummary(s);
      })
      .catch(() => {});
  }, [monthFilter, meta.total]);

  useEffect(() => {
    if (screen.kind !== "edit") {
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
    if (screen.kind === "edit" && viewRecord) {
      setForm({ ...viewRecord });
    } else if (screen.kind === "create") {
      setForm(emptyExpense());
    }
  }, [screen, viewRecord]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      if (screen.kind === "edit") {
        await update(screen.id, form);
        toast("Expense updated");
      } else {
        await create(form);
        toast("Expense recorded");
        setFilters(highlightSearch(form.description));
      }
      await refreshPage();
      close();
    } catch (error) {
      toast(saveErrorMessage(error));
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

  const monthLabel = monthFilter === "all" ? "all months" : monthFilter;

  return (
    <>
      <MetricsGrid>
        <MetricCard
          accent="navy"
          icon={IconReceipt}
          label={monthFilter === "all" ? "Filtered total" : `Total (${monthFilter})`}
          value={`KES ${fmtN(summary.monthTotal)}`}
          sub="Operating costs"
        />
        <MetricCard accent="amber" icon={IconReceipt} label="YTD expenses" value={`KES ${fmtN(summary.allTotal)}`} sub="All recorded" />
        <MetricCard accent="teal" icon={IconReceipt} label="Expense lines" value={String(summary.count)} sub={monthLabel} />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select className="field-input h-[38px] w-auto" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">All months</option>
            <option value="Jan 2026">Jan 2026</option>
            <option value="Feb 2026">Feb 2026</option>
            <option value="Mar 2026">Mar 2026</option>
          </select>
          <FilterBar filters={filters} onChange={setFilters} fields={["search", "date"]} resultCount={meta.total} />
        </div>
        <button type="button" className="btn-accent btn-sm" onClick={() => openCreate()}>
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
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">No expenses recorded</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{formatEATDisplay(e.date)}</td>
                  <td><Badge variant="draft">{e.category}</Badge></td>
                  <td className="max-w-[200px] truncate text-xs">{e.description}</td>
                  <td className="font-mono text-xs">{e.vehiclePlate || "—"}</td>
                  <td className="text-xs">{e.month}</td>
                  <td className="font-mono font-medium">KES {fmtN(e.amount)}</td>
                  <td><Badge variant={e.status === "paid" ? "paid" : e.status === "approved" ? "approved" : "pending"}>{e.status}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(e.id)}><IconEdit size={14} /></button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-fleet-red"
                        onClick={async () => {
                          if (confirm("Delete?")) {
                            await remove(e.id);
                            await refreshPage();
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
