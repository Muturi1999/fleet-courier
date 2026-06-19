"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

function normalizeNotifications(raw: unknown): WorkflowNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const n = item as WorkflowNotification;
    return { ...n, read: n.read === true || String(n.read).toLowerCase() === "true" };
  });
}

export function useNotifications(audience: NotificationAudience) {
  const [items, setItems] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?audience=${audience}`);
      if (res.ok) setItems(normalizeNotifications(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    if (!res.ok) await refresh();
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => (n.audience === audience ? { ...n, read: true } : n)));
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read", audience }),
    });
    if (!res.ok) await refresh();
  };

  return { items, loading, unread, refresh, markRead, markAllRead };
}
