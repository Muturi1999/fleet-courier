"use client";

import { useCallback, useEffect, useState } from "react";
import type { FleetFilters } from "@/lib/filters";
import { PAGE_SIZE } from "@/lib/filters";
import { buildListQuery, emptyMeta, normalizeListJson } from "@/lib/list-query";
import type { PaginatedMeta } from "@/lib/types";

type CursorState = { cursor: string | null; direction: "next" | "prev" };

export function useKeysetList<T extends { id: string }>(
  endpoint: string,
  options: {
    filters: FleetFilters;
    status?: string;
    tab?: string;
    month?: string;
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>({ ...emptyMeta(pageSize), mode: "keyset" });
  const [loading, setLoading] = useState(true);
  const [cursorState, setCursorState] = useState<CursorState>({ cursor: null, direction: "next" });
  const [canGoBack, setCanGoBack] = useState(false);

  const filterKey = JSON.stringify({
    endpoint,
    filters: options.filters,
    status: options.status,
    tab: options.tab,
    month: options.month,
    pageSize,
  });

  useEffect(() => {
    setCursorState({ cursor: null, direction: "next" });
    setCanGoBack(false);
  }, [filterKey]);

  const refreshPage = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    try {
      const qs = buildListQuery({
        limit: pageSize,
        filters: options.filters,
        status: options.status,
        tab: options.tab,
        month: options.month,
        useKeyset: true,
        cursor: cursorState.cursor ?? undefined,
        direction: cursorState.direction,
      });
      const res = await fetch(`/api/${endpoint}?${qs}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (res.ok) {
        const parsed = normalizeListJson<T>(await res.json(), pageSize);
        setItems(parsed.data);
        setMeta(parsed.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [
    endpoint,
    options.filters,
    options.status,
    options.tab,
    options.month,
    pageSize,
    options.enabled,
    cursorState,
  ]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage, filterKey, cursorState]);

  const apiError = async (res: Response, fallback: string) => {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
    const msg = body.message;
    if (Array.isArray(msg)) return msg.join(", ");
    return msg ?? body.error ?? fallback;
  };

  const fetchOne = useCallback(async (id: string): Promise<T | null> => {
    const res = await fetch(`/api/${endpoint}/${id}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }, [endpoint]);

  const create = async (data: Omit<T, "id">) => {
    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await apiError(res, "Create failed"));
    const created = (await res.json()) as T;
    setCursorState({ cursor: null, direction: "next" });
    setCanGoBack(false);
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
    return (await res.json()) as T;
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new Error("Delete failed");
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const nextPage = () => {
    if (!meta.nextCursor) return;
    setCanGoBack(true);
    setCursorState({ cursor: meta.nextCursor, direction: "next" });
  };

  const prevPage = () => {
    if (!meta.prevCursor) return;
    setCursorState({ cursor: meta.prevCursor, direction: "prev" });
  };

  return {
    items,
    meta,
    loading,
    refreshPage,
    fetchOne,
    create,
    update,
    remove,
    nextPage,
    prevPage,
    hasMore: Boolean(meta.hasMore),
    hasPrev: canGoBack,
  };
}
