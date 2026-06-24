"use client";

import { IconPrinter } from "@tabler/icons-react";
import type { ConsolidatedInvoice } from "@/lib/types";
import { INVOICE_DEFAULTS } from "@/lib/invoice-meta";
import {
  BILLING_PARTIES,
  CONSOLIDATED_PAYMENT_TERMS,
  formatDocDate,
  formatPeriodRange,
} from "@/lib/consolidation";

function fmt(n: number) {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConsolidatedInvoiceDocument({
  invoice,
  onPrint,
}: {
  invoice: ConsolidatedInvoice;
  onPrint?: () => void;
}) {
  const paymentWindow =
    invoice.paymentWindowFrom && invoice.paymentWindowTo
      ? `${formatDocDate(invoice.paymentWindowFrom)} to ${formatDocDate(invoice.paymentWindowTo)}`
      : "On G4S approval (90–100 days from sign-off)";

  return (
    <div className="consolidated-doc" id="consolidated-invoice-print">
      <div className="consolidated-doc-title">CONSOLIDATED TAX INVOICE</div>

      <div className="consolidated-doc-header">
        <div>
          <div className="consolidated-doc-brand">{BILLING_PARTIES.supplier.name}</div>
          <p className="consolidated-doc-meta">{BILLING_PARTIES.supplier.address}</p>
          <p className="consolidated-doc-meta">PIN: {BILLING_PARTIES.supplier.pin}</p>
          <p className="consolidated-doc-meta">V.A.T No: {BILLING_PARTIES.supplier.vatNo}</p>
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
        <p className="font-semibold">{BILLING_PARTIES.client.legalName}</p>
        <p className="consolidated-doc-meta">
          {BILLING_PARTIES.client.address}, {BILLING_PARTIES.client.city}
        </p>
        <p className="consolidated-doc-meta">PIN: {BILLING_PARTIES.client.pin}</p>
        <p className="consolidated-doc-meta">eTIMS / VAT registered</p>
      </div>

      <div className="consolidated-doc-terms grid gap-2 text-[12px] sm:grid-cols-2">
        <div><span className="text-fleet-gray-400">Payment terms</span><p className="font-medium">{CONSOLIDATED_PAYMENT_TERMS.label}</p></div>
        <div><span className="text-fleet-gray-400">Expected payment window</span><p className="font-medium">{paymentWindow}</p></div>
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
            <th colSpan={3} className="text-right">VAT ({BILLING_PARTIES.vatRate}%)</th>
            <td className="text-right font-mono">{fmt(invoice.vat)}</td>
          </tr>
          <tr className="consolidated-doc-grand">
            <th colSpan={3} className="text-right">Total Due</th>
            <td className="text-right font-mono font-bold">{fmt(invoice.total)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="consolidated-doc-note">
        Attached: G4S Delivery Breakdown Schedule (SOA {invoice.refNo}) listing {invoice.totalTrips} verified work tickets.
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
