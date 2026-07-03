"use client";

import { IconPrinter } from "@tabler/icons-react";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import type { ConsolidatedInvoice } from "@/lib/types";
import { CLIENT, INVOICE_DEFAULTS, SUPPLIER } from "@/lib/invoice-meta";
import {
  CONSOLIDATED_PAYMENT_TERMS,
  formatDocDate,
  formatPeriodRange,
} from "@/lib/consolidation";
import { breakdownPeriodTitle } from "@/lib/consolidation-breakdown";
import { toNum } from "@/lib/utils";

function fmt(n: number | string | null | undefined) {
  return toNum(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConsolidatedInvoiceDocument({
  invoice,
  onPrint,
}: {
  invoice: ConsolidatedInvoice;
  onPrint?: () => void;
}) {
  const { profile } = useBillingProfile();
  const supplier = profile?.supplier ?? SUPPLIER;
  const client = profile?.client ?? CLIENT;
  const periodTitle = breakdownPeriodTitle(invoice.periodStart, invoice.periodEnd);

  return (
    <div className="consolidated-doc" id="consolidated-invoice-print">
      <div className="consolidated-doc-title">CONSOLIDATED TAX INVOICE</div>

      <div className="consolidated-doc-header">
        <div>
          <div className="consolidated-doc-brand">{supplier.name}</div>
          <p className="consolidated-doc-meta">{supplier.address}</p>
          <p className="consolidated-doc-meta">PIN: {supplier.pin}</p>
          <p className="consolidated-doc-meta">V.A.T No: {supplier.vatNo}</p>
        </div>
        <div className="text-right text-[12px]">
          <div><span className="text-fleet-gray-400">Serial No.</span> <strong className="font-mono">{invoice.invoiceNo}</strong></div>
          <div className="mt-1"><span className="text-fleet-gray-400">Date</span> <strong>{formatDocDate(invoice.invoiceDate)}</strong></div>
          {invoice.plate && (
            <div className="mt-1"><span className="text-fleet-gray-400">Vehicle</span> <strong className="font-mono">{invoice.plate}</strong></div>
          )}
        </div>
      </div>

      <div className="consolidated-doc-party">
        <p className="consolidated-doc-label">Invoice To</p>
        <p className="font-semibold">{client.legalName ?? client.name}</p>
        <p className="consolidated-doc-meta">{client.address}</p>
        {client.city?.trim() && <p className="consolidated-doc-meta">{client.city}</p>}
        <p className="consolidated-doc-meta">PIN: {client.pin}</p>
        <p className="consolidated-doc-meta">eTIMS / VAT registered</p>
      </div>

      <div className="consolidated-doc-terms text-[12px]">
        <span className="text-fleet-gray-400">Payment terms</span>
        <p className="font-medium">{CONSOLIDATED_PAYMENT_TERMS.label}</p>
      </div>

      <table className="consolidated-doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Period</th>
            <th className="text-center">Total Trips</th>
            <th className="text-right">Amount (KES)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{invoice.description}</td>
            <td>{formatPeriodRange(invoice.periodStart, invoice.periodEnd)}</td>
            <td className="text-center font-mono">{invoice.totalTrips}</td>
            <td className="text-right font-mono">{fmt(invoice.net)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3} className="text-right">Sub-Total</th>
            <td className="text-right font-mono font-semibold">{fmt(invoice.net)}</td>
          </tr>
          <tr>
            <th colSpan={3} className="text-right">VAT ({INVOICE_DEFAULTS.vatRate}%)</th>
            <td className="text-right font-mono">{fmt(invoice.vat)}</td>
          </tr>
          <tr className="consolidated-doc-grand">
            <th colSpan={3} className="text-right">Total Due</th>
            <td className="text-right font-mono font-bold">{fmt(invoice.total)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="consolidated-doc-note">
        Attached: {periodTitle} breakdown schedule (ref {invoice.refNo}) — {invoice.totalTrips} work ticket(s).
      </p>

      <p className="consolidated-doc-etims print:hidden">{INVOICE_DEFAULTS.etimsNote}</p>

      {onPrint && (
        <div className="mt-4 flex justify-end print:hidden">
          <button type="button" className="btn-accent btn-sm" onClick={onPrint}>
            <IconPrinter size={14} /> Print / Save PDF
          </button>
        </div>
      )}
    </div>
  );
}

export function printConsolidatedBilling() {
  window.print();
}
