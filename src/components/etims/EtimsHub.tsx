"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconRefresh, IconShieldCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { EtimsRowActions, etimsStatusBadge, etimsStatusLabel } from "@/components/etims/EtimsRowActions";
import { usePagination } from "@/hooks/usePagination";
import type { EtimsDashboard } from "@/lib/etims-types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

export function EtimsHub() {
  const { toast } = useToast();
  const [data, setData] = useState<EtimsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const awaiting = data?.awaiting ?? [];
  const awaitingList = usePagination(awaiting, `${data?.enabled}-${awaiting.length}`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/etims/dashboard", { cache: "no-store", credentials: "same-origin" });
      const json = (await res.json()) as EtimsDashboard;
      setData(json);
    } catch {
      toast("Could not load eTIMS dashboard");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-fleet-gray-400">Loading eTIMS…</p>;
  }

  if (!data?.enabled) {
    return (
      <div className="card max-w-xl">
        <p className="text-sm text-fleet-gray-500">KRA eTIMS is not configured.</p>
      </div>
    );
  }

  const { connection, stats } = data;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="text-[15px] font-semibold">Digitax connection</h2>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={load}>
            <IconRefresh size={14} />
            Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={connection.connected ? "approved" : "rejected"}>
            {connection.connected ? "Connected" : "Disconnected"}
          </Badge>
          {connection.taxPin && (
            <span className="font-mono text-xs text-fleet-gray-500">PIN {connection.taxPin}</span>
          )}
          {connection.businessName && (
            <span className="text-xs text-fleet-gray-500">{connection.businessName}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-fleet-gray-500">{connection.message}</p>
      </div>

      <MetricsGrid>
        <MetricCard
          accent="amber"
          icon={IconShieldCheck}
          label="Awaiting filing"
          value={String(stats.awaitingFiling)}
          sub={
            stats.validated > 0
              ? `${stats.validated} validated · ready to submit`
              : "Validate, then submit to KRA"
          }
        />
        <MetricCard
          accent="teal"
          icon={IconShieldCheck}
          label="Filed on eTIMS"
          value={String(stats.filed)}
          sub="Submitted to KRA only"
        />
        <MetricCard
          accent="navy"
          icon={IconShieldCheck}
          label="VAT filed (month)"
          value={`KES ${fmtN(stats.vatFiledThisMonth)}`}
          sub="Current calendar month"
        />
        <MetricCard
          accent="red"
          icon={IconShieldCheck}
          label="Failed"
          value={String(stats.failed)}
          sub="Needs attention"
        />
      </MetricsGrid>

      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="text-[15px] font-semibold">Awaiting KRA filing</h2>
            <p className="text-xs text-fleet-gray-400">
              Validate keeps items here until you Submit to KRA. Hover for actions.
            </p>
          </div>
          <Link href="/admin/etims/history" className="btn-secondary btn-sm">
            Filing history
          </Link>
        </div>
        {awaiting.length === 0 ? (
          <p className="mt-3 text-sm text-fleet-gray-400">No invoices waiting to be filed.</p>
        ) : (
          <div className="table-wrap mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Ref</th>
                  <th>Description</th>
                  <th>VAT</th>
                  <th>Status</th>
                  <th className="w-[200px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {awaitingList.paginated.map((row) => (
                  <tr key={`${row.kind}-${row.recordId}`}>
                    <td>
                      <Badge variant={row.kind === "consolidated" ? "sent" : "draft"}>
                        {row.kind === "consolidated" ? "SOA" : "Invoice"}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs font-semibold text-navy">{row.invoiceNo}</td>
                    <td className="max-w-[240px] truncate text-xs text-fleet-gray-600" title={row.route}>
                      {row.route}
                    </td>
                    <td className="text-xs font-mono tabular-nums">KES {fmtN(row.vat)}</td>
                    <td>
                      <Badge variant={etimsStatusBadge(row.etimsStatus)}>
                        {etimsStatusLabel(row.etimsStatus)}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <EtimsRowActions row={row} onDone={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={awaitingList.page}
          totalPages={awaitingList.totalPages}
          total={awaitingList.total}
          from={awaitingList.from}
          to={awaitingList.to}
          onPage={awaitingList.setPage}
        />
      </div>
    </div>
  );
}
