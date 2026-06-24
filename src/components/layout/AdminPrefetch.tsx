"use client";

import { useEffect } from "react";
import { prefetchApi, prefetchCached, prefetchList } from "@/lib/api-cache";
import { normalizeNotifications } from "@/hooks/useNotifications";

/** Warm session cache for high-traffic admin lists (non-blocking). */
export function AdminPrefetch() {
  useEffect(() => {
    prefetchList("/api/vehicles?all=true", "array");
    prefetchList("/api/rates?all=true", "array");
    prefetchList("/api/routes?all=true", "array");
    prefetchApi("/api/billing-profile");
    prefetchList("/api/invoices?page=1&limit=10", "page");
    prefetchList("/api/work-tickets?page=1&limit=10", "page");
    prefetchList("/api/schedules?page=1&limit=10", "page");
    prefetchList("/api/expenses?page=1&limit=10", "page");
    prefetchList("/api/consolidated-invoices?all=true", "array");
    prefetchCached("/api/notifications?audience=admin&all=true", normalizeNotifications);
  }, []);

  return null;
}
