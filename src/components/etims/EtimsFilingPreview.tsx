"use client";

import { useCallback, useState } from "react";
import { IconDownload, IconEye, IconPrinter, IconShare2 } from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";
import { EtimsIconAction } from "@/components/etims/EtimsIconAction";
import { EtimsTaxInvoiceView } from "@/components/etims/EtimsTaxInvoiceView";
import type { EtimsFilingPreview } from "@/lib/etims-types";
import { fetchEtimsPreview, shareEtimsFiling, type EtimsPreviewTarget } from "@/lib/etims-api";
import { printEtimsFiling } from "@/lib/etims-print";
import { useToast } from "@/context/ToastContext";

export function EtimsFilingPreviewBody({
  data,
  onPrint,
  onShare,
  busy,
}: {
  data: EtimsFilingPreview;
  onPrint?: () => void;
  onShare?: () => void;
  busy?: "print" | "share" | null;
}) {
  return (
    <div className="space-y-4">
      <EtimsTaxInvoiceView data={data} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fleet-gray-100 pt-4">
        <p className="max-w-sm text-[11px] leading-relaxed text-fleet-gray-400">
          Separate KRA eTIMS tax invoice · not the consolidated SOA schedule. Print or save as PDF from the dialog.
        </p>
        <div className="flex flex-wrap gap-2">
          {onPrint && (
            <button type="button" className="btn-secondary btn-sm" onClick={onPrint} disabled={busy != null}>
              <IconPrinter size={14} />
              {busy === "print" ? "Opening…" : "Print / PDF"}
            </button>
          )}
          {onShare && (
            <button type="button" className="btn-accent btn-sm" onClick={onShare} disabled={busy != null}>
              <IconShare2 size={14} />
              {busy === "share" ? "Sharing…" : "Share with client"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EtimsFilingPreviewTrigger({
  target,
  recordId,
  invoiceNo,
  size = "xs",
  label,
  variant = "button",
}: {
  target: EtimsPreviewTarget;
  recordId: string;
  invoiceNo: string;
  size?: "xs" | "sm";
  label?: string;
  variant?: "button" | "icon";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<"print" | "share" | null>(null);
  const [preview, setPreview] = useState<EtimsFilingPreview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEtimsPreview(target, recordId);
      setPreview(data);
      setOpen(true);
      return data;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load eTIMS preview");
      return null;
    } finally {
      setLoading(false);
    }
  }, [recordId, target, toast]);

  const printDoc = useCallback(async () => {
    setActionBusy("print");
    try {
      const data = preview ?? (await load());
      if (!data) return;
      printEtimsFiling(data, invoiceNo);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Print failed");
    } finally {
      setActionBusy(null);
    }
  }, [invoiceNo, load, preview, toast]);

  const share = useCallback(async () => {
    setActionBusy("share");
    try {
      const result = await shareEtimsFiling(target, recordId);
      toast(`eTIMS filing shared with client · ${result.invoiceNo ?? invoiceNo}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Share failed");
    } finally {
      setActionBusy(null);
    }
  }, [invoiceNo, recordId, target, toast]);

  const btnClass = size === "sm" ? "btn-secondary btn-sm" : "btn-ghost btn-xs";
  const iconSize = size === "sm" ? 16 : 15;

  const modal = (
    <Modal
      open={open}
      title={`KRA eTIMS tax invoice · ${invoiceNo}`}
      onClose={() => setOpen(false)}
      wide
      document
    >
      {preview ? (
        <EtimsFilingPreviewBody
          data={preview}
          onPrint={() => void printDoc()}
          onShare={() => void share()}
          busy={actionBusy}
        />
      ) : null}
    </Modal>
  );

  if (variant === "icon") {
    return (
      <>
        <EtimsIconAction label="Preview" onClick={() => void load()} disabled={loading} busy={loading}>
          <IconEye size={iconSize} stroke={1.75} />
        </EtimsIconAction>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={btnClass}
        onClick={() => void load()}
        disabled={loading}
        title={`Preview KRA eTIMS tax invoice for ${invoiceNo}`}
      >
        <IconEye size={size === "sm" ? 14 : 12} />
        {label ?? (loading ? "…" : "Preview")}
      </button>
      {modal}
    </>
  );
}

/** Icon action: print / save PDF without opening preview modal. */
export function EtimsPrintAction({
  target,
  recordId,
  invoiceNo,
}: {
  target: EtimsPreviewTarget;
  recordId: string;
  invoiceNo: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const data = await fetchEtimsPreview(target, recordId);
      printEtimsFiling(data, invoiceNo);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Print failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EtimsIconAction label="Print / PDF" onClick={() => void run()} disabled={busy} busy={busy}>
      <IconDownload size={15} stroke={1.75} />
    </EtimsIconAction>
  );
}
