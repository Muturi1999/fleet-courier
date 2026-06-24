"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  IconClock,
  IconCurrencyDollar,
  IconFileInvoice,
  IconTruck,
} from "@tabler/icons-react";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import type { Invoice, Vehicle } from "@/lib/types";
import { dateKey, formatEATDisplay, todayEAT } from "@/lib/dates";
import { fmtN, formatMillions, sumBy, toNum } from "@/lib/utils";
import { useCrud } from "@/hooks/useCrud";

export function AdminDashboard() {
  const { items: invoices, loading: invLoading } = useCrud<Invoice>("invoices");
  const { items: vehicles, loading: vehLoading } = useCrud<Vehicle>("vehicles");
  const { items: schedules, loading: schLoading } = useCrud<{ id: string }>("schedules");

  const loading = invLoading || vehLoading || schLoading;

  const stats = useMemo(() => {
    const today = todayEAT();
    const todayInvoices = invoices.filter(
      (i) => dateKey(i.serviceDate) === today || dateKey(i.createdAt) === today,
    );
    const scoped = todayInvoices.length > 0 ? todayInvoices : invoices;
    const totalInclVat = sumBy(scoped, (i) => i.total);
    const totalNet = sumBy(scoped, (i) => i.net);
    const totalVat = sumBy(scoped, (i) => i.vat);
    const pending = invoices.filter((i) => i.status === "sent" || i.status === "pending");
    const periodLabel = scoped.length && todayInvoices.length ? `Today · ${formatEATDisplay(today)}` : "All time";
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

  const topRoutes = useMemo(() => {
    const byRoute = new Map<string, number>();
    for (const inv of invoices) {
      const key = inv.route.trim();
      if (!key) continue;
      byRoute.set(key, (byRoute.get(key) ?? 0) + toNum(inv.total));
    }
    return [...byRoute.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, total]) => ({ id: name, name, total }));
  }, [invoices]);
  const maxRoute = toNum(topRoutes[0]?.total) || 1;

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
      .sort((a, b) => {
        const ca = a.createdAt ?? "";
        const cb = b.createdAt ?? "";
        if (ca && cb) return cb.localeCompare(ca);
        return dateKey(b.serviceDate).localeCompare(dateKey(a.serviceDate));
      })
      .slice(0, 5)
      .map((inv) => ({
        id: inv.id,
        dot: inv.status === "paid" ? "teal" : inv.status === "sent" || inv.status === "pending" ? "amber" : "blue",
        text: `Invoice ${inv.invoiceNo} · ${inv.plate} — ${inv.route}`,
        time: formatEATDisplay(inv.serviceDate) || "—",
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="min-w-0 rounded-fleet-sm bg-fleet-gray-50 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-fleet-gray-400">Net (excl. VAT)</div>
                <div className="truncate font-mono text-sm font-semibold tabular-nums sm:text-[15px]">KES {fmtN(stats.totalNet)}</div>
              </div>
              <div className="min-w-0 rounded-fleet-sm bg-accent-light p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-accent-dark">VAT @ 16%</div>
                <div className="truncate font-mono text-sm font-semibold tabular-nums text-accent-dark sm:text-[15px]">KES {fmtN(stats.totalVat)}</div>
              </div>
              <div className="min-w-0 rounded-fleet-sm bg-navy p-3 text-white sm:col-span-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-white/60">Total incl. VAT</div>
                <div className="truncate font-mono text-sm font-semibold tabular-nums text-accent sm:text-[15px]">KES {fmtN(stats.totalInclVat)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Top destinations by revenue</h2>
              <p className="text-xs text-fleet-gray-400">From live invoices</p>
            </div>
            <div className="flex flex-col">
              {topRoutes.length === 0 ? (
                <p className="py-4 text-center text-xs text-fleet-gray-400">No invoice data yet</p>
              ) : (
                topRoutes.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 border-b border-fleet-gray-50 py-1.5 last:border-0">
                    <span className="w-[115px] truncate text-[11px] capitalize text-fleet-gray-600">{d.name.toLowerCase()}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded bg-fleet-gray-100">
                      <div className="h-full rounded bg-navy" style={{ width: `${Math.round((toNum(d.total) / maxRoute) * 100)}%` }} />
                    </div>
                    <span className="min-w-[65px] text-right font-mono text-[11px] font-medium tabular-nums">{(toNum(d.total) / 1000).toFixed(0)}K</span>
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
                <p className="text-xs text-fleet-gray-400">Newest first · live from database</p>
              </div>
              <Link href="/admin/invoices" className="btn-secondary btn-sm">
                View all
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-xs text-fleet-gray-400">No invoices yet</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} className="dashboard-activity-row">
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
    </>
  );
}
