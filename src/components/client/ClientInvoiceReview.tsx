"use client";

import { useEffect, useState } from "react";
import { IconArrowBackUp, IconCheck, IconX } from "@tabler/icons-react";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { Badge } from "@/components/ui/Badge";
import type { Invoice } from "@/lib/types";

type ReviewMode = "view" | "reject";

export function ClientInvoiceReview({
  invoice,
  mode,
  onBack,
  onApprove,
  onSendBack,
}: {
  invoice: Invoice;
  mode: ReviewMode;
  onBack: () => void;
  onApprove: (note?: string) => Promise<void>;
  onSendBack: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(invoice.clientNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNote(invoice.clientNote ?? "");
    setError("");
  }, [invoice]);

  const handleApprove = async () => {
    setBusy(true);
    setError("");
    try {
      await onApprove(note.trim() || undefined);
    } catch {
      setError("Approval failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendBack = async () => {
    if (!note.trim()) {
      setError("Add a note explaining what needs to be corrected.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSendBack(note.trim());
    } catch {
      setError("Could not send back. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecordScreen
      crumbs={[
        { label: "Invoices", onClick: onBack },
        { label: invoice.invoiceNo },
      ]}
      title={`Review ${invoice.invoiceNo}`}
      onBack={onBack}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <InvoiceDocument invoice={invoice} compact />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card sticky top-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={invoice.status}>{invoice.status}</Badge>
              <span className="text-xs text-fleet-gray-400">{invoice.plate} · {invoice.route}</span>
            </div>

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">
              {mode === "reject" ? "Rejection note (required)" : "Note to Fleet Admin (optional for approval)"}
            </label>
            <textarea
              className="field-input min-h-[120px] resize-y text-sm"
              placeholder={
                mode === "reject"
                  ? "Describe what needs to be corrected before approval…"
                  : "Optional comment when approving or sending back…"
              }
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError("");
              }}
              autoFocus={mode === "reject"}
            />
            {error && <p className="mt-2 text-xs text-fleet-red">{error}</p>}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className="btn-secondary flex-1" disabled={busy} onClick={onBack}>
                <IconX size={16} /> Cancel
              </button>
              <button type="button" className="btn-secondary flex-1 text-fleet-red" disabled={busy} onClick={handleSendBack}>
                <IconArrowBackUp size={16} /> Send back
              </button>
              <button type="button" className="btn-accent flex-1" disabled={busy} onClick={handleApprove}>
                <IconCheck size={16} /> Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </RecordScreen>
  );
}
