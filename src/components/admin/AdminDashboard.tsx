"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  IconClock,
  IconCurrencyDollar,
  IconExternalLink,
  IconFileInvoice,
  IconTruck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import type { Invoice, RouteRecord, Vehicle } from "@/lib/types";
import { fmtN } from "@/lib/utils";
import { useCrud } from "@/hooks/useCrud";

function formatMillions(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

export function AdminDashboard() {
  const { items: invoices, loading: invLoading } = useCrud<Invoice>("invoices");
  const { items: vehicles, loading: vehLoading } = useCrud<Vehicle>("vehicles");
  const { items: schedules, loading: schLoading } = useCrud<{ id: string }>("schedules");
  const { items: routes, loading: routeLoading } = useCrud<RouteRecord>("routes");

  const loading = invLoading || vehLoading || schLoading || routeLoading;

  const stats = useMemo(() => {
    const marInvoices = invoices.filter((i) => (i.period ?? "").toLowerCase().includes("mar"));
    const scoped = marInvoices.length > 0 ? marInvoices : invoices;
    const totalInclVat = scoped.reduce((s, i) => s + i.total, 0);
    const totalNet = scoped.reduce((s, i) => s + i.net, 0);
    const totalVat = scoped.reduce((s, i) => s + i.vat, 0);
    const pending = invoices.filter((i) => i.status === "sent" || i.status === "pending");
    const periodLabel = scoped[0]?.period ?? "All periods";
    const plates = new Set(scoped.map((i) => i.plate));

    return {
      totalInclVat,
      totalNet,
      totalVat,
      invoiceCount: scoped.length,
      vehicleCount: vehicles.filter((v) => v.status !== "inactive").length,
      pendingCount: pending.length,
      scheduleCount: schedules.length,
      periodLabel,
      uniquePlates: plates.size,
    };
  }, [invoices, vehicles, schedules]);

  const topVehicles = useMemo(
    () => [...vehicles].sort((a, b) => b.total - a.total).slice(0, 10),
    [vehicles],
  );

  const topRoutes = useMemo(
    () => [...routes].sort((a, b) => b.total - a.total).slice(0, 10),
    [routes],
  );
  const maxRoute = topRoutes[0]?.total ?? 1;

  const workflowSteps = useMemo(
    () => [
      {
        state: stats.scheduleCount > 0 ? "done" : "pending",
        num: "Step 1",
        title: "Schedule entry",
        sub: `${stats.scheduleCount} lines logged`,
      },
      {
        state: stats.invoiceCount > 0 ? "done" : "pending",
        num: "Step 2",
        title: "Invoices generated",
        sub: `${stats.invoiceCount} invoice${stats.invoiceCount === 1 ? "" : "s"}`,
      },
      {
        state: stats.invoiceCount > 0 ? "done" : "pending",
        num: "Step 3",
        title: "SOA sent to G4S",
        sub: stats.periodLabel,
      },
      {
        state: stats.pendingCount > 0 ? "active" : stats.invoiceCount > 0 ? "done" : "pending",
        num: "Step 4",
        title: "G4S approval",
        sub: stats.pendingCount > 0 ? `${stats.pendingCount} awaiting approval` : "No pending approvals",
      },
      {
        state: invoices.some((i) => i.status === "paid" || i.status === "approved") ? "done" : "pending",
        num: "Step 5",
        title: "KRA eTIMS submitted",
        sub: "Via invoice workflow",
      },
      {
        state: invoices.some((i) => i.status === "paid") ? "done" : "pending",
        num: "Step 6",
        title: "Payment received",
        sub: `${invoices.filter((i) => i.status === "paid").length} paid`,
      },
    ],
    [stats, invoices],
  );

  const recentActivity = useMemo(() => {
    return [...invoices]
      .sort((a, b) => (b.serviceDate ?? "").localeCompare(a.serviceDate ?? ""))
      .slice(0, 5)
      .map((inv) => ({
        dot: inv.status === "paid" ? "teal" : inv.status === "sent" || inv.status === "pending" ? "amber" : "blue",
        text: `Invoice ${inv.invoiceNo} · ${inv.plate} — ${inv.route}`,
        time: inv.serviceDate ?? inv.period ?? "—",
      }));
  }, [invoices]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-fleet-gray-400">Loading dashboard…</p>;
  }

  return (
    <>
      <MetricsGrid>
        <MetricCard
          accent="teal"
          icon={IconCurrencyDollar}
          label={`Total invoiced (${stats.periodLabel})`}
          value={formatMillions(stats.totalInclVat)}
          sub={`KES incl. 16% VAT · ${stats.invoiceCount} lines`}
        />
        <MetricCard
          accent="navy"
          icon={IconFileInvoice}
          label="Invoice lines"
          value={String(stats.invoiceCount)}
          sub={`${stats.uniquePlates} vehicles · ${stats.periodLabel}`}
        />
        <MetricCard
          accent="amber"
          icon={IconTruck}
          label="Active fleet"
          value={String(stats.vehicleCount)}
          sub="From vehicle register"
        />
        <MetricCard
          accent="red"
          icon={IconClock}
          label="Pending G4S approval"
          value={String(stats.pendingCount)}
          sub={stats.pendingCount > 0 ? "Sent / pending invoices" : "All clear"}
        />
      </MetricsGrid>

      <div className="section-header">
        <h2 className="text-[15px] font-semibold">Monthly workflow — {stats.periodLabel}</h2>
      </div>
      <div className="workflow-scroll">
        {workflowSteps.map((step) => (
          <div
            key={step.num}
            className={`workflow-step ${
              step.state === "done"
                ? "border-[#9FE1CB] bg-teal-light"
                : step.state === "active"
                  ? "border-[#FAC775] bg-accent-light"
                  : "bg-fleet-gray-50"
            }`}
          >
            <div
              className={`text-[10px] font-bold uppercase tracking-wide ${
                step.state === "done" ? "text-teal" : step.state === "active" ? "text-accent-dark" : "text-fleet-gray-400"
              }`}
            >
              {step.num}
            </div>
            <div className="text-xs font-semibold">{step.title}</div>
            <div className="text-[11px] text-fleet-gray-400">{step.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="card mb-3.5">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Revenue summary · {stats.periodLabel}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-fleet-sm bg-fleet-gray-50 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-fleet-gray-400">Net (excl. VAT)</div>
                <div className="font-mono text-[15px] font-semibold">KES {fmtN(stats.totalNet)}</div>
              </div>
              <div className="rounded-fleet-sm bg-accent-light p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-accent-dark">VAT @ 16%</div>
                <div className="font-mono text-[15px] font-semibold text-accent-dark">KES {fmtN(stats.totalVat)}</div>
              </div>
              <div className="col-span-2 rounded-fleet-sm bg-navy p-3 text-white">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-white/60">Total incl. VAT</div>
                <div className="font-mono text-[15px] font-semibold text-accent">KES {fmtN(stats.totalInclVat)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Top destinations by revenue</h2>
            </div>
            <div className="flex flex-col">
              {topRoutes.length === 0 ? (
                <p className="py-4 text-center text-xs text-fleet-gray-400">No route data yet</p>
              ) : (
                topRoutes.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 border-b border-fleet-gray-50 py-1.5 last:border-0">
                    <span className="w-[115px] truncate text-[11px] capitalize text-fleet-gray-600">{d.name.toLowerCase()}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded bg-fleet-gray-100">
                      <div className="h-full rounded bg-navy" style={{ width: `${Math.round((d.total / maxRoute) * 100)}%` }} />
                    </div>
                    <span className="min-w-[65px] text-right font-mono text-[11px] font-medium">{(d.total / 1000).toFixed(0)}K</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card">
            <div className="section-header">
              <div>
                <h2 className="text-[15px] font-semibold">Recent invoices</h2>
                <p className="text-xs text-fleet-gray-400">Live from database</p>
              </div>
              <Link href="/admin/invoices" className="btn-secondary btn-sm">
                View all
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-xs text-fleet-gray-400">No invoices yet</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.text} className="dashboard-activity-row">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        a.dot === "blue" ? "bg-fleet-blue" : a.dot === "amber" ? "bg-accent" : "bg-teal"
                      }`}
                    />
                    <div className="min-w-0 flex-1 text-[13px] leading-snug">{a.text}</div>
                  </div>
                  <div className="pl-5 font-mono text-[11px] text-fleet-gray-400 sm:whitespace-nowrap sm:pl-0">{a.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="min-w-0 text-sm font-semibold xs:text-[15px]">Top vehicles by revenue</h2>
        <Link href="/admin/vehicles" className="btn-secondary btn-sm w-full justify-center xs:w-auto">
          <IconExternalLink size={14} /> All vehicles
        </Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Class</th>
              <th>Runs</th>
              <th>Days</th>
              <th>Routes</th>
              <th>Net (KES)</th>
              <th>VAT</th>
              <th>Total (KES)</th>
            </tr>
          </thead>
          <tbody>
            {topVehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fleet-gray-400">
                  No vehicles yet
                </td>
              </tr>
            ) : (
              topVehicles.map((v) => {
                const net = Math.round(v.total / 1.16);
                const vat = v.total - net;
                return (
                  <tr key={v.plate}>
                    <td className="font-mono font-semibold">{v.plate}</td>
                    <td>
                      <Badge variant={v.cls === "15T" ? "sent" : v.cls === "Canter" ? "pending" : "draft"}>{v.cls}</Badge>
                    </td>
                    <td className="text-center font-semibold">{v.runs}</td>
                    <td className="font-mono text-[11px]">{v.days}</td>
                    <td className="max-w-[160px] truncate text-[11px] text-fleet-gray-600">
                      {Array.isArray(v.dests) ? v.dests.slice(0, 3).join(" · ") : "—"}
                    </td>
                    <td className="font-mono">{fmtN(net)}</td>
                    <td className="font-mono text-fleet-gray-400">{fmtN(vat)}</td>
                    <td className="font-mono font-semibold text-navy">{fmtN(v.total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
