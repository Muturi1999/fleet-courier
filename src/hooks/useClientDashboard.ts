"use client";

import { useCallback, useEffect, useState } from "react";
import { mapClientDashboard, type ClientDashboardData } from "@/lib/client-dashboard";
import { WORKFLOW_UPDATED_EVENT } from "@/lib/workflow-events";

const POLL_MS = 30_000;

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
    const onWorkflow = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(WORKFLOW_UPDATED_EVENT, onWorkflow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(WORKFLOW_UPDATED_EVENT, onWorkflow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
