import { prefetchApi, prefetchCached, prefetchList } from "@/lib/api-cache";
import { normalizeListJson } from "@/lib/list-query";
import { currentMonthRangeEAT } from "@/lib/dates";

function asList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  return normalizeListJson<T>(json).data;
}

function mapBillableVehicle(row: Record<string, unknown>) {
  return {
    plate: String(row.plate ?? ""),
    invoiceCount: Number(row.invoiceCount ?? row.invoice_count ?? 0),
    ticketCount: Number(row.ticketCount ?? row.ticket_count ?? 0),
    net: Number(row.net ?? 0),
    total: Number(row.total ?? 0),
    latestTrip: (row.latestTrip ?? row.latest_trip) as string | undefined,
  };
}

/** Prefetch list data for a sidebar route (hover / focus). */
export function prefetchAdminRoute(href: string): void {
  const { from, to } = currentMonthRangeEAT();
  const period = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  switch (href) {
    case "/admin/vehicles":
      prefetchList("/api/vehicles?all=true", "array");
      break;
    case "/admin/rates":
      prefetchList("/api/rates?all=true", "array");
      break;
    case "/admin/routes":
      prefetchList("/api/routes?all=true", "array");
      break;
    case "/admin/local-deliveries":
      prefetchList("/api/local-deliveries?all=true", "array");
      break;
    case "/admin/safari":
      prefetchList("/api/safari?all=true", "array");
      break;
    case "/admin/invoices":
    case "/admin/invoices/approved":
    case "/admin/invoices/rejected":
      prefetchList("/api/invoices?page=1&limit=10", "page");
      break;
    case "/admin/work-tickets":
    case "/admin/work-tickets/approved":
    case "/admin/work-tickets/rejected":
      prefetchList("/api/work-tickets?page=1&limit=10", "page");
      break;
    case "/admin/schedule":
      prefetchList("/api/schedules?page=1&limit=10", "page");
      break;
    case "/admin/expenses":
      prefetchList("/api/expenses?page=1&limit=10", "page");
      break;
    case "/admin/soa":
    case "/admin/soa/approved":
    case "/admin/soa/rejected":
      prefetchList("/api/consolidated-invoices?all=true", "array");
      prefetchCached(`/api/consolidated-invoices?vehicles=true&${period}`, (json) => {
        const rows = asList<Record<string, unknown>>(json);
        return rows.map(mapBillableVehicle).filter((v) => v.plate);
      });
      break;
    case "/admin/settings":
      prefetchApi("/api/billing-profile");
      break;
    case "/admin/etims":
      prefetchApi("/api/etims/dashboard");
      break;
    case "/admin/etims/history":
      prefetchApi("/api/etims/history");
      break;
    case "/admin/etims/profile":
      prefetchApi("/api/etims/profile");
      prefetchApi("/api/billing-profile");
      break;
    default:
      break;
  }
}
