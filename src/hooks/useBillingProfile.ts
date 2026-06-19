"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingProfile } from "@/lib/types";

export function useBillingProfile() {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing-profile", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
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
    return data;
  };

  return { profile, loading, refresh, save };
}
