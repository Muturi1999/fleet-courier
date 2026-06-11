"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconEye,
  IconFileDescription,
  IconPlus,
  IconPrinter,
  IconSend,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import {
  ConsolidatedInvoiceDocument,
  printConsolidatedBilling,
} from "@/components/consolidated/ConsolidatedInvoiceDocument";
import { SoaBreakdownDocument } from "@/components/consolidated/SoaBreakdownDocument";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { describePaymentCountdown, formatDocDate, formatPeriodRange } from "@/lib/consolidation";
import type { ConsolidatedInvoice, WorkTicket } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useNotifications } from "@/hooks/useNotifications";
import { fmtN } from "@/lib/utils";

function statusBadge(status: ConsolidatedInvoice["status"]) {
  const map: Record<ConsolidatedInvoice["status"], { variant: "draft" | "pending" | "approved" | "paid"; label: string }> = {
    draft: { variant: "draft", label: "Draft" },
    pending_approval: { variant: "pending", label: "Pending G4S approval" },
    approved: { variant: "approved", label: "Approved / processing" },
    paid: { variant: "paid", label: "Paid" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export default function ConsolidatedBillingPage() {
  const { toast } = useToast();
  const { refresh: refreshNotifications } = useNotifications("admin");
  const [tab, setTab] = useState<"statements" | "generate">("statements");
  const [invoices, setInvoices] = useState<ConsolidatedInvoice[]>([]);
  const [unbilled, setUnbilled] = useState<WorkTicket[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState("2026-03-01");
  const [to, setTo] = useState("2026-03-31");
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{ invoice: ConsolidatedInvoice; tickets: WorkTicket[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, unbilledRes] = await Promise.all([
        fetch("/api/consolidated-invoices", { cache: "no-store" }),
        fetch(`/api/consolidated-invoices?unbilled=true&from=${from}&to=${to}`, { cache: "no-store" }),
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (unbilledRes.ok) setUnbilled(await unbilledRes.json());
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const current = useMemo(
    () => invoices.find((i) => i.status === "pending_approval") ?? invoices.find((i) => i.status === "draft"),
    [invoices],
  );

  const selectedTickets = unbilled.filter((t) => selected.has(t.id));
  const selectedTotal = selectedTickets.reduce((s, t) => s + t.net, 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = unbilled.length > 0 && unbilled.every((t) => selected.has(t.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(unbilled.map((t) => t.id)));
  };

  const generate = async () => {
    if (!selected.size) {
      toast("Select at least one approved work ticket");
      return;
    }
    const res = await fetch("/api/consolidated-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workTicketIds: Array.from(selected),
        periodStart: from,
        periodEnd: to,
      }),
    });
    if (!res.ok) {
      toast("Failed to generate consolidated invoice");
      return;
    }
    toast("Consolidated invoice + SOA draft created");
    setSelected(new Set());
    setTab("statements");
    await refresh();
  };

  const sendToClient = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send" }),
    });
    if (!res.ok) {
      toast("Send failed");
      return;
    }
    await refreshNotifications();
    toast("Sent to G4S for approval");
    await refresh();
  };

  const markPaid = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    if (!res.ok) {
      toast("Update failed");
      return;
    }
    toast("Marked as paid");
    await refresh();
  };

  const openView = async (id: string) => {
    const res = await fetch(`/api/consolidated-invoices/${id}?detail=full`, { cache: "no-store" });
    if (!res.ok) return;
    setViewData(await res.json());
    setViewId(id);
  };

  if (viewId && viewData) {
    return (
      <RecordScreen
        crumbs={[
          { label: "Consolidated billing", onClick: () => { setViewId(null); setViewData(null); } },
          { label: viewData.invoice.invoiceNo },
        ]}
        title={`${viewData.invoice.invoiceNo} · SOA ${viewData.invoice.refNo}`}
        onBack={() => { setViewId(null); setViewData(null); }}
      >
        <div id="consolidated-billing-print" className="space-y-6">
          <ConsolidatedInvoiceDocument invoice={viewData.invoice} onPrint={printConsolidatedBilling} />
          <SoaBreakdownDocument invoice={viewData.invoice} tickets={viewData.tickets} />
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className="btn-secondary btn-sm" onClick={printConsolidatedBilling}>
              <IconPrinter size={14} /> Print invoice + SOA
            </button>
            {viewData.invoice.status === "draft" && (
              <button type="button" className="btn-accent btn-sm" onClick={() => sendToClient(viewData.invoice.id)}>
                <IconSend size={14} /> Send to G4S
              </button>
            )}
            {viewData.invoice.status === "approved" && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => markPaid(viewData.invoice.id)}>
                <IconCheck size={14} /> Mark paid
              </button>
            )}
          </div>
        </div>
      </RecordScreen>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={tab === "statements" ? "filter-tab filter-tab-active" : "filter-tab"} onClick={() => setTab("statements")}>
          Statements
        </button>
        <button type="button" className={tab === "generate" ? "filter-tab filter-tab-active" : "filter-tab"} onClick={() => setTab("generate")}>
          Generate consolidated invoice
        </button>
      </div>

      {tab === "generate" ? (
        <div className="card">
          <h2 className="mb-1 text-[15px] font-semibold">Group approved work tickets</h2>
          <p className="mb-4 text-xs text-fleet-gray-400">
            Filter by date, select verified tickets, then generate one consolidated invoice and SOA breakdown.
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="mb-1 block text-fleet-gray-400">From</span>
              <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-fleet-gray-400">To</span>
              <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <div className="flex items-end">
              <button type="button" className="btn-secondary btn-sm" onClick={refresh}>Refresh list</button>
            </div>
          </div>

          <div className="table-wrap mb-4">
            <table className="data-table min-w-[720px] text-xs">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={!unbilled.length}
                      aria-label="Select all tickets in range"
                    />
                  </th>
                  <th>Date</th>
                  <th>Work ticket</th>
                  <th>Vehicle</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-6 text-center text-fleet-gray-400">Loading…</td></tr>
                ) : unbilled.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-fleet-gray-400">No unbilled approved tickets in range</td></tr>
                ) : (
                  unbilled.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                      </td>
                      <td>{t.tripDate}</td>
                      <td className="font-mono font-semibold text-[#c41e1e]">{t.serialNo}</td>
                      <td className="font-mono">{t.plate}</td>
                      <td>{t.route}</td>
                      <td>{t.driverName}</td>
                      <td className="font-mono">{fmtN(t.net)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fleet-gray-100 pt-4">
            <p className="text-sm text-fleet-gray-500">
              {selected.size} selected · Subtotal KES {fmtN(selectedTotal)} (excl. VAT)
            </p>
            <button type="button" className="btn-accent" disabled={!selected.size} onClick={generate}>
              <IconPlus size={16} /> Generate consolidated invoice + SOA
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="section-header">
              <div>
                <h2 className="text-[15px] font-semibold">Current consolidated billing</h2>
                <p className="text-xs text-fleet-gray-400">
                  {current ? `SOA ${current.refNo} · ${formatPeriodRange(current.periodStart, current.periodEnd)}` : "No active statement"}
                </p>
              </div>
              {current && statusBadge(current.status)}
            </div>
            {current ? (
              <>
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-fleet-gray-400">Invoice</span><span className="font-mono font-medium">{current.invoiceNo}</span></div>
                  <div className="flex justify-between"><span className="text-fleet-gray-400">Trips</span><span>{current.totalTrips}</span></div>
                  <div className="flex justify-between"><span className="text-fleet-gray-400">Payment terms</span><span>90–100 Days Net</span></div>
                  {current.paymentWindowFrom && (
                    <div className="flex justify-between"><span className="text-fleet-gray-400">Payment window</span><span className="text-right text-xs">{formatDocDate(current.paymentWindowFrom)} – {formatDocDate(current.paymentWindowTo!)}</span></div>
                  )}
                  {(() => {
                    const countdown = describePaymentCountdown(current);
                    return countdown ? (
                      <div className="flex justify-between"><span className="text-fleet-gray-400">Countdown</span><span className="text-right text-xs font-medium text-navy">{countdown}</span></div>
                    ) : null;
                  })()}
                  <div className="flex justify-between border-t border-fleet-gray-100 pt-2 text-base font-semibold">
                    <span>Total due</span><span className="font-mono text-navy">KES {fmtN(current.total)}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => openView(current.id)}><IconEye size={14} /> View documents</button>
                  {current.status === "draft" && (
                    <button type="button" className="btn-accent btn-sm" onClick={() => sendToClient(current.id)}><IconSend size={14} /> Send to G4S</button>
                  )}
                  {current.status === "approved" && (
                    <button type="button" className="btn-secondary btn-sm" onClick={() => markPaid(current.id)}><IconCheck size={14} /> Mark paid</button>
                  )}
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-fleet-gray-400">Generate a consolidated invoice from approved work tickets.</p>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Billing history</h2>
              <IconFileDescription size={18} className="text-fleet-gray-400" />
            </div>
            <div className="table-wrap border-0">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>SOA Ref</th>
                    <th>Period</th>
                    <th>Trips</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-fleet-gray-400">No consolidated statements yet</td></tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-mono font-semibold">{inv.refNo}</td>
                        <td>{formatPeriodRange(inv.periodStart, inv.periodEnd)}</td>
                        <td className="text-center">{inv.totalTrips}</td>
                        <td className="font-mono">{fmtN(inv.total)}</td>
                        <td>{statusBadge(inv.status)}</td>
                        <td className="text-xs text-fleet-gray-400">{describePaymentCountdown(inv) ?? "—"}</td>
                        <td>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => openView(inv.id)}><IconEye size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
