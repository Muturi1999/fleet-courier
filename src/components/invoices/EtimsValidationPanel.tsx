"use client";

import { useState } from "react";
import { IconShieldCheck, IconShieldX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import type { EtimsValidationResult } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

export function EtimsValidationPanel({ invoiceId, invoiceNo }: { invoiceId: string; invoiceNo: string }) {
  const { toast } = useToast();
  const [result, setResult] = useState<EtimsValidationResult | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/etims/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (!res.ok) throw new Error("Validation failed");
      const data = (await res.json()) as EtimsValidationResult;
      setResult(data);
      toast(data.status === "valid" ? `Invoice ${invoiceNo} passed eTIMS checks` : `eTIMS validation: ${data.message}`);
    } catch {
      toast("eTIMS validation failed — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-4">
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">KRA eTIMS — single invoice validation</h2>
          <p className="text-xs text-fleet-gray-400">
            Validate this invoice against KRA eTIMS requirements before fiscal submission.
          </p>
        </div>
        <button type="button" className="btn-accent btn-sm" onClick={validate} disabled={busy}>
          <IconShieldCheck size={14} />
          {busy ? "Validating…" : "Validate via eTIMS"}
        </button>
      </div>

      {result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.status === "valid" ? "approved" : result.status === "pending" ? "pending" : "rejected"}>
              {result.status}
            </Badge>
            {result.kraReference && (
              <span className="font-mono text-xs text-fleet-gray-500">Ref: {result.kraReference}</span>
            )}
            {result.cuInvoiceNumber && (
              <span className="font-mono text-xs text-teal">CU: {result.cuInvoiceNumber}</span>
            )}
          </div>
          {result.message && <p className="text-xs text-fleet-gray-600">{result.message}</p>}
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
        </div>
      )}
    </div>
  );
}
