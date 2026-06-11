"use client";

import { buildSoaLines } from "@/lib/consolidation";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";
import { formatDocDate } from "@/lib/consolidation";

function fmt(n: number) {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SoaBreakdownDocument({
  invoice,
  tickets,
}: {
  invoice: ConsolidatedInvoice;
  tickets: WorkTicket[];
}) {
  const lines = buildSoaLines(tickets);

  return (
    <div className="consolidated-doc consolidated-soa" id="soa-breakdown-print">
      <div className="consolidated-doc-title">G4S DELIVERY BREAKDOWN SCHEDULE</div>
      <p className="mb-3 text-center text-[12px] text-fleet-gray-500">
        Statement of Account · Ref {invoice.refNo} · Period {formatDocDate(invoice.periodStart)} – {formatDocDate(invoice.periodEnd)}
      </p>

      <table className="consolidated-doc-table text-[11px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Work Ticket #</th>
            <th>Vehicle Reg</th>
            <th>Route / Destination</th>
            <th>Driver</th>
            <th>G4S Gate Pass / Ref</th>
            <th className="text-right">Special Rate (KES)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.workTicketId}>
              <td className="whitespace-nowrap">{formatDocDate(line.tripDate)}</td>
              <td className="font-mono font-semibold text-[#c41e1e]">{line.serialNo}</td>
              <td className="font-mono">{line.plate}</td>
              <td>{line.route}</td>
              <td>{line.driverName}</td>
              <td className="font-mono text-xs">{line.gatePassRef}</td>
              <td className="text-right font-mono">{fmt(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="consolidated-doc-grand">
            <th colSpan={6} className="text-right">TOTAL</th>
            <td className="text-right font-mono font-bold">{fmt(invoice.net)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
