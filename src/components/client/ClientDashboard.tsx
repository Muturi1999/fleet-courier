"use client";

import Link from "next/link";
import {
  IconCheck,
  IconClipboardList,
  IconClock,
  IconCurrencyDollar,
  IconFileInvoice,
  IconRefresh,
  IconTruck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { HorizontalBars } from "@/components/reports/BarChart";
import { formatEATDisplay } from "@/lib/dates";
import { fmtN, formatMillions } from "@/lib/utils";
import { useClientDashboard } from "@/hooks/useClientDashboard";

export function ClientDashboard() {
  const { data, loading, error, refresh } = useClientDashboard();

  if (loading && !data) {
    return <p className="py-12 text-center text-sm text-fleet-gray-400">Loading dashboard…</p>;
  }

  if (error && !data) {
    return (
      <div className="card py-10 text-center">
        <p className="text-sm text-fleet-red">{error}</p>
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const classBars = data.byClass.map((c) => ({
    label: c.cls,
    value: c.total,
    sub: `${c.count} invoice${c.count === 1 ? "" : "s"}`,
  }));

  const updatedLabel = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">Partner dashboard</h2>
          <p className="text-xs text-fleet-gray-400">
            {data.monthLabel} · live stats refresh every 30s · last update {updatedLabel}
          </p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void refresh()}>
          <IconRefresh size={14} /> Refresh
        </button>
      </div>

      <MetricsGrid>
        <MetricCard
          accent="amber"
          icon={IconClock}
          label="Invoices awaiting review"
          value={String(data.invoices.awaiting)}
          sub={`${data.monthLabel} · sent to G4S portal`}
        />
        <MetricCard
          accent="teal"
          icon={IconCheck}
          label="Invoices approved"
          value={String(data.invoices.approved + data.invoices.paid)}
          sub={`KES ${fmtN(data.invoices.totalValue)} incl. VAT`}
        />
        <MetricCard
          accent="navy"
          icon={IconCurrencyDollar}
          label="Approved value (net)"
          value={formatMillions(data.invoices.net)}
          sub={`VAT KES ${fmtN(data.invoices.vat)}`}
        />
        <MetricCard
          accent="blue"
          icon={IconClipboardList}
          label="Work tickets approved"
          value={String(data.workTickets.approved)}
          sub={`${data.workTickets.awaiting} awaiting · ${data.workTickets.rejected} returned`}
        />
      </MetricsGrid>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card min-w-0">
          <div className="section-header">
            <h3 className="text-sm font-semibold">Revenue by vehicle class</h3>
            <p className="text-xs text-fleet-gray-400">{data.monthLabel}</p>
          </div>
          {classBars.length === 0 ? (
            <p className="py-6 text-center text-xs text-fleet-gray-400">No invoice data this month</p>
          ) : (
            <HorizontalBars items={classBars} maxItems={6} />
          )}
        </div>

        <div className="card min-w-0">
          <div className="section-header">
            <div>
              <h3 className="text-sm font-semibold">Workflow summary</h3>
              <p className="text-xs text-fleet-gray-400">Current month pipeline</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Awaiting", value: data.invoices.awaiting, href: "/client/invoices", accent: "text-fleet-red" },
              { label: "Approved", value: data.invoices.approved, href: "/client/invoices/approved", accent: "text-teal" },
              { label: "Returned", value: data.invoices.rejected, href: "/client/invoices/rejected", accent: "text-fleet-gray-600" },
              { label: "WT awaiting", value: data.workTickets.awaiting, href: "/client/work-tickets", accent: "text-accent-dark" },
              { label: "WT approved", value: data.workTickets.approved, href: "/client/work-tickets/approved", accent: "text-teal" },
              { label: "WT returned", value: data.workTickets.rejected, href: "/client/work-tickets/rejected", accent: "text-fleet-gray-600" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50/80 p-3 transition hover:border-accent/30 hover:bg-white"
              >
                <p className="text-[10px] uppercase tracking-wide text-fleet-gray-400">{item.label}</p>
                <p className={`text-xl font-semibold tabular-nums ${item.accent}`}>{item.value}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <p className="text-xs text-fleet-gray-400">Updates as invoices are approved or returned</p>
          </div>
          <Link href="/client/invoices/all" className="btn-secondary btn-sm">
            <IconFileInvoice size={14} /> All invoices
          </Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="py-6 text-center text-xs text-fleet-gray-400">No activity this month yet</p>
        ) : (
          <div className="divide-y divide-fleet-gray-50">
            {data.recentActivity.map((row) => (
              <div key={`${row.kind}-${row.id}`} className="dashboard-activity-row flex-wrap gap-2 py-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {row.kind === "invoice" ? (
                    <IconFileInvoice size={16} className="mt-0.5 shrink-0 text-navy" />
                  ) : row.kind === "consolidated" ? (
                    <IconFileInvoice size={16} className="mt-0.5 shrink-0 text-accent-dark" />
                  ) : (
                    <IconTruck size={16} className="mt-0.5 shrink-0 text-teal" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fleet-gray-800">
                      {row.kind === "invoice"
                        ? "Invoice"
                        : row.kind === "consolidated"
                          ? "SOA"
                          : "Work ticket"}{" "}
                      {row.refNo}
                      {row.plate && row.plate !== "—" ? ` · ${row.plate}` : ""}
                    </p>
                    <p className="truncate text-xs text-fleet-gray-500">{row.route}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    row.status === "approved" ||
                    row.status === "paid" ||
                    row.status === "pending_approval"
                      ? row.status === "pending_approval"
                        ? "sent"
                        : "approved"
                      : row.status === "rejected"
                        ? "rejected"
                        : "sent"
                  }
                >
                  {row.status === "pending_approval" ? "awaiting" : row.status}
                </Badge>
                <span className="text-[11px] text-fleet-gray-400">{formatEATDisplay(row.eventDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
