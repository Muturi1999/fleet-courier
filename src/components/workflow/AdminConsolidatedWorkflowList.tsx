"use client";

import { useEffect, useMemo, useState } from "react";
import { ConsolidatedInvoicesTable } from "@/components/consolidated/ConsolidatedInvoicesTable";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { FilterBar } from "@/components/ui/FilterBar";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { sortConsolidatedNewestFirst } from "@/lib/consolidation";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";

export function AdminConsolidatedWorkflowList({ workflow }: { workflow: "approved" | "rejected" }) {
  const status = workflow === "approved" ? "approved" : "rejected";
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{ invoice: ConsolidatedInvoice; tickets: WorkTicket[] } | null>(null);

  const listKey = JSON.stringify({ filters, workflow });
  const { items, meta, loading, totalPages, from, to } = usePaginatedList<ConsolidatedInvoice>("consolidated-invoices", {
    page,
    filters,
    status,
  });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  const sorted = useMemo(() => sortConsolidatedNewestFirst(items), [items]);

  const openView = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
    if (!res.ok) return;
    setViewData(await res.json());
    setViewId(id);
  };

  if (viewId && viewData) {
    return (
      <RecordScreen
        crumbs={[
          { label: "Consolidated billing", onClick: () => setViewId(null) },
          { label: workflow === "approved" ? "Approved" : "Rejected" },
          { label: viewData.invoice.refNo },
        ]}
        title={`SOA ${viewData.invoice.refNo}`}
        onBack={() => setViewId(null)}
      >
        {workflow === "rejected" && viewData.invoice.clientNote && (
          <div className="card mb-4 border-fleet-red/20 bg-fleet-red/5 text-sm">{viewData.invoice.clientNote}</div>
        )}
        <div id="consolidated-billing-print" className="space-y-6">
          <ConsolidatedInvoiceDocument invoice={viewData.invoice} onPrint={printConsolidatedBilling} />
          <SoaBreakdownDocument invoice={viewData.invoice} tickets={viewData.tickets} />
        </div>
      </RecordScreen>
    );
  }

  return (
    <>
      <WorkflowPageHeader
        title={workflow === "approved" ? "Approved consolidated invoices" : "Rejected consolidated invoices"}
        subtitle={
          workflow === "approved"
            ? "SOA batches approved by G4S"
            : "SOA batches returned by G4S with partner feedback"
        }
        parentHref="/admin/soa"
        parentLabel="Consolidated billing"
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
        emptyMessage={`No ${workflow} consolidated statements`}
        onView={openView}
        onPrint={() => printConsolidatedBilling()}
        onDownload={() => printConsolidatedBilling()}
        onShare={() => {}}
        onDelete={() => {}}
      />
    </>
  );
}
