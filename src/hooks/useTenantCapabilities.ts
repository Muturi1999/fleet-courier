"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fallbackCapabilities,
  parseCapabilitiesResponse,
  type TenantCapabilities,
  type TenantFeatureKey,
} from "@/lib/tenant-capabilities";

export function useTenantCapabilities() {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants/me/capabilities", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const parsed = parseCapabilitiesResponse(await res.json());
        setCapabilities(parsed ?? fallbackCapabilities(user?.tenantSlug));
      } else {
        setCapabilities(fallbackCapabilities(user?.tenantSlug));
      }
    } catch {
      setCapabilities(fallbackCapabilities(user?.tenantSlug));
    } finally {
      setLoading(false);
    }
  }, [user?.tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const featureEnabled = useCallback(
    (feature: TenantFeatureKey) => Boolean(capabilities?.features[feature]),
    [capabilities],
  );

  return { capabilities, loading, refresh, featureEnabled };
}
