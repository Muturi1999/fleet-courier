"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { EtimsHistoryItem } from "@/lib/etims-types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { formatEATDisplay } from "@/lib/dates";

function etimsBadge(status: string) {
  if (status === "submitted" || status === "valid") return "approved" as const;
  if (status === "failed") return "rejected" as const;
  return "pending" as const;
}

export function EtimsHistoryPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EtimsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const historyList = usePagination(rows, String(rows.length));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/etims/history", { cache: "no-store", credentials: "same-origin" });
      const json = (await res.json()) as EtimsHistoryItem[];
      setRows(Array.isArray(json) ? json : []);
    } catch {
      toast("Could not load filing history");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async (invoiceId: string) => {
    try {
      const res = await fetch("/api/etims/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast(data.message ?? "Status refreshed");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sync failed");
    }
  };

  if (loading) return <p className="text-sm text-fleet-gray-400">Loading history…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={load}>
          <IconRefresh size={14} />
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="text-sm text-fleet-gray-400">No eTIMS filings yet.</p>
          <Link href="/admin/etims" className="btn-accent btn-sm mt-3 inline-flex">
            Go to eTIMS hub
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Filed</th>
                <th>VAT</th>
                <th>CU / Ref</th>
                <th>Status</th>
                <th>Receipt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {historyList.paginated.map((row) => (
                <tr key={row.invoiceId}>
                  <td>
                    <div className="font-mono text-xs">{row.invoiceNo}</div>
                    <div className="text-[10px] text-fleet-gray-400">{row.route}</div>
                  </td>
                  <td className="text-xs text-fleet-gray-500">
                    {row.filedAt ? formatEATDisplay(row.filedAt) : "—"}
                  </td>
                  <td className="text-xs">KES {fmtN(row.vat)}</td>
                  <td className="font-mono text-[10px]">{row.kraReference ?? "—"}</td>
                  <td>
                    <Badge variant={etimsBadge(row.etimsStatus)}>{row.etimsStatus}</Badge>
                  </td>
                  <td>
                    {row.etimsUrl ? (
                      <a
                        href={row.etimsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal hover:underline"
                      >
                        KRA receipt
                        <IconExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-fleet-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="btn-ghost btn-xs" onClick={() => sync(row.invoiceId)}>
                      Sync
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={historyList.page}
            totalPages={historyList.totalPages}
            total={historyList.total}
            from={historyList.from}
            to={historyList.to}
            onPage={historyList.setPage}
          />
        </div>
      )}
    </div>
  );
}
