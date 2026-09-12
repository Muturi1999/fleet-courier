import { buildListQuery } from "@/lib/list-query";
import type { FleetFilters } from "@/lib/filters";

export type ScheduleExportPreview = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  entryCount: number;
  vehicleCount: number;
  grandTotal: { cost: number; vat: number; total: number };
};

function exportQuery(options: { filters: FleetFilters; status?: string }): string {
  return buildListQuery({
    filters: options.filters,
    status: options.status,
    all: true,
  });
}

/** Download schedule .xlsx from GET /api/schedules/export (same filters as the list). */
export async function downloadScheduleExcel(options: {
  filters: FleetFilters;
  status?: string;
}): Promise<void> {
  const qs = exportQuery(options);
  const res = await fetch(`/api/schedules/export?${qs}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Schedule export failed");
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  const filename = match?.[1] || "schedule-entries.xlsx";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fetch export preview JSON (same filters/grouping as the .xlsx). */
export async function fetchScheduleExportPreview(options: {
  filters: FleetFilters;
  status?: string;
}): Promise<ScheduleExportPreview> {
  const qs = exportQuery(options);
  const res = await fetch(`/api/schedules/export/preview?${qs}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Schedule preview failed");
  }
  return (await res.json()) as ScheduleExportPreview;
}
