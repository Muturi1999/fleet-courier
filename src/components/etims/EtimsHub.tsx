"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconRefresh,
  IconShieldCheck,
  IconUpload,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { EtimsDashboard, EtimsHistoryItem } from "@/lib/etims-types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

function etimsBadge(status: string) {
  if (status === "submitted" || status === "valid") return "approved" as const;
  if (status === "failed") return "rejected" as const;
  return "pending" as const;
}

function InvoiceEtimsActions({ row, onDone }: { row: EtimsHistoryItem; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"validate" | "submit" | null>(null);

  const validate = async () => {
    setBusy("validate");
    try {
      const res = await fetch("/api/etims/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: row.invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Validation failed");
      toast(data.message ?? `Invoice ${row.invoiceNo} validated`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy("submit");
    try {
      const res = await fetch("/api/etims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: row.invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Submission failed");
      toast(data.message ?? `Invoice ${row.invoiceNo} filed on KRA eTIMS`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="btn-ghost btn-xs" onClick={validate} disabled={busy !== null}>
        {busy === "validate" ? "…" : "Validate"}
      </button>
      <button type="button" className="btn-accent btn-xs" onClick={submit} disabled={busy !== null}>
        <IconUpload size={12} />
        {busy === "submit" ? "…" : "Submit"}
      </button>
      <Link href={`/admin/invoices?view=${row.invoiceId}`} className="btn-ghost btn-xs">
        View
      </Link>
    </div>
  );
}

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
        <MetricCard accent="amber" icon={IconShieldCheck} label="Awaiting filing" value={String(stats.awaitingFiling)} sub="Sent, not on eTIMS" />
        <MetricCard accent="teal" icon={IconShieldCheck} label="Filed on eTIMS" value={String(stats.filed)} sub="Submitted to KRA" />
        <MetricCard accent="navy" icon={IconShieldCheck} label="VAT filed (month)" value={`KES ${fmtN(stats.vatFiledThisMonth)}`} sub="Current calendar month" />
        <MetricCard accent="red" icon={IconShieldCheck} label="Failed" value={String(stats.failed)} sub="Needs attention" />
      </MetricsGrid>

      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="text-[15px] font-semibold">Invoices awaiting KRA filing</h2>
            <p className="text-xs text-fleet-gray-400">Sent or approved invoices not yet on eTIMS.</p>
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
                  <th>Invoice</th>
                  <th>Route</th>
                  <th>VAT</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {awaitingList.paginated.map((row) => (
                  <tr key={row.invoiceId}>
                    <td className="font-mono text-xs">{row.invoiceNo}</td>
                    <td className="text-xs">{row.route}</td>
                    <td className="text-xs">KES {fmtN(row.vat)}</td>
                    <td>
                      <Badge variant={etimsBadge(row.etimsStatus)}>{row.etimsStatus}</Badge>
                    </td>
                    <td>
                      <InvoiceEtimsActions row={row} onDone={load} />
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
