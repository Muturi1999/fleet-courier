import Link from "next/link";
import {
  IconClock,
  IconCurrencyDollar,
  IconExternalLink,
  IconFileInvoice,
  IconTruck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { destRevenue, vehicleRevenue } from "@/lib/data/mock-data";
import { fmtN } from "@/lib/utils";

const workflowSteps = [
  { state: "done", num: "Step 1", title: "Schedule entry", sub: "291 lines logged" },
  { state: "done", num: "Step 2", title: "Invoices generated", sub: "291 / 291 lines" },
  { state: "done", num: "Step 3", title: "SOA sent to G4S", sub: "Ref: 101/03/26" },
  { state: "active", num: "Step 4", title: "G4S approval", sub: "12 invoices pending" },
  { state: "done", num: "Step 5", title: "KRA eTIMS submitted", sub: "All compliant · #18670–18960" },
  { state: "pending", num: "Step 6", title: "Payment received", sub: "Expected: 30 Mar 2026" },
];

const activities = [
  { dot: "blue", text: "Invoice #18960 sent to G4S (KDC 183M — Mombasa)", time: "Today, 09:14" },
  { dot: "teal", text: "eTIMS confirmed — 291 invoices (#18670–18960)", time: "Today, 08:52" },
  { dot: "amber", text: "SOA 101/03/26 generated — KES 17,624,460", time: "Yesterday, 16:30" },
  { dot: "amber", text: "KDR 566W — Bomet 25 days logged: KES 580,000", time: "Yesterday, 12:10" },
  { dot: "teal", text: "Feb 2026 SOA settled — KES 17,151,054 received", time: "1 Mar 2026" },
];

export default function DashboardPage() {
  const topVehicles = vehicleRevenue.slice(0, 10);
  const topDests = destRevenue.slice(0, 10);
  const maxDest = topDests[0]?.total ?? 1;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="teal" icon={IconCurrencyDollar} label="Total invoiced (Mar 2026)" value="17.62M" sub="KES incl. 16% VAT · 291 lines" />
        <MetricCard accent="navy" icon={IconFileInvoice} label="Invoice lines" value="291" sub="88 vehicles · March 2026" />
        <MetricCard accent="amber" icon={IconTruck} label="Active fleet" value="88" sub="7T · 15T · Canter · Van" />
        <MetricCard accent="red" icon={IconClock} label="Pending G4S approval" value="12" sub="Awaiting sign-off · #18920–18931" />
      </MetricsGrid>

      <div className="section-header">
        <h2 className="text-[15px] font-semibold">Monthly workflow — March 2026</h2>
      </div>
      <div className="mb-6 flex overflow-x-auto">
        {workflowSteps.map((step) => (
          <div
            key={step.num}
            className={`flex min-w-[140px] flex-1 flex-col gap-1.5 border border-fleet-gray-100 p-3.5 first:rounded-l-fleet-md last:rounded-r-fleet-md [&+&]:border-l-0 ${
              step.state === "done"
                ? "border-[#9FE1CB] bg-teal-light"
                : step.state === "active"
                  ? "border-[#FAC775] bg-accent-light"
                  : "bg-fleet-gray-50"
            }`}
          >
            <div className={`text-[10px] font-bold uppercase tracking-wide ${step.state === "done" ? "text-teal" : step.state === "active" ? "text-accent-dark" : "text-fleet-gray-400"}`}>
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
              <h2 className="text-[15px] font-semibold">Revenue by route type · March 2026</h2>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Nairobi Morning (7T)", val: "KES 5.58M", w: "100%", color: "bg-navy" },
                { label: "Nairobi Afternoon (7T)", val: "KES 3.23M", w: "58%", color: "bg-accent" },
                { label: "Upcountry routes", val: "KES 7.62M", w: "68%", color: "bg-teal" },
                { label: "Canter / Van routes", val: "KES 1.20M", w: "21%", color: "bg-fleet-blue" },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-xs text-fleet-gray-600">
                    <span>{bar.label}</span>
                    <span className="font-mono font-medium">{bar.val}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-fleet-gray-100">
                    <div className={`h-full rounded ${bar.color}`} style={{ width: bar.w }} />
                  </div>
                </div>
              ))}
            </div>
            <hr className="my-5 border-fleet-gray-100" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-fleet-sm bg-fleet-gray-50 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-fleet-gray-400">Net (excl. VAT)</div>
                <div className="font-mono text-[15px] font-semibold">KES 15,193,500</div>
              </div>
              <div className="rounded-fleet-sm bg-accent-light p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-accent-dark">VAT @ 16%</div>
                <div className="font-mono text-[15px] font-semibold text-accent-dark">KES 2,430,960</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Top destinations by revenue · March 2026</h2>
            </div>
            <div className="flex flex-col">
              {topDests.map((d) => (
                <div key={d.dest} className="flex items-center gap-2.5 border-b border-fleet-gray-50 py-1.5 last:border-0">
                  <span className="w-[115px] truncate text-[11px] capitalize text-fleet-gray-600">{d.dest.toLowerCase()}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded bg-fleet-gray-100">
                    <div className="h-full rounded bg-navy" style={{ width: `${Math.round((d.total / maxDest) * 100)}%` }} />
                  </div>
                  <span className="min-w-[65px] text-right font-mono text-[11px] font-medium">{(d.total / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card">
            <div className="section-header">
              <div>
                <h2 className="text-[15px] font-semibold">Statement of Account</h2>
                <p className="text-xs text-fleet-gray-400">G4S Courier Services · Actual data</p>
              </div>
            </div>
            {[
              { ref: "101/01/26", month: "January 2026", amt: "KES 15,800,000", status: "paid" as const },
              { ref: "101/02/26", month: "February 2026", amt: "KES 17,151,054", status: "paid" as const },
              { ref: "101/03/26", month: "March 2026", amt: "KES 17,624,460", status: "pending" as const, highlight: true },
            ].map((soa) => (
              <div
                key={soa.ref}
                className={`flex items-center gap-3.5 border-b border-fleet-gray-50 py-3 last:border-0 ${soa.highlight ? "-mx-5 bg-accent-light px-5" : ""}`}
              >
                <span className={`w-[90px] font-mono text-xs ${soa.highlight ? "text-accent-dark" : "text-fleet-gray-400"}`}>{soa.ref}</span>
                <span className={`flex-1 text-[13px] ${soa.highlight ? "font-semibold" : "font-medium"}`}>{soa.month}</span>
                <span className={`w-[110px] text-right font-mono text-[13px] ${soa.highlight ? "font-semibold" : ""}`}>{soa.amt}</span>
                <Badge variant={soa.status}>{soa.status === "paid" ? "Settled" : "Pending"}</Badge>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-header">
              <h2 className="text-[15px] font-semibold">Recent activity</h2>
            </div>
            {activities.map((a) => (
              <div key={a.text} className="flex gap-3 border-b border-fleet-gray-50 py-3 last:border-0">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.dot === "blue" ? "bg-fleet-blue" : a.dot === "amber" ? "bg-accent" : "bg-teal"}`} />
                <div className="flex-1 text-[13px]">{a.text}</div>
                <div className="whitespace-nowrap font-mono text-[11px] text-fleet-gray-400">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="text-[15px] font-semibold">Top vehicles by revenue · March 2026</h2>
        <Link href="/vehicles" className="btn-secondary btn-sm">
          <IconExternalLink size={14} /> All vehicles
        </Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle</th><th>Class</th><th>Runs</th><th>Days</th><th>Routes</th><th>Net (KES)</th><th>VAT</th><th>Total (KES)</th>
            </tr>
          </thead>
          <tbody>
            {topVehicles.map((v) => {
              const net = Math.round(v.total / 1.16);
              const vat = v.total - net;
              return (
                <tr key={v.plate}>
                  <td className="font-mono font-semibold">{v.plate}</td>
                  <td><Badge variant={v.cls === "15T" ? "sent" : v.cls === "CANTER" ? "pending" : "draft"}>{v.cls}</Badge></td>
                  <td className="text-center font-semibold">{v.runs}</td>
                  <td className="font-mono text-[11px]">{v.days}</td>
                  <td className="max-w-[160px] truncate text-[11px] text-fleet-gray-600">{v.dests.slice(0, 3).join(" · ")}</td>
                  <td className="font-mono">{fmtN(net)}</td>
                  <td className="font-mono text-fleet-gray-400">{fmtN(vat)}</td>
                  <td className="font-mono font-semibold text-navy">{fmtN(v.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
