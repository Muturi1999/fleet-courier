"use client";

import { useEffect, useState } from "react";
import { IconArrowBackUp, IconCheck, IconEye } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkTicketDocument } from "@/components/work-tickets/WorkTicketDocument";
import { ClientPortalFilterBar } from "@/components/client/ClientPortalFilterBar";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { defaultClientFilters, type ClientPortalFilters } from "@/lib/client-portal-filters";
import { formatEATDisplay } from "@/lib/dates";
import type { WorkTicket } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";

export type ClientWorkTicketMode = "main" | "approved" | "rejected";

export function ClientWorkTicketsPanel({ mode }: { mode: ClientWorkTicketMode }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ClientPortalFilters>(defaultClientFilters());
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTicket, setViewTicket] = useState<WorkTicket | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const status = mode === "approved" ? "approved" : mode === "rejected" ? "rejected" : mode === "main" ? "sent" : undefined;

  const listKey = JSON.stringify({ filters, mode, status });
  const {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    totalPages,
    from,
    to,
  } = usePaginatedList<WorkTicket>("clients/work-tickets", {
    page,
    filters: { ...filters, status: status ?? filters.status },
    status,
  });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    if (!viewId) {
      setViewTicket(null);
      return;
    }
    const found = items.find((t) => t.id === viewId);
    if (found) {
      setViewTicket(found);
      return;
    }
    fetchOne(viewId).then(setViewTicket);
  }, [viewId, items, fetchOne]);

  const approve = async (t: WorkTicket, clientNote?: string) => {
    const res = await fetch(`/api/clients/work-tickets/${t.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clientNote }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      toast(err.message ?? err.error ?? "Approval failed");
      return;
    }
    await refreshPage();
    toast(`Work ticket ${t.serialNo} approved`);
    setViewId(null);
  };

  const reject = async (t: WorkTicket, note: string) => {
    const res = await fetch(`/api/clients/work-tickets/${t.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clientNote: note }),
    });
    if (!res.ok) {
      toast("Return failed");
      return;
    }
    await refreshPage();
    toast(`Work ticket ${t.serialNo} returned to Fleet Admin`);
    setViewId(null);
    setRejectNote("");
  };

  if (viewId) {
    if (!viewTicket) {
      return (
        <RecordScreen
          crumbs={[{ label: "Work tickets", onClick: () => setViewId(null) }, { label: "…" }]}
          title="Work ticket"
          onBack={() => setViewId(null)}
        >
          <p className="py-8 text-center text-fleet-gray-400">Loading…</p>
        </RecordScreen>
      );
    }
    return (
      <RecordScreen
        crumbs={[
          { label: "Work tickets", onClick: () => setViewId(null) },
          { label: viewTicket.serialNo },
        ]}
        title={`Work ticket ${viewTicket.serialNo}`}
        onBack={() => setViewId(null)}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
          <WorkTicketDocument ticket={viewTicket} compact />
          {viewTicket.status === "sent" && mode === "main" && (
            <div className="card sticky top-4 h-fit space-y-3">
              <p className="text-sm text-fleet-gray-600">
                Review this vehicle work ticket from Road Network Transporters. Approve when it matches your records.
              </p>
              <button type="button" className="btn-accent w-full" onClick={() => approve(viewTicket)}>
                <IconCheck size={16} /> Approve work ticket
              </button>
              <input
                className="input w-full"
                placeholder="Note if returning (required)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => reject(viewTicket, rejectNote)}
              >
                <IconArrowBackUp size={16} /> Return to Fleet Admin
              </button>
            </div>
          )}
        </div>
      </RecordScreen>
    );
  }

  const showHeader = mode !== "main";

  return (
    <>
      {showHeader && (
        <WorkflowPageHeader
          title={mode === "approved" ? "Approved work tickets" : "Rejected work tickets"}
          subtitle={
            mode === "approved"
              ? "Work tickets you have approved"
              : "Work tickets returned to Fleet Admin"
          }
          parentHref="/client/work-tickets"
          parentLabel="Work tickets"
        />
      )}

      {mode === "main" && (
        <div className="section-header">
          <div>
            <h2 className="text-[15px] font-semibold">Work tickets awaiting review</h2>
            <p className="text-xs text-fleet-gray-400">Vehicle work tickets from Road Network Transporters</p>
          </div>
        </div>
      )}

      <ClientPortalFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={meta.total}
        showPeriod={false}
        showClass={false}
      />

      <div className="table-wrap">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Amount</th>
              {mode === "rejected" && <th>Your note</th>}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={mode === "rejected" ? 8 : 7} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={mode === "rejected" ? 8 : 7} className="py-8 text-center text-fleet-gray-400">
                  No work tickets
                </td>
              </tr>
            ) : (
              items.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono font-semibold text-[#c41e1e]">{t.serialNo}</td>
                    <td className="text-xs">{formatEATDisplay(t.tripDate)}</td>
                    <td className="font-mono">{t.plate}</td>
                    <td className="max-w-[140px] truncate text-xs">{t.route}</td>
                    <td className="font-mono">{t.total.toLocaleString()}</td>
                    {mode === "rejected" && (
                      <td className="max-w-[180px] truncate text-xs">{t.clientNote || "—"}</td>
                    )}
                    <td>
                      <Badge variant={t.status === "approved" ? "approved" : t.status === "sent" ? "sent" : t.status === "rejected" ? "rejected" : "draft"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => setViewId(t.id)}>
                        <IconEye size={14} />
                      </button>
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
