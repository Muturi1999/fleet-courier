"use client";

import { useMemo, useState } from "react";
import {
  IconCoin,
  IconDownload,
  IconFileSpreadsheet,
  IconMap2,
  IconReceiptTax,
  IconTruck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { BarChart, DonutChart, HorizontalBars } from "@/components/reports/BarChart";
import { downloadExcelFriendly } from "@/lib/export-csv";
import {
  REPORT_MONTHS,
  computeClassBreakdown,
  computeDestBreakdown,
  computeFleetRanking,
  computeVatSummary,
  computeVehicleReport,
  invoiceStatusBreakdown,
  revenueTrend,
  snapshotForMonth,
  type ReportMonthKey,
} from "@/lib/reports";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePagination } from "@/hooks/usePagination";
import type { Invoice, ScheduleEntry, Vehicle } from "@/lib/types";

type ReportTab = "overview" | "vat" | "fleet" | "vehicle" | "destinations";

const CLASS_COLORS: Record<string, string> = {
  "7T": "#1E3A5F",
  "15T": "#185FA5",
  CANTER: "#0D9488",
  VAN: "#D97706",
};

export function ReportsDashboard({ role }: { role: "admin" | "client" }) {
  const { toast } = useToast();
  const { items: invoices, loading: invLoading } = useCrud<Invoice>("invoices");
  const { items: schedules, loading: schLoading } = useCrud<ScheduleEntry>("schedules");
  const { items: vehicles, loading: vehLoading } = useCrud<Vehicle>("vehicles");

  const [month, setMonth] = useState<ReportMonthKey>("2026-03");
  const [tab, setTab] = useState<ReportTab>("overview");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const loading = invLoading || schLoading || vehLoading;
  const snap = snapshotForMonth(month);

  const vat = useMemo(() => computeVatSummary(invoices, month), [invoices, month]);
  const classBreakdown = useMemo(
    () => computeClassBreakdown(vehicles, schedules, month),
    [vehicles, schedules, month],
  );
  const fleet = useMemo(() => computeFleetRanking(vehicles, schedules, month), [vehicles, schedules, month]);
  const destinations = useMemo(() => computeDestBreakdown(schedules, month), [schedules, month]);
  const statusBreakdown = useMemo(() => invoiceStatusBreakdown(invoices, month), [invoices, month]);

  const plates = useMemo(() => fleet.map((f) => f.plate), [fleet]);
  const selectedPlate = vehiclePlate || plates[0] || "";
  const vehicleReport = useMemo(
    () => computeVehicleReport(selectedPlate, invoices, schedules, month),
    [selectedPlate, invoices, schedules, month],
  );

  const trend = revenueTrend();
  const displayTrend =
    month === "ytd"
      ? trend
      : month === "2026-01"
        ? trend.filter((t) => t.label.startsWith("Jan"))
        : month === "2026-02"
          ? trend.filter((t) => t.label.startsWith("Feb"))
          : trend.filter((t) => t.label.startsWith("Mar"));

  const fleetFilterKey = `${month}-${tab}`;
  const { paginated: fleetPage, ...fleetPagination } = usePagination(fleet, fleetFilterKey);
  const { paginated: vatPage, ...vatPagination } = usePagination(vat.lines, `${month}-vat`);
  const { paginated: destPage, ...destPagination } = usePagination(destinations, `${month}-dest`);
  const { paginated: vehRowsPage, ...vehRowsPagination } = usePagination(
    vehicleReport.rows,
    `${month}-${selectedPlate}`,
  );

  const exportToast = (name: string) => toast(`Exported ${name} — open in Excel`);

  const tabs: { id: ReportTab; label: string; adminOnly?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "vat", label: "VAT report" },
    { id: "fleet", label: "Fleet ranking" },
    { id: "vehicle", label: "Single vehicle" },
    { id: "destinations", label: "Destinations", adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => role === "admin" || !t.adminOnly);
  const monthLabel = REPORT_MONTHS.find((m) => m.key === month)?.label ?? "";
  const monthShort = REPORT_MONTHS.find((m) => m.key === month)?.short ?? "";

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "filter-tab filter-tab-active" : "filter-tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="field-input h-[38px] w-full min-w-[180px] sm:w-auto"
          value={month}
          onChange={(e) => setMonth(e.target.value as ReportMonthKey)}
        >
          {REPORT_MONTHS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {tab === "overview" && (
        <>
          <MetricsGrid>
            <MetricCard
              accent="teal"
              icon={IconCoin}
              label={`Revenue · ${monthShort}`}
              value={`${(snap.total / 1_000_000).toFixed(2)}M`}
              sub={`KES ${fmtN(snap.total)} incl. VAT`}
            />
            <MetricCard accent="amber" icon={IconReceiptTax} label="VAT @ 16%" value={`${(snap.vat / 1_000_000).toFixed(2)}M`} sub={`Net KES ${fmtN(snap.net)}`} />
            <MetricCard accent="navy" icon={IconTruck} label="Active fleet" value={String(snap.vehicles)} sub={`${snap.invoices} invoice lines`} />
            <MetricCard accent="red" icon={IconMap2} label="Schedule runs" value={String(snap.runs)} sub={`${destinations.length} destinations`} />
          </MetricsGrid>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="section-header">
                <div>
                  <h2 className="text-[15px] font-semibold">Monthly revenue trend</h2>
                  <p className="text-xs text-fleet-gray-400">Jan – Mar 2026 · contract actuals</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    downloadExcelFriendly("revenue-trend-2026", ["Month", "Net (KES)", "VAT (KES)", "Total (KES)"], trend.map((t) => [t.label, t.net, t.vat, t.total]));
                    exportToast("revenue trend");
                  }}
                >
                  <IconDownload size={14} /> Excel
                </button>
              </div>
              <BarChart
                data={displayTrend.map((t) => ({ label: t.label, total: t.total }))}
                highlightLast={month === "ytd"}
              />
            </div>

            <div className="card">
              <div className="section-header">
                <div>
                  <h2 className="text-[15px] font-semibold">Fleet class breakdown</h2>
                  <p className="text-xs text-fleet-gray-400">{monthShort}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    downloadExcelFriendly(`class-breakdown-${month}`, ["Class", "Vehicles", "Net", "VAT", "Total"], classBreakdown.map((c) => [c.cls, c.vehicles, c.net, c.vat, c.total]));
                    exportToast("class breakdown");
                  }}
                >
                  <IconDownload size={14} /> Excel
                </button>
              </div>
              <DonutChart
                segments={classBreakdown.map((c) => ({
                  label: `${c.cls} (${c.vehicles})`,
                  value: c.total,
                  color: CLASS_COLORS[c.cls] ?? "#64748B",
                }))}
              />
            </div>
          </div>

          {role === "admin" && statusBreakdown.length > 0 && (
            <div className="card mt-4">
              <div className="section-header">
                <h2 className="text-[15px] font-semibold">Invoice status · {monthShort}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusBreakdown.map((s) => (
                  <Badge key={s.status} variant={s.status as "draft"}>{s.status}: {s.count}</Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "vat" && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="text-[15px] font-semibold">VAT summary · {monthLabel}</h2>
              <p className="text-xs text-fleet-gray-400">16% VAT · exportable for G4S accounting</p>
            </div>
            <button
              type="button"
              className="btn-accent btn-sm"
              onClick={() => {
                downloadExcelFriendly(
                  `vat-report-${month}`,
                  ["Invoice #", "Vehicle", "Route", "Days", "Net (KES)", "VAT (KES)", "Total (KES)", "Status"],
                  vat.lines.map((l) => [l.invoiceNo, l.plate, l.route, l.days, l.net, l.vat, l.total, l.status]),
                );
                exportToast("VAT report");
              }}
            >
              <IconFileSpreadsheet size={14} /> Export all lines
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Invoice lines", vat.count],
              ["Net (excl. VAT)", `KES ${fmtN(vat.net)}`],
              ["VAT @ 16%", `KES ${fmtN(vat.vat)}`],
              ["Grand total", `KES ${fmtN(vat.total)}`],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase text-fleet-gray-400">{k}</p>
                <p className="font-mono text-sm font-semibold text-navy">{v}</p>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Vehicle</th>
                  <th>Route</th>
                  <th className="hidden sm:table-cell">Days</th>
                  <th>Net</th>
                  <th>VAT</th>
                  <th>Total</th>
                  <th className="hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
                ) : vatPage.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-fleet-gray-400">No lines for this period</td></tr>
                ) : (
                  vatPage.map((l) => (
                    <tr key={l.id}>
                      <td className="font-mono font-medium">{l.invoiceNo}</td>
                      <td className="font-mono">{l.plate}</td>
                      <td className="max-w-[120px] truncate text-xs">{l.route}</td>
                      <td className="hidden sm:table-cell text-center">{l.days}</td>
                      <td className="font-mono text-xs">{fmtN(l.net)}</td>
                      <td className="font-mono text-xs text-accent-dark">{fmtN(l.vat)}</td>
                      <td className="font-mono text-xs font-medium">{fmtN(l.total)}</td>
                      <td className="hidden md:table-cell"><Badge variant={l.status}>{l.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...vatPagination} onPage={vatPagination.setPage} />
        </div>
      )}

      {tab === "fleet" && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="text-[15px] font-semibold">Fleet revenue ranking</h2>
              <p className="text-xs text-fleet-gray-400">{fleet.length} vehicles · {monthShort}</p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                downloadExcelFriendly(
                  `fleet-ranking-${month}`,
                  ["Rank", "Plate", "Class", "Runs", "Days", "Net", "VAT", "Total", "Routes"],
                  fleet.map((f, i) => [i + 1, f.plate, f.cls, f.runs, f.days, f.net, f.vat, f.total, f.routes.join("; ")]),
                );
                exportToast("fleet ranking");
              }}
            >
              <IconDownload size={14} /> Excel
            </button>
          </div>

          <div className="mb-4 hidden lg:block">
            <HorizontalBars
              items={fleet.slice(0, 10).map((f) => ({
                label: `${f.plate} · ${f.cls}`,
                value: f.total,
                sub: `${f.runs} runs · ${f.days} days`,
              }))}
            />
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plate</th>
                  <th>Class</th>
                  <th className="hidden sm:table-cell">Runs</th>
                  <th className="hidden md:table-cell">Days</th>
                  <th>Net</th>
                  <th className="hidden lg:table-cell">VAT</th>
                  <th>Total</th>
                  <th className="hidden xl:table-cell">Routes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-fleet-gray-400">Loading…</td></tr>
                ) : (
                  fleetPage.map((f, i) => (
                    <tr key={f.plate}>
                      <td className="text-fleet-gray-400">{(fleetPagination.page - 1) * 10 + i + 1}</td>
                      <td className="font-mono font-semibold">{f.plate}</td>
                      <td><Badge variant="draft">{f.cls}</Badge></td>
                      <td className="hidden sm:table-cell">{f.runs}</td>
                      <td className="hidden md:table-cell">{f.days}</td>
                      <td className="font-mono text-xs">{fmtN(f.net)}</td>
                      <td className="hidden lg:table-cell font-mono text-xs">{fmtN(f.vat)}</td>
                      <td className="font-mono text-xs font-semibold text-navy">{fmtN(f.total)}</td>
                      <td className="hidden max-w-[160px] truncate xl:table-cell text-[10px] text-fleet-gray-400">{f.routes.slice(0, 3).join(", ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...fleetPagination} onPage={fleetPagination.setPage} />
        </div>
      )}

      {tab === "vehicle" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">Select vehicle</label>
                <select
                  className="field-input w-full sm:max-w-xs"
                  value={selectedPlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                >
                  {plates.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {vehicleReport.summary && (
                <button
                  type="button"
                  className="btn-accent btn-sm"
                  onClick={() => {
                    const s = vehicleReport.summary!;
                    downloadExcelFriendly(
                      `vehicle-${selectedPlate.replace(/\s/g, "-")}-${month}`,
                      ["Plate", "Class", "Route/Source", "Days", "Net", "VAT", "Total"],
                      [
                        [s.plate, s.cls, "SUMMARY", s.days, s.net, s.vat, s.total],
                        ...vehicleReport.rows.map((r) => [r.plate, r.cls, `${r.route} (${r.source})`, r.days, r.net, r.vat, r.total]),
                      ],
                    );
                    exportToast(`vehicle report ${selectedPlate}`);
                  }}
                >
                  <IconFileSpreadsheet size={14} /> Export vehicle report
                </button>
              )}
            </div>

            {vehicleReport.summary ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Class", vehicleReport.summary.cls],
                  ["Runs", String(vehicleReport.summary.runs)],
                  ["Days", String(vehicleReport.summary.days)],
                  ["Net", `KES ${fmtN(vehicleReport.summary.net)}`],
                  ["Total incl. VAT", `KES ${fmtN(vehicleReport.summary.total)}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-fleet-sm border border-fleet-gray-100 px-3 py-2">
                    <p className="text-[10px] uppercase text-fleet-gray-400">{k}</p>
                    <p className="font-mono text-sm font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-fleet-gray-400">No activity for this vehicle in the selected period.</p>
            )}
          </div>

          {vehicleReport.rows.length > 0 && (
            <div className="card">
              <div className="section-header">
                <h2 className="text-[15px] font-semibold">Line detail · {selectedPlate}</h2>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Source</th>
                      <th>Days</th>
                      <th>Net</th>
                      <th>VAT</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehRowsPage.map((r, i) => (
                      <tr key={`${r.route}-${r.source}-${i}`}>
                        <td className="text-xs">{r.route}</td>
                        <td><Badge variant={r.source === "invoice" ? "sent" : "approved"}>{r.source}</Badge></td>
                        <td className="text-center">{r.days}</td>
                        <td className="font-mono text-xs">{fmtN(r.net)}</td>
                        <td className="font-mono text-xs">{fmtN(r.vat)}</td>
                        <td className="font-mono text-xs font-medium">{fmtN(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination {...vehRowsPagination} onPage={vehRowsPagination.setPage} />
            </div>
          )}
        </div>
      )}

      {tab === "destinations" && role === "admin" && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="text-[15px] font-semibold">Destination revenue</h2>
              <p className="text-xs text-fleet-gray-400">Schedule breakdown by route · {monthShort}</p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                downloadExcelFriendly(
                  `destinations-${month}`,
                  ["Destination", "Trips", "Net", "VAT", "Total"],
                  destinations.map((d) => [d.dest, d.trips, d.net, d.vat, d.total]),
                );
                exportToast("destination report");
              }}
            >
              <IconDownload size={14} /> Excel
            </button>
          </div>

          <div className="mb-4">
            <HorizontalBars items={destinations.slice(0, 12).map((d) => ({ label: d.dest, value: d.total, sub: `${d.trips} trips` }))} />
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Destination</th><th>Trips</th><th>Net</th><th>VAT</th><th>Total</th></tr>
              </thead>
              <tbody>
                {destPage.map((d) => (
                  <tr key={d.dest}>
                    <td className="font-medium">{d.dest}</td>
                    <td>{d.trips}</td>
                    <td className="font-mono text-xs">{fmtN(d.net)}</td>
                    <td className="font-mono text-xs">{fmtN(d.vat)}</td>
                    <td className="font-mono text-xs font-semibold">{fmtN(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...destPagination} onPage={destPagination.setPage} />
        </div>
      )}
    </>
  );
}
