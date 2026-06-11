"use client";

import { IconPrinter } from "@tabler/icons-react";
import type { Invoice } from "@/lib/types";
import {
  CLIENT,
  INVOICE_DEFAULTS,
  SUPPLIER,
  buildParticulars,
  formatInvoiceNumber,
  formatRntDate,
  invoiceIssueDate,
  splitAmountKshsCts,
  unitRate,
} from "@/lib/invoice-meta";

function fmtWhole(n: number) {
  return Math.round(n).toLocaleString("en-KE");
}

function TruckLogo() {
  return (
    <svg className="rnt-logo" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fill="currentColor"
        d="M14 38h28v-4l4-8h8v12h-4a6 6 0 1 1-12 0H22a6 6 0 1 1-12 0H8v-4h6l4-8h12v8zm6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm22 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      />
    </svg>
  );
}

export function InvoiceDocument({
  invoice,
  onPrint,
  compact,
}: {
  invoice: Invoice;
  onPrint?: () => void;
  compact?: boolean;
}) {
  const issueDate = formatRntDate(invoiceIssueDate(invoice));
  const invoiceNumber = formatInvoiceNumber(invoice.invoiceNo);
  const rate = unitRate(invoice.net, invoice.days);
  const lineAmount = splitAmountKshsCts(invoice.net);
  const subtotal = splitAmountKshsCts(invoice.net);
  const vatAmt = splitAmountKshsCts(invoice.vat);
  const totalAmt = splitAmountKshsCts(invoice.total);
  const particulars = buildParticulars(invoice);

  return (
    <div
      className={`rnt-invoice ${compact ? "rnt-invoice-compact" : "rnt-invoice-sheet"}`}
      id="invoice-print-root"
    >
      <div className="rnt-invoice-title-wrap">
        <div className="rnt-invoice-title">INVOICE</div>
      </div>

      <div className="rnt-invoice-head">
        <div className="rnt-invoice-brand">
          <TruckLogo />
          <div>
            <div className="rnt-invoice-company">{SUPPLIER.name}</div>
            <p className="rnt-invoice-line">{SUPPLIER.address}</p>
            <p className="rnt-invoice-line">{SUPPLIER.phone}</p>
          </div>
        </div>
        <div className="rnt-invoice-date">
          <span className="rnt-invoice-date-label">Date:</span>
          <span className="rnt-invoice-date-value">{issueDate}</span>
        </div>
      </div>

      <div className="rnt-invoice-tax">
        <span>V.A.T No: {SUPPLIER.vatNo}</span>
        <span>PIN No: {SUPPLIER.pin}</span>
      </div>

      <div className="rnt-invoice-refs">
        <div className="rnt-invoice-ref-row">
          <span className="rnt-invoice-ref-label">To.</span>
          <span className="rnt-invoice-ref-value">{CLIENT.name}</span>
        </div>
        <div className="rnt-invoice-ref-row">
          <span className="rnt-invoice-ref-label">Your Order No.</span>
          <span className="rnt-invoice-ref-value">{invoice.plate}</span>
        </div>
        <div className="rnt-invoice-ref-row">
          <span className="rnt-invoice-ref-label">D/Note No.</span>
          <span className="rnt-invoice-ref-value">{invoice.deliveryNoteNo ?? ""}</span>
        </div>
      </div>

      <table className="rnt-invoice-table">
        <thead>
          <tr>
            <th className="rnt-col-qty">Qty</th>
            <th className="rnt-col-particulars">Particulars</th>
            <th className="rnt-col-unit">Unit Price</th>
            <th className="rnt-col-amount" colSpan={2}>
              Amount
            </th>
          </tr>
          <tr className="rnt-invoice-subhead">
            <th />
            <th />
            <th />
            <th className="rnt-col-kshs">Kshs</th>
            <th className="rnt-col-cts">Cts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="rnt-col-qty">{String(invoice.days).padStart(2, "0")}</td>
            <td className="rnt-col-particulars">{particulars}</td>
            <td className="rnt-col-unit">{fmtWhole(rate)}</td>
            <td className="rnt-col-kshs">{lineAmount.kshs}</td>
            <td className="rnt-col-cts">{lineAmount.cts}</td>
          </tr>
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="rnt-invoice-blank-row">
              <td>&nbsp;</td>
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rnt-invoice-bottom">
        <div className="rnt-invoice-legal">
          <span className="rnt-invoice-eoe">E&amp;O.E</span>
          <span className="rnt-invoice-terms">{INVOICE_DEFAULTS.paymentTerms}</span>
          <span className="rnt-invoice-serial">No. {invoiceNumber}</span>
        </div>

        <table className="rnt-invoice-totals">
          <tbody>
            <tr>
              <th>SUB TOTAL</th>
              <td>{subtotal.kshs}</td>
              <td>{subtotal.cts}</td>
            </tr>
            <tr>
              <th>V.A.T</th>
              <td>{vatAmt.kshs}</td>
              <td>{vatAmt.cts}</td>
            </tr>
            <tr className="rnt-invoice-total-row">
              <th>TOTAL</th>
              <td>{totalAmt.kshs}</td>
              <td>{totalAmt.cts}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="rnt-invoice-etims print:hidden">{INVOICE_DEFAULTS.etimsNote}</p>

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

export function printInvoice() {
  window.print();
}
