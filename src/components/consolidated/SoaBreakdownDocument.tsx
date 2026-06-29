"use client";

import { ConsolidationBreakdownTable } from "@/components/consolidated/ConsolidationBreakdownTable";
import {
  breakdownPeriodTitle,
  groupBreakdownByVehicle,
  mapTicketsToBreakdownLines,
} from "@/lib/consolidation-breakdown";
import { formatDocDate } from "@/lib/consolidation";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";

export function SoaBreakdownDocument({
  invoice,
  tickets,
}: {
  invoice: ConsolidatedInvoice;
  tickets: WorkTicket[];
}) {
  const lines = mapTicketsToBreakdownLines(tickets);
  const isPeriodBatch =
    invoice.consolidationType === "period" || (!invoice.plate?.trim() && lines.length > 0);
  const layout = isPeriodBatch ? "byVehicle" : "flat";
  const periodTitle = breakdownPeriodTitle(invoice.periodStart, invoice.periodEnd);

  return (
    <div className="consolidated-doc consolidated-soa" id="soa-breakdown-print">
      <div className="consolidated-doc-title">{periodTitle}</div>
      <p className="mb-3 text-center text-[12px] text-fleet-gray-500">
        Consolidated trip breakdown · Ref {invoice.refNo} ·{" "}
        {formatDocDate(invoice.periodStart)} – {formatDocDate(invoice.periodEnd)}
        {invoice.plate?.trim() ? ` · ${invoice.plate}` : ""}
      </p>

      <ConsolidationBreakdownTable
        lines={lines}
        layout={layout}
        grandNet={invoice.net}
        grandTotal={invoice.total}
      />

      {isPeriodBatch && lines.length > 0 && (
        <p className="consolidated-doc-note mt-3">
          {groupBreakdownByVehicle(lines).length} vehicle(s) · {lines.length} work ticket(s)
        </p>
      )}
    </div>
  );
}
