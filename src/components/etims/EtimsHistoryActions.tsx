"use client";

import { useState } from "react";
import { IconShare2 } from "@tabler/icons-react";
import { EtimsFilingPreviewTrigger, EtimsPrintAction } from "@/components/etims/EtimsFilingPreview";
import { EtimsActionGroup, EtimsIconAction } from "@/components/etims/EtimsIconAction";
import { shareEtimsFiling } from "@/lib/etims-api";
import type { EtimsHistoryItem } from "@/lib/etims-types";
import { useToast } from "@/context/ToastContext";

/** View / download / print / share for filed eTIMS records — no validate or submit. */
export function EtimsHistoryActions({ row, onDone }: { row: EtimsHistoryItem; onDone?: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const isSoa = row.kind === "consolidated";

  const share = async () => {
    setBusy(true);
    try {
      const result = await shareEtimsFiling(isSoa ? "consolidated" : "invoice", row.recordId);
      toast(`eTIMS filing shared with client · ${result.invoiceNo ?? row.invoiceNo}`);
      onDone?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EtimsActionGroup>
      <EtimsFilingPreviewTrigger
        target={isSoa ? "consolidated" : "invoice"}
        recordId={row.recordId}
        invoiceNo={row.invoiceNo}
        variant="icon"
      />
      <EtimsPrintAction
        target={isSoa ? "consolidated" : "invoice"}
        recordId={row.recordId}
        invoiceNo={row.invoiceNo}
      />
      <EtimsIconAction label="Share" onClick={() => void share()} disabled={busy} busy={busy}>
        <IconShare2 size={15} stroke={1.75} />
      </EtimsIconAction>
    </EtimsActionGroup>
  );
}
