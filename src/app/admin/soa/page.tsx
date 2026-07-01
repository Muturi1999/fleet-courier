"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconDownload,
  IconFileDescription,
  IconPrinter,
  IconSend,
} from "@tabler/icons-react";
import { SearchSelect } from "@/components/ui/SearchSelect";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { ConsolidationBreakdownTable } from "@/components/consolidated/ConsolidationBreakdownTable";
import { ConsolidatedRevisePanel } from "@/components/consolidated/ConsolidatedRevisePanel";
import { ConsolidatedInvoicesTable } from "@/components/consolidated/ConsolidatedInvoicesTable";
import { ConsolidateByPeriodPanel } from "@/components/consolidated/ConsolidateByPeriodPanel";
import { EtimsValidationPanel } from "@/components/invoices/EtimsValidationPanel";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { useAuth } from "@/context/AuthContext";
import { isEtimsTenant } from "@/lib/etims-config";
import { currentMonthRangeEAT } from "@/lib/dates";
import { sortConsolidatedNewestFirst } from "@/lib/consolidation";
import { mapToBreakdownLine } from "@/lib/consolidation-breakdown";
import type { ConsolidatedInvoice, RouteRecord, SafariEntry, Vehicle, WorkTicket } from "@/lib/types";
import { normalizeVehicleCondition } from "@/lib/work-ticket-meta";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useCrud } from "@/hooks/useCrud";
import { usePagination } from "@/hooks/usePagination";
import { PAGE_SIZE } from "@/lib/filters";
import { fmtN } from "@/lib/utils";
import { normalizeListJson } from "@/lib/list-query";
import { apiCacheKey, fetchApiCached, getApiCache } from "@/lib/api-cache";

type BillableVehicle = {
  plate: string;
  invoiceCount: number;
  ticketCount: number;
  net: number;
  total: number;
  latestTrip?: string;
};

function asList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  return normalizeListJson<T>(json).data;
}

function mapBillableVehicle(row: Record<string, unknown>): BillableVehicle {
  return {
    plate: String(row.plate ?? ""),
    invoiceCount: Number(row.invoiceCount ?? row.invoice_count ?? 0),
    ticketCount: Number(row.ticketCount ?? row.ticket_count ?? 0),
    net: Number(row.net ?? 0),
    total: Number(row.total ?? 0),
    latestTrip: (row.latestTrip ?? row.latest_trip) as string | undefined,
  };
}

type PreviewLine = WorkTicket & { invoiceNo?: string; cls?: string; runType?: string; days?: number; agreedRate?: number };

function apiErrorMessage(err: { message?: string | string[]; error?: string }): string {
  if (Array.isArray(err.message)) return err.message.join(", ");
  return err.message ?? err.error ?? "Request failed";
}

function mapPreviewLine(row: Record<string, unknown>): PreviewLine {
  return {
    id: String(row.id ?? ""),
    serialNo: String(row.serialNo ?? row.serial_no ?? ""),
    tripDate: String(row.tripDate ?? row.trip_date ?? ""),
    plate: String(row.plate ?? ""),
    route: String(row.route ?? ""),
    driverName: String(row.driverName ?? row.driver_name ?? ""),
    net: Number(row.net ?? 0),
    vat: Number(row.vat ?? 0),
    total: Number(row.total ?? 0),
    status: (row.status as PreviewLine["status"]) ?? "draft",
    branch: String(row.branch ?? ""),
    make: String(row.make ?? ""),
    vehicleType: String(row.vehicleType ?? row.vehicle_type ?? ""),
    vehicleCondition: normalizeVehicleCondition(
      (row.vehicleCondition ?? row.vehicle_condition) as Record<string, string> | undefined,
    ),
    driverSignature: String(row.driverSignature ?? row.driver_signature ?? ""),
    certificationDate: String(row.certificationDate ?? row.certification_date ?? ""),
    cls: String(row.cls ?? ""),
    rateType: (row.rateType as PreviewLine["rateType"]) ?? "fixed",
    agreedRate: Number(row.agreedRate ?? row.agreed_rate ?? row.dayRate ?? row.day_rate ?? 0),
    legs: Array.isArray(row.legs) ? (row.legs as PreviewLine["legs"]) : [],
    privateKm: Number(row.privateKm ?? row.private_km ?? 0),
    officialKm: Number(row.officialKm ?? row.official_km ?? 0),
    runType: String(row.runType ?? row.run_type ?? ""),
    invoiceNo: String(row.invoiceNo ?? row.invoice_no ?? ""),
    days: Math.max(1, Number(row.days ?? 1)),
  };
}

function defaultPeriod() {
  return currentMonthRangeEAT();
}

/** Match partial plate input to a registered plate (e.g. "kde" or "kdes" → "KDE 073Q"). */
function resolveVehiclePlate(input: string, plates: string[]): string {
  const raw = input.trim();
  if (!raw) return "";
  const q = raw.toLowerCase().replace(/\s+/g, " ");
  const compact = q.replace(/\s/g, "");
  const queryVariants = [...new Set([q, compact, q.replace(/s$/, ""), compact.replace(/s$/, "")])].filter(
    (v) => v.length >= 2,
  );

  const entries = plates.map((p) => ({
    plate: p,
    norm: p.toLowerCase().replace(/\s+/g, " "),
    compact: p.toLowerCase().replace(/\s/g, ""),
  }));

  for (const variant of queryVariants) {
    const exact = entries.find((e) => e.norm === variant || e.compact === variant);
    if (exact) return exact.plate;
  }

  for (const variant of queryVariants) {
    const matches = entries.filter(
      (e) =>
        e.norm.includes(variant) ||
        e.compact.includes(variant) ||
        e.compact.startsWith(variant) ||
        variant.startsWith(e.compact.slice(0, Math.min(variant.length, e.compact.length))),
    );
    if (matches.length === 1) return matches[0].plate;
  }

  return raw;
}

export default function ConsolidatedBillingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const showEtims = isEtimsTenant(user?.tenantSlug);
  const { refresh: refreshNotifications } = useNotifications("admin");
  const { items: registerVehicles } = useCrud<Vehicle>("vehicles");
  const { items: routes } = useCrud<RouteRecord>("routes");
  const { items: safari } = useCrud<SafariEntry>("safari");
  const periodDefaults = useMemo(() => defaultPeriod(), []);
  const invoicesCacheKey = apiCacheKey("GET", "/api/consolidated-invoices?all=true");
  const [tab, setTab] = useState<"statements" | "vehicle" | "period">("statements");
  const [invoices, setInvoices] = useState<ConsolidatedInvoice[]>(
    () => getApiCache<ConsolidatedInvoice[]>(invoicesCacheKey) ?? [],
  );
  const [vehicles, setVehicles] = useState<BillableVehicle[]>([]);
  const [preview, setPreview] = useState<PreviewLine[]>([]);
  const [from, setFrom] = useState(periodDefaults.from);
  const [to, setTo] = useState(periodDefaults.to);
  const [plate, setPlate] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{ invoice: ConsolidatedInvoice; tickets: WorkTicket[] } | null>(null);
  const [reviseData, setReviseData] = useState<{ invoice: ConsolidatedInvoice; tickets: WorkTicket[] } | null>(null);
  const [loading, setLoading] = useState(() => getApiCache<ConsolidatedInvoice[]>(invoicesCacheKey) === undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const sortedInvoices = useMemo(() => sortConsolidatedNewestFirst(invoices), [invoices]);

  const vehicleConsolidated = useMemo(
    () =>
      sortConsolidatedNewestFirst(
        invoices.filter((inv) => inv.consolidationType !== "period" && Boolean(inv.plate?.trim())),
      ),
    [invoices],
  );

  const vehicleListKey = `${vehicleConsolidated.length}-${highlightId ?? ""}`;
  const statementsListKey = `${sortedInvoices.length}`;

  const vehiclePagination = usePagination(vehicleConsolidated, vehicleListKey, PAGE_SIZE);
  const statementsPagination = usePagination(sortedInvoices, statementsListKey, PAGE_SIZE);

  const allPlates = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) set.add(v.plate);
    for (const v of registerVehicles ?? []) set.add(v.plate);
    return [...set];
  }, [vehicles, registerVehicles]);

  const billableMap = useMemo(() => new Map(vehicles.map((v) => [v.plate, v])), [vehicles]);

  const vehicleOptions = useMemo(
    () =>
      allPlates
        .sort((a, b) => {
          const ba = billableMap.get(a);
          const bb = billableMap.get(b);
          if (ba && !bb) return -1;
          if (!ba && bb) return 1;
          if (ba && bb) {
            const byActivity = (bb.latestTrip ?? "").localeCompare(ba.latestTrip ?? "");
            if (byActivity !== 0) return byActivity;
          }
          return a.localeCompare(b);
        })
        .map((p) => {
          const b = billableMap.get(p);
          return {
            value: p,
            label: b
              ? `${p} — ${b.invoiceCount} invoice(s) · KES ${fmtN(b.net)} ex VAT`
              : p,
          };
        }),
    [allPlates, billableMap],
  );

  const refresh = useCallback(async () => {
    const vehUrl = `/api/consolidated-invoices?vehicles=true&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const vehiclesCacheKey = apiCacheKey("GET", vehUrl);

    const cachedInv = getApiCache<ConsolidatedInvoice[]>(invoicesCacheKey);
    const cachedVeh = getApiCache<BillableVehicle[]>(vehiclesCacheKey);
    if (cachedInv) {
      setInvoices(cachedInv);
      setLoading(false);
    } else {
      setLoading(true);
    }
    if (cachedVeh) setVehicles(cachedVeh);

    try {
      const [invData, vehData] = await Promise.all([
        fetchApiCached(invoicesCacheKey, async () => {
          const res = await fetch("/api/consolidated-invoices?all=true", { cache: "no-store" });
          if (!res.ok) throw new Error("Fetch failed");
          return normalizeListJson<ConsolidatedInvoice>(await res.json()).data;
        }),
        fetchApiCached(vehiclesCacheKey, async () => {
          const res = await fetch(vehUrl, { cache: "no-store" });
          if (!res.ok) throw new Error("Fetch failed");
          const rows = asList<Record<string, unknown>>(await res.json());
          return rows.map(mapBillableVehicle).filter((v) => v.plate);
        }),
      ]);
      setInvoices(invData);
      setVehicles(vehData);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, [from, to, invoicesCacheKey]);

  const loadPreview = useCallback(
    async (selectedPlate: string) => {
      const resolved = resolveVehiclePlate(selectedPlate, allPlates);
      if (!resolved) {
        setPreview([]);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await fetch(
          `/api/consolidated-invoices?unbilled=true&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&plate=${encodeURIComponent(resolved)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const rows = asList<Record<string, unknown>>(await res.json());
          setPreview(rows.map(mapPreviewLine).filter((r) => r.id));
        } else {
          setPreview([]);
        }
      } finally {
        setPreviewLoading(false);
      }
    },
    [from, to, allPlates],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handle = window.setTimeout(() => loadPreview(plate), 200);
    return () => window.clearTimeout(handle);
  }, [plate, from, to, loadPreview]);

  const selectedVehicle = billableMap.get(resolveVehiclePlate(plate, allPlates));

  const handlePlateChange = (value: string) => {
    setPlate(value);
  };

  const consolidate = async () => {
    const resolved = resolveVehiclePlate(plate, allPlates);
    if (!resolved) {
      toast("Select or type a vehicle plate");
      return;
    }
    if (resolved !== plate) setPlate(resolved);

    setConsolidating(true);
    try {
      const res = await fetch("/api/consolidated-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: resolved, periodStart: from, periodEnd: to }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
        toast(apiErrorMessage(err));
        return;
      }
      const created = (await res.json()) as ConsolidatedInvoice;
      toast(`Consolidated serial ${created.invoiceNo} — ${created.totalTrips} trip invoice(s) for ${resolved}`);
      setHighlightId(created.id);
      setPreview([]);
      await loadPreview(resolved);
      await refresh();
    } catch {
      toast("Consolidation failed — check period and vehicle");
    } finally {
      setConsolidating(false);
    }
  };

  const sendToClient = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send" }),
    });
    if (!res.ok) {
      toast("Send failed");
      return;
    }
    await refreshNotifications();
    toast("Sent to partner for approval");
    await refresh();
  };

  const markPaid = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    if (!res.ok) {
      toast("Update failed");
      return;
    }
    toast("Marked as paid");
    await refresh();
  };

  const openView = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
    if (!res.ok) return;
    setViewData(await res.json());
    setViewId(id);
    setReviseData(null);
  };

  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || typeof window === "undefined") return;
    const view = new URLSearchParams(window.location.search).get("view");
    if (!view) return;
    openedFromUrl.current = true;
    void openView(view);
  }, []);

  const openRevise = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
    if (!res.ok) {
      toast("Could not load SOA for editing");
      return;
    }
    const data = (await res.json()) as { invoice: ConsolidatedInvoice; tickets: WorkTicket[] };
    if (data.invoice.status !== "rejected" && data.invoice.status !== "draft") {
      toast("Only rejected or draft SOAs can be revised");
      return;
    }
    if (data.invoice.supersededById) {
      toast("This SOA has already been superseded");
      return;
    }
    setViewId(null);
    setViewData(null);
    setReviseData(data);
  };

  const handleReviseSaved = async (created: ConsolidatedInvoice) => {
    setReviseData(null);
    setHighlightId(created.id);
    await refresh();
    await openView(created.id);
  };

  const downloadDocuments = async (id: string) => {
    await openView(id);
    setTimeout(printConsolidatedBilling, 300);
    toast("Use Print → Save as PDF to download");
  };

  const printInvoice = async (id: string) => {
    await openView(id);
    setTimeout(printConsolidatedBilling, 300);
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this consolidated invoice? Linked trip invoices will be released.")) return;
    const res = await fetch(`/api/consolidated-invoices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
      toast(apiErrorMessage(err));
      return;
    }
    if (highlightId === id) setHighlightId(null);
    toast("Consolidated invoice deleted");
    await refresh();
  };

  if (reviseData) {
    return (
      <RecordScreen
        crumbs={[
          { label: "Consolidated billing", onClick: () => setReviseData(null) },
          { label: `Revise ${reviseData.invoice.invoiceNo}` },
        ]}
        title={`Revise SOA ${reviseData.invoice.invoiceNo}`}
        onBack={() => setReviseData(null)}
      >
        <ConsolidatedRevisePanel
          source={reviseData.invoice}
          tickets={reviseData.tickets}
          onClose={() => setReviseData(null)}
          onSaved={handleReviseSaved}
          toast={toast}
        />
      </RecordScreen>
    );
  }

  if (viewId && viewData) {
    return (
      <RecordScreen
        crumbs={[
          { label: "Consolidated billing", onClick: () => { setViewId(null); setViewData(null); } },
          { label: viewData.invoice.invoiceNo },
        ]}
        title={`${viewData.invoice.invoiceNo} · ${
          viewData.invoice.consolidationType === "period" || !viewData.invoice.plate?.trim()
            ? "Period batch"
            : viewData.invoice.plate
        }`}
        onBack={() => { setViewId(null); setViewData(null); }}
      >
        <div id="consolidated-billing-print" className="space-y-6">
          <ConsolidatedInvoiceDocument invoice={viewData.invoice} onPrint={printConsolidatedBilling} />
          <SoaBreakdownDocument invoice={viewData.invoice} tickets={viewData.tickets} />
          {showEtims &&
            (viewData.invoice.status === "approved" || viewData.invoice.status === "paid") && (
            <EtimsValidationPanel
              recordId={viewData.invoice.id}
              invoiceNo={viewData.invoice.invoiceNo}
              target="consolidated"
            />
          )}
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className="btn-secondary btn-sm" onClick={printConsolidatedBilling}>
              <IconPrinter size={14} /> Print
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => downloadDocuments(viewData.invoice.id)}>
              <IconDownload size={14} /> Download PDF
            </button>
            {viewData.invoice.status === "draft" && (
              <button type="button" className="btn-accent btn-sm" onClick={() => sendToClient(viewData.invoice.id)}>
                <IconSend size={14} /> Share with partner
              </button>
            )}
            {(viewData.invoice.status === "rejected" || viewData.invoice.status === "draft") &&
              !viewData.invoice.supersededById && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => openRevise(viewData.invoice.id)}>
                Revise &amp; resubmit
              </button>
            )}
            {viewData.invoice.status === "approved" && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => markPaid(viewData.invoice.id)}>
                <IconCheck size={14} /> Mark paid
              </button>
            )}
          </div>
        </div>
      </RecordScreen>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={tab === "statements" ? "filter-tab filter-tab-active" : "filter-tab"} onClick={() => setTab("statements")}>
          Consolidated statements
        </button>
        <button type="button" className={tab === "vehicle" ? "filter-tab filter-tab-active" : "filter-tab"} onClick={() => setTab("vehicle")}>
          Consolidate by vehicle
        </button>
        <button type="button" className={tab === "period" ? "filter-tab filter-tab-active" : "filter-tab"} onClick={() => setTab("period")}>
          Consolidate by period
        </button>
      </div>

      {tab === "period" ? (
        <ConsolidateByPeriodPanel
          invoices={sortedInvoices}
          vehicles={registerVehicles ?? []}
          routes={routes ?? []}
          safari={safari ?? []}
          loading={loading}
          highlightId={highlightId}
          onRefresh={refresh}
          onView={openView}
          onPrint={printInvoice}
          onDownload={downloadDocuments}
          onShare={sendToClient}
          onDelete={deleteInvoice}
          onEdit={openRevise}
          toast={toast}
        />
      ) : tab === "vehicle" ? (
        <div className="card">
          <h2 className="mb-1 text-[15px] font-semibold">Consolidate trip invoices by vehicle</h2>
          <p className="mb-4 text-xs text-fleet-gray-400">
            Pick a billing period and vehicle to consolidate trip invoices. Preview uses the RNT breakdown columns; print
            shows the same layout with ex VAT and inc VAT totals.
          </p>

          <div className="mb-4 grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(200px,2fr)_auto]">
            <label className="text-xs">
              <span className="mb-1 block text-fleet-gray-400">Period from</span>
              <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-fleet-gray-400">Period to</span>
              <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-fleet-gray-400">Search vehicle</span>
              <SearchSelect
                listId="soa-vehicle-plates"
                mono
                value={plate}
                placeholder="Type plate e.g. KDE 073Q"
                options={vehicleOptions}
                onChange={handlePlateChange}
              />
            </label>
            <button
              type="button"
              className="btn-accent h-[38px] shrink-0 whitespace-nowrap"
              disabled={!plate.trim() || consolidating || previewLoading}
              onClick={consolidate}
            >
              {consolidating ? "Consolidating…" : "Consolidate for vehicle"}
            </button>
          </div>

          {selectedVehicle && (
            <div className="mb-4 rounded-fleet-sm border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-fleet-gray-700">
              <span className="font-medium text-navy">{selectedVehicle.plate}</span>
              <span className="ml-2 text-fleet-gray-500">
                {selectedVehicle.invoiceCount} trip invoice(s) · Subtotal KES {fmtN(selectedVehicle.net)} · Total KES {fmtN(selectedVehicle.total)}
              </span>
            </div>
          )}

          <div className="table-wrap mb-4 max-h-[28rem] overflow-y-auto">
            {!plate.trim() ? (
              <p className="py-8 text-center text-sm text-fleet-gray-400">Select a vehicle to preview trip invoices</p>
            ) : previewLoading ? (
              <p className="py-8 text-center text-sm text-fleet-gray-400">Loading…</p>
            ) : preview.length === 0 ? (
              <p className="py-8 text-center text-sm text-fleet-gray-400">No uninvoiced trip invoices for this vehicle in range</p>
            ) : (
              <ConsolidationBreakdownTable
                compact
                layout="flat"
                lines={preview.map((t) =>
                  mapToBreakdownLine({ ...t, cls: t.cls } as unknown as Record<string, unknown>),
                )}
                grandNet={preview.reduce((s, t) => s + t.net, 0)}
                grandTotal={preview.reduce((s, t) => s + t.total, 0)}
              />
            )}
          </div>

          <p className="mb-6 border-t border-fleet-gray-100 pt-4 text-sm text-fleet-gray-500">
            {preview.length} trip invoice(s) ready to consolidate
          </p>

          <div className="border-t border-fleet-gray-100 pt-6">
            <div className="section-header mb-4">
              <div>
                <h3 className="text-[15px] font-semibold">Consolidated by vehicle</h3>
                <p className="text-xs text-fleet-gray-400">
                  Vehicle batch statements — newest first · {vehicleConsolidated.length} total
                </p>
              </div>
            </div>
            <ConsolidatedInvoicesTable
              rows={vehiclePagination.paginated}
              loading={loading}
              page={vehiclePagination.page}
              totalPages={vehiclePagination.totalPages}
              total={vehiclePagination.total}
              from={vehiclePagination.from}
              to={vehiclePagination.to}
              onPage={vehiclePagination.setPage}
              highlightId={highlightId}
              emptyMessage="No vehicle consolidations yet — create one above"
              onView={openView}
              onPrint={printInvoice}
              onDownload={downloadDocuments}
              onShare={sendToClient}
              onDelete={deleteInvoice}
              onEdit={openRevise}
            />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="section-header mb-4">
            <div>
              <h2 className="text-[15px] font-semibold">Consolidated billing history</h2>
              <p className="text-xs text-fleet-gray-400">All consolidated statements · 10 per page</p>
            </div>
            <IconFileDescription size={18} className="text-fleet-gray-400" />
          </div>
          <ConsolidatedInvoicesTable
            rows={statementsPagination.paginated}
            loading={loading}
            page={statementsPagination.page}
            totalPages={statementsPagination.totalPages}
            total={statementsPagination.total}
            from={statementsPagination.from}
            to={statementsPagination.to}
            onPage={statementsPagination.setPage}
            emptyMessage="No consolidated statements yet"
            onView={openView}
            onPrint={printInvoice}
            onDownload={downloadDocuments}
            onShare={sendToClient}
            onDelete={deleteInvoice}
            onEdit={openRevise}
          />
        </div>
      )}
    </>
  );
}
