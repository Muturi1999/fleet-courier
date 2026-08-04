"use client";

import { useEffect } from "react";
import { prefetchApi, prefetchCached, prefetchList } from "@/lib/api-cache";
import { normalizeNotifications } from "@/hooks/useNotifications";

/** Warm session cache for client portal lists (non-blocking). */
export function ClientPrefetch() {
  useEffect(() => {
    prefetchList("/api/clients/invoices?page=1&limit=10&tab=all", "page");
    prefetchList("/api/clients/invoices?page=1&limit=10&tab=awaiting", "page");
    prefetchList("/api/consolidated-invoices?page=1&limit=10&status=pending_approval", "page");
    prefetchList("/api/consolidated-invoices?page=1&limit=10&status=approved", "page");
    prefetchList("/api/clients/work-tickets?page=1&limit=10", "page");
    prefetchApi("/api/clients/dashboard");
    prefetchApi("/api/billing-profile");
    prefetchCached("/api/notifications?audience=client&all=true", normalizeNotifications);
  }, []);

  return null;
}
