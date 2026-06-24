"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconEye } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkTicketDocument } from "@/components/work-tickets/WorkTicketDocument";
import { formatEATDisplay } from "@/lib/dates";
import type { WorkTicket } from "@/lib/types";
import { sumLegDistances } from "@/lib/work-ticket-meta";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";

export default function ClientWorkTicketsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTicket, setViewTicket] = useState<WorkTicket | null>(null);

  const {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    totalPages,
    from,
    to,
  } = usePaginatedList<WorkTicket>("clients/work-tickets", { page, filters: { search: "", destination: "", runType: "", shift: "", date: "", status: "" } });

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
          {viewTicket.status === "sent" && (
            <div className="card sticky top-4 h-fit">
              <p className="mb-3 text-sm text-fleet-gray-600">
                Review this vehicle work ticket from Road Network Transporters. Approve when it matches your records.
              </p>
              <button type="button" className="btn-accent w-full" onClick={() => approve(viewTicket)}>
                <IconCheck size={16} /> Approve work ticket
              </button>
            </div>
          )}
        </div>
      </RecordScreen>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-fleet-gray-500">
        Vehicle work tickets shared by Road Network Transporters for G4S reconciliation.
      </p>

      <div className="table-wrap">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Distance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fleet-gray-400">
                  No work tickets shared yet
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold text-[#c41e1e]">{t.serialNo}</td>
                  <td className="text-xs">{formatEATDisplay(t.tripDate)}</td>
                  <td className="font-mono">{t.plate}</td>
                  <td>{t.driverName}</td>
                  <td className="max-w-[140px] truncate text-xs">{t.route}</td>
                  <td className="font-mono text-xs">{t.officialKm || sumLegDistances(t.legs)} km</td>
                  <td>
                    <Badge variant={t.status === "approved" ? "approved" : "sent"}>{t.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" title="View" onClick={() => setViewId(t.id)}>
                        <IconEye size={14} />
                      </button>
                      {t.status === "sent" && (
                        <button type="button" className="btn-accent btn-sm" title="Approve" onClick={() => approve(t)}>
                          <IconCheck size={14} />
                        </button>
                      )}
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
