"use client";

import { useState } from "react";
import { IconExternalLink, IconRefresh, IconShieldCheck, IconShieldX, IconUpload } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import type { EtimsValidationResult } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

type SubmitResult = {
  status: string;
  kraReference?: string;
  etimsUrl?: string;
  digitaxSaleId?: string;
  salesTaxSummary?: { tax_amount_b?: number; taxable_amount_b?: number };
  message?: string;
};

export function EtimsValidationPanel({ invoiceId, invoiceNo }: { invoiceId: string; invoiceNo: string }) {
  const { toast } = useToast();
  const [result, setResult] = useState<EtimsValidationResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState<"validate" | "submit" | "sync" | null>(null);

  const validate = async () => {
    setBusy("validate");
    try {
      const res = await fetch("/api/etims/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = (await res.json()) as EtimsValidationResult;
      setResult(data);
      toast(data.status === "submitted" ? `Invoice ${invoiceNo} is on KRA eTIMS` : data.message ?? `eTIMS: ${data.status}`);
    } catch {
      toast("eTIMS validation failed — try again");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy("submit");
    try {
      const res = await fetch("/api/etims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!res.ok) throw new Error(data.message ?? "Submission failed");
      setSubmitResult(data);
      await validate();
      toast(data.message ?? `Invoice ${invoiceNo} submitted to KRA eTIMS`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "eTIMS submission failed");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const res = await fetch("/api/etims/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!res.ok) throw new Error(data.message ?? "Sync failed");
      setSubmitResult(data);
      await validate();
      toast(data.message ?? "eTIMS status refreshed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not refresh eTIMS status");
    } finally {
      setBusy(null);
    }
  };

  const displayStatus = result?.status ?? submitResult?.status;
  const etimsUrl = result?.etimsUrl ?? submitResult?.etimsUrl;
  const kraRef = result?.kraReference ?? submitResult?.kraReference ?? result?.cuInvoiceNumber;

  return (
    <div className="card mt-4">
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">KRA eTIMS — Digitax fiscal submission</h2>
          <p className="text-xs text-fleet-gray-400">
            Validate VAT and submit this invoice to KRA eTIMS via Digitax.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={validate} disabled={busy !== null}>
            <IconShieldCheck size={14} />
            {busy === "validate" ? "Validating…" : "Validate"}
          </button>
          <button
            type="button"
            className="btn-accent btn-sm"
            onClick={submit}
            disabled={busy !== null || result?.status === "submitted"}
          >
            <IconUpload size={14} />
            {busy === "submit" ? "Submitting…" : "Submit to eTIMS"}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={sync} disabled={busy !== null}>
            <IconRefresh size={14} />
            {busy === "sync" ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      {(result || submitResult) && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {displayStatus && (
              <Badge
                variant={
                  displayStatus === "submitted" || displayStatus === "valid"
                    ? "approved"
                    : displayStatus === "pending"
                      ? "pending"
                      : "rejected"
                }
              >
                {displayStatus}
              </Badge>
            )}
            {kraRef && <span className="font-mono text-xs text-fleet-gray-500">CU: {kraRef}</span>}
            {etimsUrl && (
              <a
                href={etimsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-teal hover:underline"
              >
                View KRA receipt
                <IconExternalLink size={12} />
              </a>
            )}
          </div>
          {result?.message && <p className="text-xs text-fleet-gray-600">{result.message}</p>}
          {submitResult?.salesTaxSummary && (
            <p className="text-xs text-fleet-gray-500">
              VAT on eTIMS: KES {submitResult.salesTaxSummary.tax_amount_b?.toLocaleString()} · Taxable: KES{" "}
              {submitResult.salesTaxSummary.taxable_amount_b?.toLocaleString()}
            </p>
          )}
          {result?.checks && (
            <ul className="space-y-1.5">
              {result.checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2 text-xs">
                  {check.passed ? (
                    <IconShieldCheck size={14} className="mt-0.5 shrink-0 text-teal" />
                  ) : (
                    <IconShieldX size={14} className="mt-0.5 shrink-0 text-fleet-red" />
                  )}
                  <span>
                    <span className="font-medium">{check.label}</span>
                    {check.detail && <span className="text-fleet-gray-400"> — {check.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
