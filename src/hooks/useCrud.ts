"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiCacheKey,
  fetchApiCached,
  getApiCache,
  invalidateApiCache,
  setApiCache,
} from "@/lib/api-cache";
import { normalizeListJson } from "@/lib/list-query";
import { parseApiErrorResponse } from "@/lib/api-errors";

/** Reference tables — safe to load in full for dropdowns / cross-page lookups */
const FULL_LIST_ENDPOINTS = new Set([
  "vehicles",
  "rates",
  "routes",
  "drivers",
  "local-deliveries",
  "safari",
  "schedules",
  "invoices",
  "consolidated-invoices",
]);

function prependItem<T extends { id: string }>(items: T[], item: T): T[] {
  const rest = items.filter((x) => x.id !== item.id);
  return [item, ...rest];
}

export function useCrud<T extends { id: string }>(endpoint: string) {
  const fullList = FULL_LIST_ENDPOINTS.has(endpoint);
  const url = `/api/${endpoint}${fullList ? "?all=true" : ""}`;
  const cacheKey = apiCacheKey("GET", url);

  const [items, setItems] = useState<T[]>(() => getApiCache<T[]>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => getApiCache<T[]>(cacheKey) === undefined);

  const refresh = useCallback(async () => {
    const cached = getApiCache<T[]>(cacheKey);
    if (cached) {
      setItems(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchApiCached(cacheKey, async () => {
        const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) throw new Error("Fetch failed");
        return normalizeListJson<T>(await res.json()).data;
      });
      setItems(data);
    } catch {
      /* keep stale cache on network errors */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, url]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apiError = (res: Response, fallback: string) => parseApiErrorResponse(res, fallback);

  const bumpCache = (next: T[]) => {
    setItems(next);
    invalidateApiCache(`/api/${endpoint}`);
    setApiCache(cacheKey, next);
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
    bumpCache(prependItem(items, created));
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
    bumpCache(prependItem(items, updated));
    return updated;
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new Error("Delete failed");
    bumpCache(items.filter((x) => x.id !== id));
  };

  return { items, loading, refresh, create, update, remove };
}
