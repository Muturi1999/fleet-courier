"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import type { TenantFeatureKey } from "@/lib/tenant-capabilities";

export function FeatureGate({
  feature,
  children,
}: {
  feature: TenantFeatureKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { capabilities, loading, featureEnabled } = useTenantCapabilities();

  useEffect(() => {
    if (loading || !capabilities) return;
    if (!featureEnabled(feature)) router.replace("/admin");
  }, [capabilities, feature, featureEnabled, loading, router]);

  if (loading || !capabilities || !featureEnabled(feature)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-fleet-gray-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
