"use client";

import {
  IconDownload,
  IconEye,
  IconPrinter,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { describePaymentCountdown, formatPeriodRange } from "@/lib/consolidation";
import { formatEATDisplay } from "@/lib/dates";
import type { ConsolidatedInvoice } from "@/lib/types";
import { fmtN } from "@/lib/utils";

function statusBadge(status: ConsolidatedInvoice["status"]) {
  const map: Record<
    ConsolidatedInvoice["status"],
    { variant: "draft" | "pending" | "approved" | "paid" | "rejected"; label: string }
  > = {
    draft: { variant: "draft", label: "Draft" },
    pending_approval: { variant: "pending", label: "Pending approval" },
    approved: { variant: "approved", label: "Approved" },
    paid: { variant: "paid", label: "Paid" },
    rejected: { variant: "rejected", label: "Rejected" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function ConsolidatedInvoicesTable({
  rows,
  loading,
  page,
  totalPages,
  total,
  from,
  to,
  onPage,
  highlightId,
  emptyMessage,
  onView,
  onPrint,
  onDownload,
  onShare,
  onDelete,
}: {
  rows: ConsolidatedInvoice[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPage: (p: number) => void;
  highlightId?: string | null;
  emptyMessage: string;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="table-wrap border-0">
        <table className="data-table text-xs">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Vehicle</th>
              <th>Date</th>
              <th>Period</th>
              <th className="text-center">Trips</th>
              <th className="text-right">Total (KES)</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((inv) => (
                <tr
                  key={inv.id}
                  className={highlightId === inv.id ? "bg-teal/5 ring-1 ring-inset ring-teal/30" : undefined}
                >
                  <td className="font-mono font-semibold text-navy">{inv.invoiceNo}</td>
                  <td className="font-mono">
                    {inv.consolidationType === "period" || (!inv.plate?.trim() && inv.consolidationType !== "vehicle")
                      ? "Period batch"
                      : (inv.plate ?? "—")}
                  </td>
                  <td className="whitespace-nowrap">{formatEATDisplay(inv.createdAt ?? inv.invoiceDate)}</td>
                  <td className="max-w-[180px] truncate" title={formatPeriodRange(inv.periodStart, inv.periodEnd)}>
                    {formatPeriodRange(inv.periodStart, inv.periodEnd)}
                  </td>
                  <td className="text-center font-mono">{inv.totalTrips}</td>
                  <td className="text-right font-mono font-semibold">{fmtN(inv.total)}</td>
                  <td>{statusBadge(inv.status)}</td>
                  <td className="text-xs text-fleet-gray-400">{describePaymentCountdown(inv) ?? "—"}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-secondary btn-sm px-2" title="View" onClick={() => onView(inv.id)}>
                        <IconEye size={14} />
                      </button>
                      <button type="button" className="btn-secondary btn-sm px-2" title="Print" onClick={() => onPrint(inv.id)}>
                        <IconPrinter size={14} />
                      </button>
                      <button type="button" className="btn-secondary btn-sm px-2" title="Download PDF" onClick={() => onDownload(inv.id)}>
                        <IconDownload size={14} />
                      </button>
                      {inv.status === "draft" && (
                        <>
                          <button type="button" className="btn-accent btn-sm px-2" title="Share with partner" onClick={() => onShare(inv.id)}>
                            <IconSend size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm px-2 text-fleet-red"
                            title="Delete"
                            onClick={() => onDelete(inv.id)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} onPage={onPage} />
    </>
  );
}
