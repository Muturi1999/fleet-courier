"use client";

import { useCallback, useEffect, useState } from "react";
import { mapClientDashboard, type ClientDashboardData } from "@/lib/client-dashboard";

const POLL_MS = 60_000;

export function useClientDashboard() {
  const [data, setData] = useState<ClientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/clients/dashboard", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = (await res.json()) as Record<string, unknown>;
      setData(mapClientDashboard(json));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dashboard unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
