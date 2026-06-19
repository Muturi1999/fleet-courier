"use client";

import { useCallback, useEffect, useState } from "react";

export function useCrud<T extends { id: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${endpoint}`, { cache: "no-store", credentials: "same-origin" });
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (data: Omit<T, "id">) => {
    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Create failed");
    await refresh();
    return (await res.json()) as T;
  };

  const update = async (id: string, data: Partial<T>) => {
    const res = await fetch(`/api/${endpoint}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
    await refresh();
    return (await res.json()) as T;
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new Error("Delete failed");
    await refresh();
  };

  return { items, loading, refresh, create, update, remove };
}
