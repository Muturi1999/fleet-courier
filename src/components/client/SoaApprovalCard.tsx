"use client";

import { IconSignature } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import type { ConsolidatedInvoice } from "@/lib/types";
import { CONSOLIDATED_PAYMENT_TERMS, formatPeriodRange } from "@/lib/consolidation";
import { fmtN } from "@/lib/utils";

export function SoaApprovalCard({
  invoice,
  onApprove,
  onView,
}: {
  invoice: ConsolidatedInvoice | null;
  onApprove: () => void;
  onView?: () => void;
}) {
  if (!invoice) return null;

  const approved = invoice.status === "approved" || invoice.status === "paid";

  return (
    <div className="card mb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-fleet-gray-800">
            Consolidated invoice &amp; SOA approval
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
            <div>
              <p className="text-fleet-gray-400">SOA reference</p>
              <p className="font-mono font-medium">{invoice.refNo}</p>
            </div>
            <div>
              <p className="text-fleet-gray-400">Grand total</p>
              <p className="font-mono font-semibold text-navy">KES {fmtN(invoice.total)}</p>
            </div>
            <div>
              <p className="text-fleet-gray-400">Status</p>
              <Badge variant={approved ? "approved" : "pending"}>
                {approved ? "Approved" : "Pending G4S"}
              </Badge>
            </div>
            <div className="hidden sm:block">
              <p className="text-fleet-gray-400">Period</p>
              <p className="font-medium text-xs">{formatPeriodRange(invoice.periodStart, invoice.periodEnd)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-fleet-gray-400">
            {invoice.totalTrips} trips · Invoice {invoice.invoiceNo} · {CONSOLIDATED_PAYMENT_TERMS.label} — review breakdown before sign-off
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          {onView && (
            <button type="button" className="btn-secondary w-full" onClick={onView}>
              View invoice &amp; SOA
            </button>
          )}
          <button
            type="button"
            className="btn-accent w-full"
            disabled={approved || invoice.status !== "pending_approval"}
            onClick={onApprove}
          >
            <IconSignature size={16} /> {approved ? "Approved" : `Approve SOA ${invoice.refNo}`}
          </button>
        </div>
      </div>
    </div>
  );
}
