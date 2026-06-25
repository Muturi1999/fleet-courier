"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconArrowBackUp, IconCheck } from "@tabler/icons-react";
import { ConsolidatedInvoicesTable } from "@/components/consolidated/ConsolidatedInvoicesTable";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { SoaApprovalCard } from "@/components/client/SoaApprovalCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { sortConsolidatedNewestFirst } from "@/lib/consolidation";
import { normalizeListJson } from "@/lib/list-query";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useNotifications } from "@/hooks/useNotifications";

export type ClientConsolidatedMode = "main" | "approved" | "rejected";

export function ClientConsolidatedPanel({ mode }: { mode: ClientConsolidatedMode }) {
  const { toast } = useToast();
  const { refresh: refreshNotifications } = useNotifications("client");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [pendingConsolidated, setPendingConsolidated] = useState<ConsolidatedInvoice | null>(null);
  const [viewData, setViewData] = useState<{ invoice: ConsolidatedInvoice; tickets: WorkTicket[] } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const status =
    mode === "approved" ? "approved" : mode === "rejected" ? "rejected" : "pending_approval";

  const listKey = JSON.stringify({ filters, mode });
  const { items, meta, loading, totalPages, from, to } = usePaginatedList<ConsolidatedInvoice>(
    "consolidated-invoices",
    { page, filters, status, enabled: mode !== "main" },
  );

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  const refreshPendingConsolidated = useCallback(async () => {
    const res = await fetch("/api/consolidated-invoices?status=pending_approval&limit=5", { cache: "no-store" });
    if (!res.ok) return;
    const parsed = normalizeListJson<ConsolidatedInvoice>(await res.json());
    const pending =
      parsed.data
        .filter((i) => i.status === "pending_approval")
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0] ?? null;
    setPendingConsolidated(pending);
  }, []);

  useEffect(() => {
    if (mode !== "main") return;
    refreshPendingConsolidated();
    const interval = window.setInterval(refreshPendingConsolidated, 15000);
    return () => window.clearInterval(interval);
  }, [mode, refreshPendingConsolidated]);

  const sorted = useMemo(() => sortConsolidatedNewestFirst(items), [items]);

  const openView = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
    if (!res.ok) return;
    setViewData(await res.json());
  };

  const approveSoa = async () => {
    if (!pendingConsolidated) return;
    const res = await fetch(`/api/consolidated-invoices/${pendingConsolidated.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (!res.ok) {
      toast("SOA approval failed");
      return;
    }
    const updated = (await res.json()) as ConsolidatedInvoice;
    setPendingConsolidated(null);
    setViewData(null);
    await refreshNotifications();
    toast(`SOA ${updated.refNo} approved — 90-day payment window starts`);
    await refreshPendingConsolidated();
  };

  const rejectSoa = async () => {
    if (!pendingConsolidated || !rejectNote.trim()) {
      toast("Add a note explaining what needs correction");
      return;
    }
    const res = await fetch(`/api/consolidated-invoices/${pendingConsolidated.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", clientNote: rejectNote.trim() }),
    });
    if (!res.ok) {
      toast("SOA return failed");
      return;
    }
    setPendingConsolidated(null);
    setViewData(null);
    setRejectNote("");
    await refreshNotifications();
    toast("SOA returned to Fleet Admin");
    await refreshPendingConsolidated();
  };

  if (viewData) {
    const inv = viewData.invoice;
    return (
      <RecordScreen
        crumbs={[
          { label: "Consolidated invoices", onClick: () => setViewData(null) },
          { label: inv.refNo },
        ]}
        title={`Consolidated billing · ${inv.invoiceNo}`}
        onBack={() => setViewData(null)}
      >
        <div id="consolidated-billing-print" className="space-y-6">
          <ConsolidatedInvoiceDocument invoice={inv} onPrint={printConsolidatedBilling} />
          <SoaBreakdownDocument invoice={inv} tickets={viewData.tickets} />
        </div>
        {mode === "main" && inv.status === "pending_approval" && (
          <div className="card mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-accent flex-1" onClick={approveSoa}>
              <IconCheck size={16} /> Approve SOA
            </button>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                placeholder="Note for Fleet Admin (required to return)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={rejectSoa}>
                <IconArrowBackUp size={16} /> Return
              </button>
            </div>
          </div>
        )}
      </RecordScreen>
    );
  }

  if (mode === "main") {
    return (
      <>
        <div className="section-header">
          <div>
            <h2 className="text-[15px] font-semibold">Consolidated invoices</h2>
            <p className="text-xs text-fleet-gray-400">Review SOA batches from Fleet Admin</p>
          </div>
        </div>

        <SoaApprovalCard
          invoice={pendingConsolidated}
          onApprove={approveSoa}
          onView={() => pendingConsolidated && openView(pendingConsolidated.id)}
        />

        {pendingConsolidated && (
          <div className="card mb-4">
            <p className="mb-2 text-xs text-fleet-gray-500">Return SOA with a note for corrections</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                placeholder="Explain what needs to be corrected"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={rejectSoa}>
                <IconArrowBackUp size={16} /> Return SOA
              </button>
            </div>
          </div>
        )}

        {!pendingConsolidated && (
          <p className="py-8 text-center text-sm text-fleet-gray-400">No consolidated invoice awaiting your approval</p>
        )}
      </>
    );
  }

  return (
    <>
      <WorkflowPageHeader
        title={mode === "approved" ? "Approved consolidated invoices" : "Rejected consolidated invoices"}
        subtitle={
          mode === "approved"
            ? "SOA batches you have approved"
            : "SOA batches returned to Fleet Admin"
        }
        parentHref="/client/consolidated"
        parentLabel="Consolidated invoices"
      />

      <FilterBar filters={filters} onChange={setFilters} fields={["search", "date"]} resultCount={meta.total} />

      <ConsolidatedInvoicesTable
        rows={sorted}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={meta.total}
        from={from}
        to={to}
        onPage={setPage}
        emptyMessage={`No ${mode} consolidated statements`}
        onView={openView}
        onPrint={() => printConsolidatedBilling()}
        onDownload={() => printConsolidatedBilling()}
        onShare={() => {}}
        onDelete={() => {}}
      />
    </>
  );
}
