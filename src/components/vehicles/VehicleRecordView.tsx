"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Invoice, LocalDelivery, SafariEntry, ScheduleEntry, Vehicle } from "@/lib/types";
import { fmtN, formatRoute, shiftOf } from "@/lib/utils";
import { calcLocalBilling } from "@/lib/billing";
import { recordsForPlate } from "@/lib/filters";

export function VehicleRecordView({
  plate,
  vehicle,
  schedules,
  localDeliveries,
  safari,
  invoices,
}: {
  plate: string;
  vehicle?: Vehicle | null;
  schedules: ScheduleEntry[];
  localDeliveries: LocalDelivery[];
  safari: SafariEntry[];
  invoices: Invoice[];
}) {
  const linked = recordsForPlate(plate, schedules, localDeliveries, safari, invoices);

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-fleet-md bg-navy px-4 py-3 text-white">
        <p className="font-mono text-lg font-semibold">{plate}</p>
        {vehicle && (
          <p className="mt-1 text-xs text-white/60">
            {vehicle.cls} · {vehicle.runType} · {vehicle.status}
          </p>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">
          Schedule entries ({linked.schedules.length})
        </h3>
        {linked.schedules.length === 0 ? (
          <p className="text-xs text-fleet-gray-400">No schedule records</p>
        ) : (
          <div className="table-wrap max-h-36 !overflow-y-auto">
            <table className="data-table min-w-[480px] text-xs">
              <thead><tr><th>Route</th><th>Run</th><th>Days</th><th>Date</th><th>Total</th></tr></thead>
              <tbody>
                {linked.schedules.map((s) => (
                  <tr key={s.id}>
                    <td>{formatRoute(s.dest)}</td>
                    <td><Badge variant={s.runType === "Morning" ? "approved" : "sent"}>{s.runType}</Badge></td>
                    <td className="text-center">{s.days}</td>
                    <td className="text-[10px] text-fleet-gray-400">{s.serviceDate ?? s.month}</td>
                    <td className="font-mono">{fmtN(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">
          Local deliveries ({linked.locals.length})
        </h3>
        {linked.locals.length === 0 ? (
          <p className="text-xs text-fleet-gray-400">No local delivery records</p>
        ) : (
          <div className="table-wrap max-h-36 !overflow-y-auto">
            <table className="data-table min-w-[480px] text-xs">
              <thead><tr><th>Morning</th><th>Afternoon</th><th>Shift</th><th>Date</th><th>Amount</th></tr></thead>
              <tbody>
                {linked.locals.map((l) => {
                  const b = calcLocalBilling(l.m, l.a);
                  return (
                    <tr key={l.id}>
                      <td className="text-center">{l.m || "—"}</td>
                      <td className="text-center">{l.a || "—"}</td>
                      <td><Badge variant={shiftOf(l)}>{shiftOf(l)}</Badge></td>
                      <td className="text-[10px] text-fleet-gray-400">{l.serviceDate ?? l.period}</td>
                      <td className="font-mono">{fmtN(b.gross)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">
          Safari / upcountry ({linked.safari.length})
        </h3>
        {linked.safari.length === 0 ? (
          <p className="text-xs text-fleet-gray-400">No safari records</p>
        ) : (
          <div className="table-wrap max-h-36 !overflow-y-auto">
            <table className="data-table min-w-[480px] text-xs">
              <thead><tr><th>Trips</th><th>Destinations</th><th>Date</th></tr></thead>
              <tbody>
                {linked.safari.map((s) => (
                  <tr key={s.id}>
                    <td className="text-center font-semibold">{s.total}</td>
                    <td className="max-w-[200px] truncate text-[10px]">{s.dest}</td>
                    <td className="text-[10px] text-fleet-gray-400">{s.serviceDate ?? s.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fleet-gray-400">
          Invoices ({linked.invoices.length})
        </h3>
        {linked.invoices.length === 0 ? (
          <p className="text-xs text-fleet-gray-400">No invoices</p>
        ) : (
          <div className="table-wrap max-h-36 !overflow-y-auto">
            <table className="data-table min-w-[480px] text-xs">
              <thead><tr><th>Invoice #</th><th>Route</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {linked.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono">{i.invoiceNo}</td>
                    <td>{i.route}</td>
                    <td><Badge variant={i.status}>{i.status}</Badge></td>
                    <td className="font-mono">{fmtN(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-fleet-gray-100 pt-3">
        <Link href={`/admin/schedule?plate=${encodeURIComponent(plate)}`} className="btn-secondary btn-sm">Schedule</Link>
        <Link href={`/admin/local-deliveries?plate=${encodeURIComponent(plate)}`} className="btn-secondary btn-sm">Local</Link>
        <Link href={`/admin/safari?plate=${encodeURIComponent(plate)}`} className="btn-secondary btn-sm">Safari</Link>
        <Link href={`/admin/invoices?plate=${encodeURIComponent(plate)}`} className="btn-secondary btn-sm">Invoices</Link>
      </div>
    </div>
  );
}
