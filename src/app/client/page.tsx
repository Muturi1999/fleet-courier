"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconArrowBackUp,
  IconCheck,
  IconEye,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { ClientInvoiceReview } from "@/components/client/ClientInvoiceReview";
import { SoaApprovalCard } from "@/components/client/SoaApprovalCard";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { clearedFilters, filterInvoices } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { ConsolidatedInvoice, Invoice, WorkTicket } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { useNotifications } from "@/hooks/useNotifications";
import { usePagination } from "@/hooks/usePagination";

type ClientTab = "awaiting" | "approved" | "returned" | "all";
type ReviewState = { id: string; mode: "view" | "reject" } | null;

const CLIENT_STATUSES: Record<ClientTab, string[]> = {
  awaiting: ["pending", "sent"],
  approved: ["approved"],
  returned: ["rejected"],
  all: ["pending", "sent", "approved", "rejected"],
};

export default function ClientPortalPage() {
  const { toast } = useToast();
  const { items, update, loading } = useCrud<Invoice>("invoices");
  const { refresh: refreshNotifications } = useNotifications("client");
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [tab, setTab] = useState<ClientTab>("awaiting");
  const [review, setReview] = useState<ReviewState>(null);
  const [pendingConsolidated, setPendingConsolidated] = useState<ConsolidatedInvoice | null>(null);
  const [consolidatedView, setConsolidatedView] = useState<{
    invoice: ConsolidatedInvoice;
    tickets: WorkTicket[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/consolidated-invoices", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ConsolidatedInvoice[]) => {
        const pending = list.find((i) => i.status === "pending_approval");
        setPendingConsolidated(pending ?? null);
      });
  }, []);

  const clientItems = useMemo(
    () => items.filter((i) => CLIENT_STATUSES.all.includes(i.status)),
    [items],
  );

  const tabItems = useMemo(() => {
    const byTab = clientItems.filter((i) => CLIENT_STATUSES[tab].includes(i.status));
    return filterInvoices(byTab, filters, "all");
  }, [clientItems, filters, tab]);

  const counts = useMemo(
    () => ({
      awaiting: clientItems.filter((i) => CLIENT_STATUSES.awaiting.includes(i.status)).length,
      approved: clientItems.filter((i) => i.status === "approved").length,
      returned: clientItems.filter((i) => i.status === "rejected").length,
      all: clientItems.length,
    }),
    [clientItems],
  );

  const filterKey = JSON.stringify({ filters, tab });
  const { paginated, ...pagination } = usePagination(tabItems, filterKey);

  const reviewInvoice = review ? items.find((i) => i.id === review.id) : undefined;

  const approveInvoice = async (inv: Invoice, note?: string) => {
    await update(inv.id, { status: "approved", clientNote: note?.trim() || undefined });
    await refreshNotifications();
    toast(`Invoice ${inv.invoiceNo} approved`);
    setReview(null);
  };

  const sendBackInvoice = async (inv: Invoice, note: string) => {
    await update(inv.id, { status: "rejected", clientNote: note });
    await refreshNotifications();
    toast(`Invoice ${inv.invoiceNo} sent back to Fleet Admin`);
    setReview(null);
  };

  const openConsolidatedView = async () => {
    if (!pendingConsolidated) return;
    const res = await fetch(`/api/consolidated-invoices/${pendingConsolidated.id}?detail=full`, {
      cache: "no-store",
    });
    if (res.ok) setConsolidatedView(await res.json());
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
    setConsolidatedView(null);
    await refreshNotifications();
    toast(`SOA ${updated.refNo} approved — 90-day payment window starts`);
  };

  if (consolidatedView) {
    return (
      <RecordScreen
        crumbs={[{ label: "Invoices", onClick: () => setConsolidatedView(null) }, { label: consolidatedView.invoice.refNo }]}
        title={`Consolidated billing · ${consolidatedView.invoice.invoiceNo}`}
        onBack={() => setConsolidatedView(null)}
      >
        <div id="consolidated-billing-print" className="space-y-6">
          <ConsolidatedInvoiceDocument
            invoice={consolidatedView.invoice}
            onPrint={printConsolidatedBilling}
          />
          <SoaBreakdownDocument invoice={consolidatedView.invoice} tickets={consolidatedView.tickets} />
        </div>
      </RecordScreen>
    );
  }

  if (review && reviewInvoice) {
    return (
      <ClientInvoiceReview
        invoice={reviewInvoice}
        mode={review.mode}
        onBack={() => setReview(null)}
        onApprove={(note) => approveInvoice(reviewInvoice, note)}
        onSendBack={(note) => sendBackInvoice(reviewInvoice, note)}
      />
    );
  }

  return (
    <>
      <SoaApprovalCard
        invoice={pendingConsolidated}
        onApprove={approveSoa}
        onView={openConsolidatedView}
      />

      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">Invoices</h2>
          <p className="text-xs text-fleet-gray-400">Review, approve, or return invoices to Fleet Admin</p>
        </div>
        {counts.awaiting > 0 && (
          <span className="text-xs font-medium text-fleet-red">{counts.awaiting} awaiting</span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["awaiting", `Awaiting (${counts.awaiting})`],
            ["approved", `Approved (${counts.approved})`],
            ["returned", `Returned (${counts.returned})`],
            ["all", `All (${counts.all})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "filter-tab filter-tab-active" : "filter-tab"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "destination", "date"]}
        resultCount={tabItems.length}
      />

      {/* Scrollable table — all breakpoints */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Date</th>
              <th>Total (KES)</th>
              <th>Status</th>
              <th className="min-w-[200px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-fleet-gray-400">No invoices match filters</td></tr>
            ) : (
              paginated.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  canAct={inv.status === "pending" || inv.status === "sent"}
                  onView={() => setReview({ id: inv.id, mode: "view" })}
                  onReject={() => setReview({ id: inv.id, mode: "reject" })}
                  onApprove={() => approveInvoice(inv)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPage={pagination.setPage} />
    </>
  );
}

function InvoiceRow({
  inv,
  canAct,
  onView,
  onReject,
  onApprove,
}: {
  inv: Invoice;
  canAct: boolean;
  onView: () => void;
  onReject: () => void;
  onApprove: () => void;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap font-mono font-semibold">{inv.invoiceNo}</td>
      <td className="whitespace-nowrap font-mono">{inv.plate}</td>
      <td className="max-w-[140px] truncate text-xs">{inv.route}</td>
      <td className="whitespace-nowrap text-xs text-fleet-gray-400">{inv.serviceDate ?? inv.period ?? "—"}</td>
      <td className="whitespace-nowrap font-mono font-medium">{fmtN(inv.total)}</td>
      <td className="whitespace-nowrap"><Badge variant={inv.status}>{inv.status}</Badge></td>
      <td>
        <div className="flex flex-nowrap gap-1">
          <button type="button" className="btn-secondary btn-sm shrink-0" title="View invoice" onClick={onView}>
            <IconEye size={14} />
          </button>
          {canAct && (
            <>
              <button type="button" className="btn-secondary btn-sm shrink-0" title="Reject with note" onClick={onReject}>
                <IconArrowBackUp size={14} />
              </button>
              <button type="button" className="btn-accent btn-sm shrink-0" title="Approve" onClick={onApprove}>
                <IconCheck size={14} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
