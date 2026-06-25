"use client";

import { useCallback, useEffect, useState } from "react";
import type { FleetFilters } from "@/lib/filters";
import type { ClientPortalFilters } from "@/lib/client-portal-filters";
import { PAGE_SIZE } from "@/lib/filters";
import { apiCacheKey, fetchApiCached, getApiCache, invalidateApiCache, setApiCache } from "@/lib/api-cache";
import { buildListQuery, emptyMeta, normalizeListJson } from "@/lib/list-query";
import type { PaginatedMeta, PaginatedResponse } from "@/lib/types";
import { parseApiErrorResponse } from "@/lib/api-errors";

function prependItem<T extends { id: string }>(items: T[], item: T): T[] {
  const rest = items.filter((x) => x.id !== item.id);
  return [item, ...rest];
}

export function usePaginatedList<T extends { id: string }>(
  endpoint: string,
  options: {
    page: number;
    filters: FleetFilters | ClientPortalFilters;
    status?: string;
    tab?: string;
    month?: string;
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const qs = buildListQuery({
    page: options.page,
    limit: pageSize,
    filters: options.filters,
    status: options.status,
    tab: options.tab,
    month: options.month,
  });
  const url = `/api/${endpoint}?${qs}`;
  const cacheKey = apiCacheKey("GET", url);

  const cached = getApiCache<PaginatedResponse<T>>(cacheKey);

  const [items, setItems] = useState<T[]>(() => cached?.data ?? []);
  const [meta, setMeta] = useState<PaginatedMeta>(() => cached?.meta ?? emptyMeta(pageSize));
  const [loading, setLoading] = useState(() => cached === undefined && options.enabled !== false);

  const queryKey = JSON.stringify({
    endpoint,
    page: options.page,
    filters: options.filters,
    status: options.status,
    tab: options.tab,
    month: options.month,
    pageSize,
  });

  const refreshPage = useCallback(async () => {
    if (options.enabled === false) return;

    const hit = getApiCache<PaginatedResponse<T>>(cacheKey);
    if (hit) {
      setItems(hit.data);
      setMeta(hit.meta);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const parsed = await fetchApiCached(cacheKey, async () => {
        const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) throw new Error("Fetch failed");
        return normalizeListJson<T>(await res.json(), pageSize);
      });
      setItems(parsed.data);
      setMeta(parsed.meta);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, url, pageSize, options.enabled]);

  useEffect(() => {
    void refreshPage();
  }, [refreshPage, queryKey]);

  const apiError = (res: Response, fallback: string) => parseApiErrorResponse(res, fallback);

  const fetchOne = useCallback(async (id: string): Promise<T | null> => {
    const res = await fetch(`/api/${endpoint}/${id}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }, [endpoint]);

  const patchLocal = (nextItems: T[], nextMeta: PaginatedMeta) => {
    setItems(nextItems);
    setMeta(nextMeta);
    invalidateApiCache(`/api/${endpoint}`);
    setApiCache(cacheKey, { data: nextItems, meta: nextMeta });
  };

  const create = async (data: Omit<T, "id">) => {
    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await apiError(res, "Create failed"));
    const created = (await res.json()) as T;
    patchLocal(prependItem(items, created), { ...meta, total: meta.total + 1 });
    return created;
  };

  const update = async (id: string, data: Partial<T>) => {
    const res = await fetch(`/api/${endpoint}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await apiError(res, "Update failed"));
    const updated = (await res.json()) as T;
    patchLocal(
      items.map((x) => (x.id === id ? updated : x)),
      meta,
    );
    return updated;
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new Error("Delete failed");
    patchLocal(
      items.filter((x) => x.id !== id),
      { ...meta, total: Math.max(0, meta.total - 1) },
    );
  };

  const totalPages = Math.max(1, meta.totalPages);
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    create,
    update,
    remove,
    totalPages,
    from,
    to,
  };
}
