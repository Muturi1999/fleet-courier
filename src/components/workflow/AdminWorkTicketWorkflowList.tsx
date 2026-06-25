"use client";

import { useEffect, useState } from "react";
import { IconEye } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkTicketDocument } from "@/components/work-tickets/WorkTicketDocument";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { formatEATDisplay } from "@/lib/dates";
import type { WorkTicket, WorkTicketStatus } from "@/lib/types";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";

export function AdminWorkTicketWorkflowList({ workflow }: { workflow: "approved" | "rejected" }) {
  const status: WorkTicketStatus = workflow;
  const { screen, isList, openView, close } = usePageScreen();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [viewRecord, setViewRecord] = useState<WorkTicket | null>(null);

  const listKey = JSON.stringify({ filters, workflow });
  const { items, meta, loading, fetchOne, totalPages, from, to } = usePaginatedList<WorkTicket>("work-tickets", {
    page,
    filters,
    status,
  });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    if (screen.kind !== "view") {
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

  if (screen.kind === "view" && viewRecord) {
    return (
      <RecordScreen
        crumbs={[
          { label: "Work tickets", onClick: close },
          { label: workflow === "approved" ? "Approved" : "Rejected" },
          { label: viewRecord.serialNo },
        ]}
        title={`Work ticket ${viewRecord.serialNo}`}
        onBack={close}
      >
        {workflow === "rejected" && viewRecord.clientNote && (
          <div className="card mb-4 border-fleet-red/20 bg-fleet-red/5 text-sm text-fleet-gray-700">
            <p className="mb-1 text-xs font-semibold uppercase text-fleet-red">Partner feedback</p>
            {viewRecord.clientNote}
          </div>
        )}
        <WorkTicketDocument ticket={viewRecord} />
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <WorkflowPageHeader
        title={workflow === "approved" ? "Approved work tickets" : "Rejected work tickets"}
        subtitle={
          workflow === "approved"
            ? "Work tickets approved by G4S"
            : "Work tickets returned by G4S — review partner notes"
        }
        parentHref="/admin/work-tickets"
        parentLabel="Work tickets"
      />

      <FilterBar filters={filters} onChange={setFilters} fields={["search", "date"]} resultCount={meta.total} />

      <div className="table-wrap">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Amount</th>
              {workflow === "rejected" && <th>Partner note</th>}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={workflow === "rejected" ? 8 : 7} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={workflow === "rejected" ? 8 : 7} className="py-8 text-center text-fleet-gray-400">
                  No {workflow} work tickets
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
                  {workflow === "rejected" && (
                    <td className="max-w-[180px] truncate text-xs">{t.clientNote || "—"}</td>
                  )}
                  <td>
                    <Badge variant={t.status === "approved" ? "approved" : t.status === "sent" ? "sent" : t.status === "rejected" ? "rejected" : "draft"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openView(t.id)}>
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
