"use client";

import { useCallback, useEffect, useState } from "react";
import { apiCacheKey, fetchApiCached, getApiCache, setApiCache } from "@/lib/api-cache";
import type { BillingProfile } from "@/lib/types";

const CACHE_KEY = apiCacheKey("GET", "/api/billing-profile");

export function useBillingProfile() {
  const [profile, setProfile] = useState<BillingProfile | null>(() => getApiCache<BillingProfile>(CACHE_KEY) ?? null);
  const [loading, setLoading] = useState(() => getApiCache<BillingProfile>(CACHE_KEY) === undefined);

  const refresh = useCallback(async () => {
    const cached = getApiCache<BillingProfile>(CACHE_KEY);
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchApiCached(CACHE_KEY, async () => {
        const res = await fetch("/api/billing-profile", { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) throw new Error("Fetch failed");
        return (await res.json()) as BillingProfile;
      });
      setProfile(data);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async (next: BillingProfile) => {
    const res = await fetch("/api/billing-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error("Save failed");
    const data = (await res.json()) as BillingProfile;
    setProfile(data);
    setApiCache(CACHE_KEY, data);
    return data;
  };

  return { profile, loading, refresh, save };
}
