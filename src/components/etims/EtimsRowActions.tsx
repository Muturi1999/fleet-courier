"use client";

import { useState } from "react";
import { IconShare2, IconShieldCheck, IconUpload } from "@tabler/icons-react";
import { EtimsFilingPreviewTrigger, EtimsPrintAction } from "@/components/etims/EtimsFilingPreview";
import { EtimsActionGroup, EtimsIconAction } from "@/components/etims/EtimsIconAction";
import { shareEtimsFiling } from "@/lib/etims-api";
import type { EtimsHistoryItem } from "@/lib/etims-types";
import { useToast } from "@/context/ToastContext";

export function etimsStatusLabel(status: string) {
  if (status === "valid") return "Validated";
  if (status === "submitted") return "Submitted";
  if (status === "failed") return "Failed";
  return status || "Pending";
}

export function etimsStatusBadge(status: string) {
  if (status === "submitted") return "approved" as const;
  if (status === "valid") return "approved" as const;
  if (status === "failed") return "rejected" as const;
  return "pending" as const;
}

export function EtimsRowActions({ row, onDone }: { row: EtimsHistoryItem; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"validate" | "submit" | "share" | null>(null);
  const isSoa = row.kind === "consolidated";
  const submitted = row.etimsStatus === "submitted";
  const validateUrl = isSoa ? "/api/etims/consolidated/validate" : "/api/etims/validate";
  const submitUrl = isSoa ? "/api/etims/consolidated/submit" : "/api/etims/submit";
  const body = isSoa
    ? { consolidatedInvoiceId: row.recordId }
    : { invoiceId: row.recordId };

  const validate = async () => {
    setBusy("validate");
    try {
      const res = await fetch(validateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Validation failed");
      toast(data.message ?? `${isSoa ? "SOA" : "Invoice"} ${row.invoiceNo} validated — ready to submit`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy("submit");
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Submission failed");
      const filed = data.status === "submitted";
      toast(
        filed
          ? `${isSoa ? "SOA" : "Invoice"} ${row.invoiceNo} filed on KRA eTIMS — see Filing history. Awaiting payment.`
          : (data.message ?? `${isSoa ? "SOA" : "Invoice"} ${row.invoiceNo} filed on KRA eTIMS`),
      );
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const result = await shareEtimsFiling(isSoa ? "consolidated" : "invoice", row.recordId);
      toast(`eTIMS filing shared with client · ${result.invoiceNo ?? row.invoiceNo}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(null);
    }
  };

  const actionBusy = busy !== null;

  return (
    <EtimsActionGroup>
      <EtimsFilingPreviewTrigger
        target={isSoa ? "consolidated" : "invoice"}
        recordId={row.recordId}
        invoiceNo={row.invoiceNo}
        variant="icon"
      />
      {!submitted && (
        <>
          <EtimsIconAction
            label="Validate"
            onClick={() => void validate()}
            disabled={actionBusy}
            busy={busy === "validate"}
          >
            <IconShieldCheck size={15} stroke={1.75} />
          </EtimsIconAction>
          <EtimsIconAction
            label="Submit"
            onClick={() => void submit()}
            disabled={actionBusy}
            busy={busy === "submit"}
            accent
          >
            <IconUpload size={15} stroke={1.75} />
          </EtimsIconAction>
        </>
      )}
      <EtimsPrintAction
        target={isSoa ? "consolidated" : "invoice"}
        recordId={row.recordId}
        invoiceNo={row.invoiceNo}
      />
      <EtimsIconAction
        label="Share"
        onClick={() => void share()}
        disabled={actionBusy}
        busy={busy === "share"}
      >
        <IconShare2 size={15} stroke={1.75} />
      </EtimsIconAction>
    </EtimsActionGroup>
  );
}
