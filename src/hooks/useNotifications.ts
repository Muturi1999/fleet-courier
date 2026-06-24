"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiCacheKey,
  fetchApiCached,
  getApiCache,
  setApiCache,
} from "@/lib/api-cache";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

export function normalizeNotifications(raw: unknown): WorkflowNotification[] {
  if (Array.isArray(raw)) return raw.map(normalizeOne);
  if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
    return (raw as { data: unknown[] }).data.map((item) => normalizeOne(item as WorkflowNotification));
  }
  return [];
}

function normalizeOne(n: WorkflowNotification): WorkflowNotification {
  return { ...n, read: n.read === true || String(n.read).toLowerCase() === "true" };
}

export function useNotifications(audience: NotificationAudience) {
  const url = `/api/notifications?audience=${audience}&all=true`;
  const cacheKey = apiCacheKey("GET", url);

  const [items, setItems] = useState<WorkflowNotification[]>(
    () => getApiCache<WorkflowNotification[]>(cacheKey) ?? [],
  );
  const [loading, setLoading] = useState(() => getApiCache<WorkflowNotification[]>(cacheKey) === undefined);

  const refresh = useCallback(async () => {
    const cached = getApiCache<WorkflowNotification[]>(cacheKey);
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
        return normalizeNotifications(await res.json());
      });
      setItems(data);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, url]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    setItems(next);
    setApiCache(cacheKey, next);
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    if (!res.ok) await refresh();
  };

  const markAllRead = async () => {
    const next = items.map((n) => (n.audience === audience ? { ...n, read: true } : n));
    setItems(next);
    setApiCache(cacheKey, next);
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read", audience }),
    });
    if (!res.ok) await refresh();
  };

  return { items, loading, unread, refresh, markRead, markAllRead };
}
