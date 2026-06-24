"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArrowBackUp,
  IconCheck,
  IconClock,
  IconEye,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { ClientInvoiceReview } from "@/components/client/ClientInvoiceReview";
import { SoaApprovalCard } from "@/components/client/SoaApprovalCard";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { buildListQuery, normalizeListJson } from "@/lib/list-query";
import { formatEATDisplay } from "@/lib/dates";
import type { ConsolidatedInvoice, Invoice, WorkTicket } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useNotifications } from "@/hooks/useNotifications";

type ClientTab = "awaiting" | "approved" | "returned" | "all";
type ReviewState = { id: string; mode: "view" | "reject" } | null;

export default function ClientPortalPage() {
  const { toast } = useToast();
  const { items: notifications, refresh: refreshNotifications } = useNotifications("client");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [tab, setTab] = useState<ClientTab>("awaiting");
  const [review, setReview] = useState<ReviewState>(null);
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
  const [tabCounts, setTabCounts] = useState({ awaiting: 0, approved: 0, returned: 0, all: 0 });
  const [pendingConsolidated, setPendingConsolidated] = useState<ConsolidatedInvoice | null>(null);
  const [consolidatedView, setConsolidatedView] = useState<{
    invoice: ConsolidatedInvoice;
    tickets: WorkTicket[];
  } | null>(null);

  const listKey = JSON.stringify({ filters, tab });
  const {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    totalPages,
    from,
    to,
  } = usePaginatedList<Invoice>("clients/invoices", { page, filters, tab });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    const tabs: ClientTab[] = ["awaiting", "approved", "returned", "all"];
    Promise.all(
      tabs.map(async (t) => {
        const qs = buildListQuery({ page: 1, limit: 1, filters, tab: t });
        const res = await fetch(`/api/clients/invoices?${qs}`, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return [t, 0] as const;
        const parsed = normalizeListJson<Invoice>(await res.json());
        return [t, parsed.meta.total] as const;
      }),
    ).then((pairs) => {
      const next = { awaiting: 0, approved: 0, returned: 0, all: 0 };
      for (const [t, n] of pairs) next[t] = n;
      setTabCounts(next);
    });
  }, [filters]);

  useEffect(() => {
    if (!review) {
      setReviewInvoice(null);
      return;
    }
    const found = items.find((i) => i.id === review.id);
    if (found) {
      setReviewInvoice(found);
      return;
    }
    fetchOne(review.id).then(setReviewInvoice);
  }, [review, items, fetchOne]);

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
    refreshPendingConsolidated();
    const interval = window.setInterval(refreshPendingConsolidated, 15000);
    const onFocus = () => refreshPendingConsolidated();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshPendingConsolidated]);

  useEffect(() => {
    if (notifications.some((n) => n.type === "consolidated_sent")) {
      refreshPendingConsolidated();
    }
  }, [notifications, refreshPendingConsolidated]);

  const summary = useMemo(
    () => ({
      awaiting: tabCounts.awaiting,
      approved: tabCounts.approved,
    }),
    [tabCounts],
  );

  const counts = tabCounts;

  const approveInvoice = async (inv: Invoice, note?: string) => {
    const res = await fetch(`/api/clients/invoices/${inv.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clientNote: note?.trim() || undefined }),
    });
    if (!res.ok) {
      toast("Approval failed");
      return;
    }
    await refreshPage();
    await refreshNotifications();
    toast(`Invoice ${inv.invoiceNo} approved`);
    setReview(null);
  };

  const sendBackInvoice = async (inv: Invoice, note: string) => {
    const res = await fetch(`/api/clients/invoices/${inv.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clientNote: note }),
    });
    if (!res.ok) {
      toast("Send back failed");
      return;
    }
    await refreshPage();
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
        onApprove={async () => {
          await approveSoa();
          await refreshPendingConsolidated();
        }}
        onView={openConsolidatedView}
      />

      <MetricsGrid>
        <MetricCard
          accent="amber"
          icon={IconClock}
          label="Awaiting review"
          value={String(summary.awaiting)}
          sub={summary.awaiting > 0 ? `${summary.awaiting} pending review` : "No pending invoices"}
        />
        <MetricCard
          accent="teal"
          icon={IconCheck}
          label="Approved"
          value={String(summary.approved)}
          sub="Live from invoice register"
        />
      </MetricsGrid>

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
        resultCount={meta.total}
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
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-fleet-gray-400">No invoices match filters</td></tr>
            ) : (
              items.map((inv) => (
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

      <Pagination page={page} totalPages={totalPages} total={meta.total} from={from} to={to} onPage={setPage} />
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
      <td className="whitespace-nowrap text-xs text-fleet-gray-400">
        {formatEATDisplay(inv.serviceDate) || inv.period || "—"}
      </td>
      <td className="whitespace-nowrap font-mono font-medium">{fmtN(inv.total)}</td>
      <td className="whitespace-nowrap"><Badge variant={inv.status}>{inv.status}</Badge></td>
      <td>
        <div className="flex flex-wrap gap-1 sm:flex-nowrap">
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
