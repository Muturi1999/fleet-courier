"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

export function useNotifications(audience: NotificationAudience) {
  const [items, setItems] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?audience=${audience}`);
      if (res.ok) setItems(await res.json());
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
    await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    await refresh();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read", audience }),
    });
    await refresh();
  };

  return { items, loading, unread, refresh, markRead, markAllRead };
}
