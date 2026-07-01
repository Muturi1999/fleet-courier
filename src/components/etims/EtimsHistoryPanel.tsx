"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EtimsHistoryActions } from "@/components/etims/EtimsHistoryActions";
import { EtimsHistoryQr } from "@/components/etims/EtimsHistoryQr";
import { etimsStatusBadge, etimsStatusLabel } from "@/components/etims/EtimsRowActions";
import { usePagination } from "@/hooks/usePagination";
import type { EtimsHistoryItem } from "@/lib/etims-types";
import { fmtN } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { formatEATDisplay } from "@/lib/dates";

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

  if (loading) return <p className="text-sm text-fleet-gray-400">Loading history…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fleet-gray-500">
          Submitted to KRA eTIMS via Digitax — view, download, or print the fiscal tax invoice.
        </p>
        <button type="button" className="btn-ghost btn-sm" onClick={load}>
          <IconRefresh size={14} />
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="text-sm text-fleet-gray-400">No eTIMS filings yet. Submit from the eTIMS hub after validation.</p>
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
                <th className="text-center">QR</th>
                <th>Receipt</th>
                <th className="w-[180px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyList.paginated.map((row) => (
                <tr key={`${row.kind}-${row.recordId}`}>
                  <td>
                    <div className="font-mono text-xs">
                      {row.kind === "consolidated" ? "SOA " : ""}
                      {row.invoiceNo}
                    </div>
                    <div className="max-w-[200px] truncate text-[10px] text-fleet-gray-400" title={row.route}>
                      {row.route}
                    </div>
                  </td>
                  <td className="text-xs text-fleet-gray-500">
                    {row.filedAt ? formatEATDisplay(row.filedAt) : "—"}
                  </td>
                  <td className="text-xs">KES {fmtN(row.vat)}</td>
                  <td className="font-mono text-[10px]">{row.kraReference ?? "—"}</td>
                  <td>
                    <Badge variant={etimsStatusBadge(row.etimsStatus)}>
                      {etimsStatusLabel(row.etimsStatus)}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <EtimsHistoryQr row={row} />
                  </td>
                  <td>
                    {row.digitaxSaleUrl || row.etimsUrl ? (
                      <div className="flex flex-col gap-1 text-xs">
                        {row.digitaxSaleUrl && (
                          <a
                            href={row.digitaxSaleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-teal hover:underline"
                          >
                            Digitax
                            <IconExternalLink size={12} />
                          </a>
                        )}
                        {row.etimsUrl && (
                          <a
                            href={row.etimsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-navy hover:underline"
                          >
                            KRA receipt
                            <IconExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-fleet-gray-400">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    <EtimsHistoryActions row={row} onDone={load} />
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
