import type { BillingProfile, EtimsValidationResult, Invoice } from "./types";
import { INVOICE_DEFAULTS } from "./invoice-meta";

export function validateInvoiceEtims(
  invoice: Invoice,
  profile: BillingProfile,
): EtimsValidationResult {
  const checks: EtimsValidationResult["checks"] = [
    {
      label: "Supplier KRA PIN",
      passed: /^P\d{9}[A-Z]$/i.test(profile.supplier.pin),
      detail: profile.supplier.pin || "Missing PIN",
    },
    {
      label: "Client KRA PIN",
      passed: /^P\d{9}[A-Z]$/i.test(profile.client.pin),
      detail: profile.client.pin || "Missing PIN",
    },
    {
      label: "VAT amount (16%)",
      passed: Math.abs(invoice.vat - Math.round(invoice.net * (INVOICE_DEFAULTS.vatRate / 100))) <= 1,
      detail: `VAT KES ${invoice.vat.toLocaleString()}`,
    },
    {
      label: "Invoice total",
      passed: invoice.total === invoice.net + invoice.vat,
      detail: `KES ${invoice.total.toLocaleString()}`,
    },
    {
      label: "Invoice number",
      passed: /\d{4,}/.test(invoice.invoiceNo),
      detail: invoice.invoiceNo,
    },
    {
      label: "Service particulars",
      passed: invoice.route.trim().length > 0 && invoice.days > 0,
      detail: `${invoice.route} · ${invoice.days} days`,
    },
  ];

  const failed = checks.filter((c) => !c.passed);
  const allPassed = failed.length === 0;
  const cuNo = `CU-${invoice.invoiceNo.replace(/\D/g, "").padStart(8, "0")}`;

  return {
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    status: allPassed ? "valid" : failed.length >= 3 ? "failed" : "pending",
    kraReference: allPassed ? `KRA-ETIMS-${invoice.invoiceNo}` : undefined,
    cuInvoiceNumber: allPassed ? cuNo : undefined,
    validatedAt: new Date().toISOString(),
    checks,
    message: allPassed
      ? "Invoice passed KRA eTIMS validation checks and is ready for fiscal submission."
      : `${failed.length} check(s) need attention before eTIMS submission.`,
  };
}
