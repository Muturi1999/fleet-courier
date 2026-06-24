"use client";

import { FormEvent, useMemo, useState } from "react";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField, Modal } from "@/components/ui/Modal";
import { calcBilling } from "@/lib/billing";
import { clearedFilters, newestFirst, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Rate } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { useCrud } from "@/hooks/useCrud";
import { usePagination } from "@/hooks/usePagination";
import { ExcelImportButton } from "@/components/import/ExcelImportButton";
import { parseRatesExcel } from "@/lib/excel-import";

const emptyRate = (): Omit<Rate, "id"> => ({
  route: "",
  cls: "7T",
  rate: 8500,
  effectiveFrom: "2026-01-01",
  status: "active",
  category: "nairobi",
});

export default function RatesPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove, refresh } = useCrud<Rate>("rates");
  const [calcRate, setCalcRate] = useState(8500);
  const [calcDays, setCalcDays] = useState(20);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyRate());
  const [editId, setEditId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());

  const preview = calcBilling(calcRate, calcDays);

  const filtered = useMemo(() => {
    return newestFirst(items.filter((r) => {
      if (filters.search && !r.route.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.destination && !r.route.toLowerCase().includes(filters.destination.toLowerCase())) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    }));
  }, [items, filters]);

  const filterKey = JSON.stringify(filters);
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (modal === "edit" && editId) {
        await update(editId, form);
        toast("Rate updated");
        setFilters(highlightSearch(form.route));
      } else {
        await create(form);
        toast("Rate added");
        setFilters(highlightSearch(form.route));
      }
      setModal(null);
    } catch (error) {
      toast(saveErrorMessage(error));
    }
  };

  const importRates = async (file: File) => {
    try {
      const rows = await parseRatesExcel(file);
      if (!rows.length) {
        toast("No rate rows found — check column headers");
        return;
      }
      const res = await fetch("/api/rates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Import failed");
      const json = (await res.json()) as { imported?: number };
      toast(`Imported ${json.imported ?? rows.length} rates`);
      await refresh();
    } catch {
      toast("Import failed — use Excel with Route, Class, Rate columns");
    }
  };

  const nairobi = paginated.filter((r) => r.category === "nairobi");
  const upcountry = paginated.filter((r) => r.category === "upcountry");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <div className="section-header">
          <div><h2 className="text-[15px] font-semibold">Rate card</h2><p className="text-xs text-fleet-gray-400">Excl. 16% VAT · import RNT_PRICE_LIST.xlsx</p></div>
          <div className="flex flex-wrap gap-2">
            <ExcelImportButton label="Import Excel" onImport={importRates} />
            <button type="button" className="btn-accent btn-sm" onClick={() => { setForm(emptyRate()); setEditId(null); setModal("create"); }}><IconPlus size={14} /> Add rate</button>
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters} fields={["search", "destination", "status"]} statusKind="route" resultCount={filtered.length} />

        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Route</th><th>Class</th><th>Rate/day</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 text-center text-fleet-gray-400">Loading…</td></tr>
              ) : (
                <>
                  <tr className="bg-fleet-gray-50"><td colSpan={5} className="text-[10px] font-semibold uppercase text-fleet-gray-400">Nairobi</td></tr>
                  {nairobi.map((r) => (
                    <tr key={r.id}>
                      <td>{r.route}</td>
                      <td><Badge variant="draft">{r.cls}</Badge></td>
                      <td className="font-mono font-medium">{fmtN(r.rate)}</td>
                      <td><Badge variant="active">{r.status}</Badge></td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...r }); setEditId(r.id); setModal("edit"); }}><IconEdit size={14} /></button>
                          <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete rate?")) { await remove(r.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-fleet-gray-50"><td colSpan={5} className="text-[10px] font-semibold uppercase text-fleet-gray-400">Upcountry</td></tr>
                  {upcountry.map((r) => (
                    <tr key={r.id}>
                      <td>{r.route}</td>
                      <td><Badge variant="draft">{r.cls}</Badge></td>
                      <td className="font-mono font-medium">{fmtN(r.rate)}</td>
                      <td><Badge variant="active">{r.status}</Badge></td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => { setForm({ ...r }); setEditId(r.id); setModal("edit"); }}><IconEdit size={14} /></button>
                          <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={async () => { if (confirm("Delete?")) { await remove(r.id); toast("Deleted"); } }}><IconTrash size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pagination} onPage={pagination.setPage} />
      </div>
      <div className="card">
        <h2 className="mb-3 text-[15px] font-semibold">VAT preview</h2>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Rate"><input type="number" className="field-input" value={calcRate} onChange={(e) => setCalcRate(Number(e.target.value))} /></FormField>
          <FormField label="Days"><input type="number" className="field-input" value={calcDays} onChange={(e) => setCalcDays(Number(e.target.value))} /></FormField>
        </div>
        <div className="mt-3 rounded-fleet-md bg-navy p-3 text-xs text-white/80">
          <div className="flex justify-between py-1"><span>Cost</span><span className="font-mono">KES {fmtN(preview.cost)}</span></div>
          <div className="flex justify-between py-1"><span>VAT</span><span className="font-mono">KES {fmtN(preview.vat)}</span></div>
          <div className="flex justify-between py-1 font-semibold text-accent"><span>Total</span><span>KES {fmtN(preview.total)}</span></div>
        </div>
      </div>

      <Modal open={modal !== null} title={modal === "edit" ? "Edit rate" : "Add rate"} onClose={() => setModal(null)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <FormField label="Route name *"><input className="field-input" required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Class"><select className="field-input" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}><option>7T</option><option>15T</option><option>Canter</option><option>Van</option></select></FormField>
            <FormField label="Category"><select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Rate["category"] })}><option value="nairobi">Nairobi</option><option value="upcountry">Upcountry</option></select></FormField>
          </div>
          <FormField label="Rate (KES/day) *"><input type="number" required className="field-input" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></FormField>
          <FormField label="Effective from"><input type="date" className="field-input" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></FormField>
          <FormActions onCancel={() => setModal(null)} />
        </form>
      </Modal>
    </div>
  );
}
