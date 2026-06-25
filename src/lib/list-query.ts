import type { FleetFilters } from "./filters";
import { PAGE_SIZE } from "./filters";
import type { ClientPortalFilters } from "./client-portal-filters";
import { appendClientFilterQuery } from "./client-portal-filters";
import type { PaginatedMeta, PaginatedResponse } from "./types";

export function buildListQuery(params: {
  page?: number;
  limit?: number;
  filters?: FleetFilters | ClientPortalFilters;
  status?: string;
  tab?: string;
  month?: string;
  all?: boolean;
  useKeyset?: boolean;
  cursor?: string;
  direction?: "next" | "prev";
}): string {
  const q = new URLSearchParams();
  if (params.all) {
    q.set("all", "true");
  } else if (params.useKeyset) {
    q.set("useKeyset", "true");
    q.set("limit", String(params.limit ?? PAGE_SIZE));
    if (params.cursor) q.set("cursor", params.cursor);
    if (params.direction) q.set("direction", params.direction);
  } else {
    q.set("page", String(params.page ?? 1));
    q.set("limit", String(params.limit ?? PAGE_SIZE));
  }
  const f = params.filters;
  if (f?.search?.trim()) q.set("search", f.search.trim());
  if (f?.date) q.set("date", f.date);
  if (f?.destination?.trim()) q.set("destination", f.destination.trim());
  if (f?.runType?.trim()) q.set("runType", f.runType.trim());
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (f?.status && f.status !== "all" && !params.status) q.set("status", f.status);
  if (params.tab) q.set("tab", params.tab);
  if (params.month && params.month !== "all") q.set("month", params.month);
  if (f && "cls" in f) appendClientFilterQuery(q, f as ClientPortalFilters);
  return q.toString();
}

export function emptyMeta(limit = PAGE_SIZE): PaginatedMeta {
  return { page: 1, limit, total: 0, totalPages: 1 };
}

export function normalizeListJson<T>(json: unknown, limit = PAGE_SIZE): PaginatedResponse<T> {
  if (json && typeof json === "object" && "data" in json && Array.isArray((json as PaginatedResponse<T>).data)) {
    const envelope = json as PaginatedResponse<T>;
    return {
      data: envelope.data,
      meta: envelope.meta ?? emptyMeta(limit),
    };
  }
  if (Array.isArray(json)) {
    return {
      data: json as T[],
      meta: { page: 1, limit: json.length || limit, total: json.length, totalPages: 1 },
    };
  }
  return { data: [], meta: emptyMeta(limit) };
}
