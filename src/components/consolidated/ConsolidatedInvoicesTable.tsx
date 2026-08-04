"use client";

import {
  IconDownload,
  IconEdit,
  IconEye,
  IconFileSpreadsheet,
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

function vehicleLabel(inv: ConsolidatedInvoice): string {
  if (inv.consolidationType === "period" || (!inv.plate?.trim() && inv.consolidationType !== "vehicle")) {
    return "Period batch";
  }
  return inv.plate?.trim() || "—";
}

function ActionButtons({
  inv,
  dense = false,
  onView,
  onPrint,
  onDownload,
  onDownloadExcel,
  onShare,
  onDelete,
  onEdit,
}: {
  inv: ConsolidatedInvoice;
  dense?: boolean;
  onView: (id: string) => void;
  onPrint?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDownloadExcel?: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const btn = dense
    ? "btn-secondary btn-sm shrink-0 px-2"
    : "btn-secondary btn-sm min-h-9 min-w-9 shrink-0 justify-center px-2.5";

  return (
    <div className={`flex flex-wrap ${dense ? "justify-end gap-1" : "gap-1.5"}`}>
      <button type="button" className={btn} title="View" aria-label="View" onClick={() => onView(inv.id)}>
        <IconEye size={14} />
        {!dense && <span className="sm:hidden">View</span>}
      </button>
      {onPrint && (
        <button type="button" className={btn} title="Print" aria-label="Print" onClick={() => onPrint(inv.id)}>
          <IconPrinter size={14} />
          {!dense && <span className="sm:hidden">Print</span>}
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          className={btn}
          title="Download PDF"
          aria-label="Download PDF"
          onClick={() => onDownload(inv.id)}
        >
          <IconDownload size={14} />
          {!dense && <span className="sm:hidden">PDF</span>}
        </button>
      )}
      {onDownloadExcel && (
        <button
          type="button"
          className={btn}
          title="Download Excel"
          aria-label="Download Excel"
          onClick={() => onDownloadExcel(inv.id)}
        >
          <IconFileSpreadsheet size={14} />
          {!dense && <span className="sm:hidden">Excel</span>}
        </button>
      )}
      {(inv.status === "rejected" || inv.status === "draft") && onEdit && !inv.supersededById && (
        <button type="button" className={btn} title="Revise" aria-label="Revise" onClick={() => onEdit(inv.id)}>
          <IconEdit size={14} />
          {!dense && <span className="sm:hidden">Revise</span>}
        </button>
      )}
      {inv.status === "draft" && (
        <>
          <button
            type="button"
            className={dense ? "btn-accent btn-sm shrink-0 px-2" : "btn-accent btn-sm min-h-9 shrink-0 px-2.5"}
            title="Share with partner"
            aria-label="Share with partner"
            onClick={() => onShare(inv.id)}
          >
            <IconSend size={14} />
            {!dense && <span className="sm:hidden">Share</span>}
          </button>
          <button
            type="button"
            className={`${btn} text-fleet-red`}
            title="Delete"
            aria-label="Delete"
            onClick={() => onDelete(inv.id)}
          >
            <IconTrash size={14} />
            {!dense && <span className="sm:hidden">Delete</span>}
          </button>
        </>
      )}
    </div>
  );
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
  onDownloadExcel,
  onShare,
  onDelete,
  onEdit,
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
  onPrint?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDownloadExcel?: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const actions = {
    onView,
    onPrint,
    onDownload,
    onDownloadExcel,
    onShare,
    onDelete,
    onEdit,
  };

  if (loading) {
    return (
      <>
        <div className="rounded-fleet border border-fleet-gray-100 bg-white px-4 py-10 text-center text-sm text-fleet-gray-400">
          Loading…
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} onPage={onPage} />
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-fleet border border-fleet-gray-100 bg-white px-4 py-10 text-center text-sm text-fleet-gray-400">
          {emptyMessage}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} onPage={onPage} />
      </>
    );
  }

  return (
    <>
      {/* Mobile / tablet: stacked cards — never clips actions */}
      <div className="space-y-3 lg:hidden">
        {rows.map((inv) => {
          const payment = describePaymentCountdown(inv);
          const highlighted = highlightId === inv.id;
          return (
            <article
              key={inv.id}
              className={`rounded-fleet border bg-white p-3.5 xs:p-4 ${
                highlighted ? "border-teal/40 ring-1 ring-teal/30" : "border-fleet-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-navy">{inv.invoiceNo}</p>
                  <p className="mt-0.5 text-xs text-fleet-gray-400">{vehicleLabel(inv)}</p>
                </div>
                {statusBadge(inv.status)}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-fleet-gray-400">Date</dt>
                  <dd className="mt-0.5 font-medium text-fleet-gray-800">
                    {formatEATDisplay(inv.createdAt ?? inv.invoiceDate)}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-fleet-gray-400">Period</dt>
                  <dd className="mt-0.5 truncate font-medium text-fleet-gray-800" title={formatPeriodRange(inv.periodStart, inv.periodEnd)}>
                    {formatPeriodRange(inv.periodStart, inv.periodEnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-fleet-gray-400">Trips</dt>
                  <dd className="mt-0.5 font-mono font-medium text-fleet-gray-800">{inv.totalTrips}</dd>
                </div>
                <div>
                  <dt className="text-fleet-gray-400">Total</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-navy">KES {fmtN(inv.total)}</dd>
                </div>
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <dt className="text-fleet-gray-400">Payment</dt>
                  <dd className="mt-0.5 truncate text-fleet-gray-600" title={payment ?? undefined}>
                    {payment ?? "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-fleet-gray-50 pt-3">
                <ActionButtons inv={inv} {...actions} />
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop: full table with sticky actions */}
      <div className="table-wrap hidden border-0 lg:block">
        <table className="data-table !min-w-0 w-full text-xs">
          <thead>
            <tr>
              <th>Serial</th>
              <th className="hidden xl:table-cell">Vehicle</th>
              <th>Date</th>
              <th>Period</th>
              <th className="text-center">Trips</th>
              <th className="text-right">Total (KES)</th>
              <th>Status</th>
              <th className="hidden xl:table-cell">Payment</th>
              <th className="sticky right-0 z-[2] bg-fleet-gray-50 text-right shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr
                key={inv.id}
                className={`group ${highlightId === inv.id ? "bg-teal/5 ring-1 ring-inset ring-teal/30" : ""}`}
              >
                <td className="whitespace-nowrap font-mono font-semibold text-navy">{inv.invoiceNo}</td>
                <td className="hidden whitespace-nowrap font-mono xl:table-cell">{vehicleLabel(inv)}</td>
                <td className="whitespace-nowrap">{formatEATDisplay(inv.createdAt ?? inv.invoiceDate)}</td>
                <td className="max-w-[160px] truncate" title={formatPeriodRange(inv.periodStart, inv.periodEnd)}>
                  {formatPeriodRange(inv.periodStart, inv.periodEnd)}
                </td>
                <td className="text-center font-mono">{inv.totalTrips}</td>
                <td className="whitespace-nowrap text-right font-mono font-semibold">{fmtN(inv.total)}</td>
                <td className="whitespace-nowrap">{statusBadge(inv.status)}</td>
                <td
                  className="hidden max-w-[140px] truncate text-xs text-fleet-gray-400 xl:table-cell"
                  title={describePaymentCountdown(inv) ?? undefined}
                >
                  {describePaymentCountdown(inv) ?? "—"}
                </td>
                <td className="sticky right-0 z-[1] bg-white py-2 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)] group-hover:bg-fleet-gray-50">
                  <ActionButtons inv={inv} dense {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} from={from} to={to} onPage={onPage} />
    </>
  );
}
