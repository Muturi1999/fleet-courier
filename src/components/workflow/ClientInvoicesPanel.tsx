"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconArrowBackUp,
  IconCheck,
  IconClock,
  IconEye,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { ClientInvoiceReview } from "@/components/client/ClientInvoiceReview";
import { ClientPortalFilterBar } from "@/components/client/ClientPortalFilterBar";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { clearedClientFilters, clientFiltersAreCleared, type ClientPortalFilters } from "@/lib/client-portal-filters";
import { buildListQuery, normalizeListJson } from "@/lib/list-query";
import { formatEATDisplay } from "@/lib/dates";
import type { Invoice } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { dispatchWorkflowUpdated } from "@/lib/workflow-events";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useNotifications } from "@/hooks/useNotifications";

export type ClientInvoiceMode = "awaiting" | "approved" | "returned" | "all";

const TAB_BY_MODE: Record<ClientInvoiceMode, string> = {
  awaiting: "awaiting",
  approved: "approved",
  returned: "returned",
  all: "all",
};

function canRejectInvoice(inv: Invoice): boolean {
  return inv.status === "pending" || inv.status === "sent";
}

export function ClientInvoicesPanel({ mode }: { mode: ClientInvoiceMode }) {
  const tab = TAB_BY_MODE[mode];
  const { toast } = useToast();
  const { refresh: refreshNotifications } = useNotifications("client");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ClientPortalFilters>(clearedClientFilters());
  const [review, setReview] = useState<{ id: string; mode: "view" | "reject" } | null>(null);
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
  const [tabCounts, setTabCounts] = useState({ awaiting: 0, approved: 0, returned: 0, all: 0 });

  const listKey = JSON.stringify({ filters, tab });
  const {
    items,
    meta,
    loading,
    error,
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
    const tabs = ["awaiting", "approved", "returned", "all"] as const;
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

  const sendBackInvoice = useCallback(
    async (inv: Invoice, note: string) => {
      const res = await fetch(`/api/clients/invoices/${inv.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ clientNote: note }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const msg = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
        toast(msg || "Send back failed");
        return;
      }
      await refreshPage();
      await refreshNotifications();
      dispatchWorkflowUpdated();
      toast(`Invoice ${inv.invoiceNo} sent back to Fleet Admin`);
      setReview(null);
    },
    [refreshPage, refreshNotifications, toast],
  );

  if (review && reviewInvoice) {
    return (
      <ClientInvoiceReview
        invoice={reviewInvoice}
        mode={review.mode}
        onBack={() => setReview(null)}
        onSendBack={(note) => sendBackInvoice(reviewInvoice, note)}
      />
    );
  }

  const showMetrics = mode === "awaiting";
  const showWorkflowHeader = mode !== "awaiting";

  return (
    <>
      {showWorkflowHeader && (
        <WorkflowPageHeader
          title={
            mode === "approved"
              ? "Approved invoices"
              : mode === "returned"
                ? "Rejected invoices"
                : "All invoices"
          }
          subtitle={
            mode === "approved"
              ? "Invoices you have approved"
              : mode === "returned"
                ? "Invoices returned to Fleet Admin with feedback"
                : "Full invoice history for your account"
          }
          parentHref="/client/invoices"
          parentLabel="Invoices"
        />
      )}

      {showMetrics && (
        <MetricsGrid>
          <MetricCard
            accent="amber"
            icon={IconClock}
            label="Awaiting review"
            value={String(tabCounts.awaiting)}
            sub={tabCounts.awaiting > 0 ? `${tabCounts.awaiting} pending review` : "No pending invoices"}
          />
          <MetricCard
            accent="teal"
            icon={IconCheck}
            label="Approved"
            value={String(tabCounts.approved)}
            sub="Live from invoice register"
          />
        </MetricsGrid>
      )}

      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">
            {mode === "awaiting" ? "Invoices awaiting review" : "Invoices"}
          </h2>
          <p className="text-xs text-fleet-gray-400">
            {mode === "awaiting"
              ? "View invoices and reject any that need correction — with a note for Fleet Admin"
              : "No filters by default — use billing month or period to narrow results"}
          </p>
        </div>
        {mode === "awaiting" && tabCounts.awaiting > 0 && (
          <span className="text-xs font-medium text-fleet-red">{tabCounts.awaiting} awaiting</span>
        )}
      </div>

      <ClientPortalFilterBar filters={filters} onChange={setFilters} resultCount={meta.total} />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Date</th>
              <th>Period</th>
              <th>Total (KES)</th>
              {mode === "returned" && <th>Your note</th>}
              <th>Status</th>
              <th className="min-w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={mode === "returned" ? 9 : 8} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={mode === "returned" ? 9 : 8} className="py-8 text-center text-fleet-gray-400">
                  {error ? (
                    <>
                      <p className="font-medium text-fleet-gray-600">Couldn’t load invoices</p>
                      <p className="mt-1 text-xs">{error}</p>
                      <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void refreshPage({ force: true })}>
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-fleet-gray-600">No invoices match the current filters</p>
                      <p className="mt-1 text-xs">
                        Try <span className="font-medium">Clear filters</span>, or set Billing month to{" "}
                        <span className="font-medium">May 2026</span> / <span className="font-medium">April 2026</span>.
                        The “Today” button only shows invoices dated today.
                      </p>
                      {!clientFiltersAreCleared(filters) && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm mt-3"
                          onClick={() => setFilters(clearedClientFilters())}
                        >
                          Clear filters
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  showNote={mode === "returned"}
                  canReject={canRejectInvoice(inv)}
                  onView={() => setReview({ id: inv.id, mode: "view" })}
                  onReject={() => setReview({ id: inv.id, mode: "reject" })}
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
  showNote,
  canReject,
  onView,
  onReject,
}: {
  inv: Invoice;
  showNote?: boolean;
  canReject: boolean;
  onView: () => void;
  onReject: () => void;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap font-mono font-semibold">{inv.invoiceNo}</td>
      <td className="whitespace-nowrap font-mono">{inv.plate}</td>
      <td className="max-w-[140px] truncate text-xs">{inv.route}</td>
      <td className="whitespace-nowrap text-xs text-fleet-gray-400">
        {formatEATDisplay(inv.serviceDate) || "—"}
      </td>
      <td className="whitespace-nowrap text-xs text-fleet-gray-500">{inv.period || "—"}</td>
      <td className="whitespace-nowrap font-mono font-medium">{fmtN(inv.total)}</td>
      {showNote && (
        <td className="max-w-[180px] truncate text-xs text-fleet-gray-600">{inv.clientNote || "—"}</td>
      )}
      <td className="whitespace-nowrap">
        <Badge variant={inv.status}>{inv.status}</Badge>
      </td>
      <td>
        <div className="flex flex-wrap gap-1 sm:flex-nowrap">
          <button type="button" className="btn-secondary btn-sm shrink-0" title="View invoice" onClick={onView}>
            <IconEye size={14} />
          </button>
          {canReject && (
            <button type="button" className="btn-secondary btn-sm shrink-0" title="Reject with note" onClick={onReject}>
              <IconArrowBackUp size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
