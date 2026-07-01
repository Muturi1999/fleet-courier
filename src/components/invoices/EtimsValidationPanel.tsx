"use client";

import { useState } from "react";
import { IconExternalLink, IconRefresh, IconShieldCheck, IconShieldX, IconUpload } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { EtimsFilingPreviewTrigger } from "@/components/etims/EtimsFilingPreview";
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

type EtimsTarget = "invoice" | "consolidated";

function apiPaths(target: EtimsTarget) {
  if (target === "consolidated") {
    return {
      validate: "/api/etims/consolidated/validate",
      submit: "/api/etims/consolidated/submit",
      sync: "/api/etims/consolidated/sync",
      bodyKey: "consolidatedInvoiceId" as const,
    };
  }
  return {
    validate: "/api/etims/validate",
    submit: "/api/etims/submit",
    sync: "/api/etims/sync",
    bodyKey: "invoiceId" as const,
  };
}

export function EtimsValidationPanel({
  recordId,
  invoiceNo,
  target = "invoice",
}: {
  recordId: string;
  invoiceNo: string;
  target?: EtimsTarget;
}) {
  const { toast } = useToast();
  const [result, setResult] = useState<EtimsValidationResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState<"validate" | "submit" | "sync" | null>(null);
  const paths = apiPaths(target);
  const label = target === "consolidated" ? "SOA" : "invoice";

  const validate = async () => {
    setBusy("validate");
    try {
      const res = await fetch(paths.validate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [paths.bodyKey]: recordId }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = (await res.json()) as EtimsValidationResult;
      setResult(data);
      toast(
        data.status === "submitted"
          ? `${label} ${invoiceNo} is on KRA eTIMS`
          : data.message ?? `eTIMS: ${data.status}`,
      );
    } catch {
      toast("eTIMS validation failed — try again");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy("submit");
    try {
      const res = await fetch(paths.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [paths.bodyKey]: recordId }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!res.ok) throw new Error(data.message ?? "Submission failed");
      setSubmitResult(data);
      await validate();
      toast(data.message ?? `${label} ${invoiceNo} submitted to KRA eTIMS`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "eTIMS submission failed");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const res = await fetch(paths.sync, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [paths.bodyKey]: recordId }),
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
    <div className="card mt-4 print:hidden">
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">KRA eTIMS — Digitax fiscal submission</h2>
          <p className="text-xs text-fleet-gray-400">
            {target === "consolidated"
              ? "Validate and manually submit this consolidated SOA as one KRA eTIMS invoice (trip lines are not filed separately)."
              : "Validate VAT and manually submit this invoice to KRA eTIMS via Digitax."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EtimsFilingPreviewTrigger
            target={target}
            recordId={recordId}
            invoiceNo={invoiceNo}
            size="sm"
            label="Preview filing"
          />
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
