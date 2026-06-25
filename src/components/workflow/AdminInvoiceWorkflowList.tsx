"use client";

import { useEffect, useState } from "react";
import { IconEdit, IconEye, IconMessage } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { WorkflowPageHeader } from "@/components/workflow/WorkflowPageHeader";
import { clearedFilters } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import { formatEATDisplay } from "@/lib/dates";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { usePageScreen } from "@/hooks/usePageScreen";
import { useBillingProfile } from "@/hooks/useBillingProfile";

export function AdminInvoiceWorkflowList({ workflow }: { workflow: "approved" | "rejected" }) {
  const status: InvoiceStatus = workflow;
  const { profile } = useBillingProfile();
  const { screen, isList, openView, close } = usePageScreen();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [viewRecord, setViewRecord] = useState<Invoice | null>(null);

  const listKey = JSON.stringify({ filters, workflow });
  const { items, meta, loading, fetchOne, totalPages, from, to } = usePaginatedList<Invoice>("invoices", {
    page,
    filters,
    status,
  });

  useEffect(() => {
    setPage(1);
  }, [listKey]);

  useEffect(() => {
    if (screen.kind !== "view" && screen.kind !== "edit") {
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
          { label: "Invoices", onClick: close },
          { label: workflow === "approved" ? "Approved" : "Rejected" },
          { label: viewRecord.invoiceNo },
        ]}
        title={`Invoice ${viewRecord.invoiceNo}`}
        onBack={close}
      >
        {workflow === "rejected" && viewRecord.clientNote && (
          <div className="card mb-4 border-fleet-red/20 bg-fleet-red/5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fleet-red">
              <IconMessage size={14} /> Partner feedback
            </p>
            <p className="text-sm text-fleet-gray-700">{viewRecord.clientNote}</p>
          </div>
        )}
        <InvoiceDocument invoice={viewRecord} profile={profile ?? undefined} />
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <WorkflowPageHeader
        title={workflow === "approved" ? "Approved invoices" : "Rejected invoices"}
        subtitle={
          workflow === "approved"
            ? "Invoices approved by G4S — shared workflow complete"
            : "Invoices returned by G4S — review feedback, edit, and share again"
        }
        parentHref="/admin/invoices"
        parentLabel="Invoices"
      />

      <FilterBar filters={filters} onChange={setFilters} fields={["search", "destination", "date"]} resultCount={meta.total} />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Date</th>
              <th>Total</th>
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
                  No {workflow} invoices match filters
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono font-medium">{inv.invoiceNo}</td>
                  <td className="font-mono">{inv.plate}</td>
                  <td className="max-w-[160px] truncate text-xs">{inv.route}</td>
                  <td className="whitespace-nowrap text-xs">{formatEATDisplay(inv.serviceDate) || "—"}</td>
                  <td className="font-mono font-medium">{inv.total.toLocaleString()}</td>
                  {workflow === "rejected" && (
                    <td className="max-w-[200px] truncate text-xs text-fleet-gray-600" title={inv.clientNote}>
                      {inv.clientNote || "—"}
                    </td>
                  )}
                  <td>
                    <Badge variant={inv.status}>{inv.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-secondary btn-sm" title="View" onClick={() => openView(inv.id)}>
                        <IconEye size={14} />
                      </button>
                      {workflow === "rejected" && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          title="Edit & correct"
                          onClick={() => {
                            sessionStorage.setItem("fleet-open-invoice-edit", inv.id);
                            window.location.href = "/admin/invoices";
                          }}
                        >
                          <IconEdit size={14} />
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
