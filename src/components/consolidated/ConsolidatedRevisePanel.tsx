"use client";

import { useMemo, useState } from "react";
import { IconDeviceFloppy, IconWand } from "@tabler/icons-react";
import { ConsolidationBreakdownTable } from "@/components/consolidated/ConsolidationBreakdownTable";
import { formatPeriodRange } from "@/lib/consolidation";
import { mapTicketsToBreakdownLines } from "@/lib/consolidation-breakdown";
import { reviseConsolidatedInvoice, suggestPeriodFromTripDates } from "@/lib/consolidation-revise";
import { formatEATDisplay } from "@/lib/dates";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";
import { fmtN } from "@/lib/utils";

function apiErrorMessage(err: { message?: string | string[]; error?: string }): string {
  if (Array.isArray(err.message)) return err.message.join(", ");
  return err.message ?? err.error ?? "Request failed";
}

export function ConsolidatedRevisePanel({
  source,
  tickets,
  onClose,
  onSaved,
  toast,
}: {
  source: ConsolidatedInvoice;
  tickets: WorkTicket[];
  onClose: () => void;
  onSaved: (created: ConsolidatedInvoice) => void;
  toast: (msg: string) => void;
}) {
  const suggested = useMemo(() => suggestPeriodFromTripDates(tickets), [tickets]);
  const [periodStart, setPeriodStart] = useState(source.periodStart);
  const [periodEnd, setPeriodEnd] = useState(source.periodEnd);
  const [invoiceDate, setInvoiceDate] = useState(
    source.invoiceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  const breakdownLines = useMemo(() => mapTicketsToBreakdownLines(tickets), [tickets]);
  const tripRange = suggested ? formatPeriodRange(suggested.from, suggested.to) : null;

  const applySuggestedPeriod = () => {
    if (!suggested) {
      toast("No trip dates found to suggest a period");
      return;
    }
    setPeriodStart(suggested.from);
    setPeriodEnd(suggested.to);
  };

  const saveRevision = async () => {
    if (!periodStart || !periodEnd) {
      toast("Set period from and to");
      return;
    }
    if (periodStart > periodEnd) {
      toast("Period start must be before period end");
      return;
    }
    setSaving(true);
    try {
      const res = await reviseConsolidatedInvoice(source.id, {
        periodStart,
        periodEnd,
        invoiceDate,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
        toast(apiErrorMessage(err));
        return;
      }
      const created = (await res.json()) as ConsolidatedInvoice;
      toast(`Revised copy saved as serial ${created.invoiceNo} — ready to send`);
      onSaved(created);
    } catch {
      toast("Failed to save revised copy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-5xl">
      <div className="section-header mb-4">
        <div>
          <h2 className="text-[15px] font-semibold">Revise consolidated SOA {source.invoiceNo}</h2>
          <p className="text-xs text-fleet-gray-400">
            Creates a new draft with a new serial number. Trip lines and amounts stay the same; update the billing
            period to match the work tickets before resending to the client.
          </p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
          Cancel
        </button>
      </div>

      {source.status === "rejected" && source.clientNote?.trim() && (
        <div className="mb-4 rounded-fleet-sm border border-fleet-red/20 bg-fleet-red/5 px-4 py-3 text-sm text-fleet-gray-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fleet-red">Client rejection note</p>
          <p>{source.clientNote}</p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Period from</span>
          <input
            type="date"
            className="field-input"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Period to</span>
          <input
            type="date"
            className="field-input"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-fleet-gray-400">Invoice date</span>
          <input
            type="date"
            className="field-input"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={applySuggestedPeriod} disabled={!suggested}>
          <IconWand size={14} /> Use trip date range{suggested ? ` (${tripRange})` : ""}
        </button>
        <span className="text-xs text-fleet-gray-400">
          Current document period: {formatPeriodRange(source.periodStart, source.periodEnd)}
        </span>
      </div>

      <div className="mb-4 rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 px-4 py-3 text-sm">
        <span className="font-medium text-navy">{breakdownLines.length} trip line(s)</span>
        <span className="ml-2 text-fleet-gray-500">
          · Subtotal KES {fmtN(source.net)} · Total KES {fmtN(source.total)}
        </span>
        {tickets[0]?.tripDate && (
          <span className="ml-2 text-fleet-gray-400">
            · Trips {formatEATDisplay(tickets[0].tripDate)}
            {tickets.length > 1 ? ` – ${formatEATDisplay(tickets[tickets.length - 1]!.tripDate)}` : ""}
          </span>
        )}
      </div>

      <div className="table-wrap mb-4 max-h-72 overflow-y-auto">
        <ConsolidationBreakdownTable
          compact
          layout={
            source.consolidationType === "period" || (!source.plate?.trim() && source.consolidationType !== "vehicle")
              ? "byVehicle"
              : "flat"
          }
          lines={breakdownLines}
          grandNet={source.net}
          grandTotal={source.total}
          showGrandTotal={false}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-fleet-gray-100 pt-4">
        <button type="button" className="btn-accent" disabled={saving} onClick={saveRevision}>
          <IconDeviceFloppy size={16} />
          {saving ? "Saving…" : "Save revised copy (new serial)"}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
