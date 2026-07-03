import { TenantProfile } from "@prisma/client";

/** Feature flags resolved per tenant — drives nav, routes, and API guards. */
export type TenantFeatureKey =
  | "schedule"
  | "expenses"
  | "billing_profile"
  | "workflow_invoices"
  | "workflow_work_tickets"
  | "workflow_consolidated"
  | "vehicles"
  | "rates"
  | "routes"
  | "local_deliveries"
  | "safari"
  | "reports"
  | "drivers"
  | "orders"
  | "dispatch"
  | "gps_tracking"
  | "maintenance"
  | "fleet_extended"
  | "driver_portal"
  | "customer_shipments"
  | "ai_ops";

export type TenantFeatures = Record<TenantFeatureKey, boolean>;

export type TenantCapabilities = {
  slug: string;
  name: string;
  profile: TenantProfile;
  features: TenantFeatures;
  pilot: boolean;
};

const CONTRACT_FLEET_FEATURES: TenantFeatures = {
  schedule: true,
  expenses: true,
  billing_profile: true,
  workflow_invoices: true,
  workflow_work_tickets: true,
  workflow_consolidated: true,
  vehicles: true,
  rates: true,
  routes: true,
  local_deliveries: true,
  safari: true,
  reports: true,
  drivers: false,
  orders: false,
  dispatch: false,
  gps_tracking: false,
  maintenance: false,
  fleet_extended: false,
  driver_portal: false,
  customer_shipments: false,
  ai_ops: false,
};

const OPERATIONS_PILOT_FEATURES: TenantFeatures = {
  ...CONTRACT_FLEET_FEATURES,
  drivers: true,
  orders: true,
  dispatch: true,
  gps_tracking: true,
  maintenance: true,
  fleet_extended: true,
  driver_portal: true,
  customer_shipments: true,
  ai_ops: true,
};

export function profileDefaultFeatures(profile: TenantProfile): TenantFeatures {
  if (profile === TenantProfile.operations_pilot) return { ...OPERATIONS_PILOT_FEATURES };
  return { ...CONTRACT_FLEET_FEATURES };
}

export function resolveTenantFeatures(
  profile: TenantProfile,
  overrides?: Record<string, unknown> | null,
): TenantFeatures {
  const base = profileDefaultFeatures(profile);
  if (!overrides || typeof overrides !== "object") return base;

  for (const key of Object.keys(base) as TenantFeatureKey[]) {
    const val = overrides[key];
    if (typeof val === "boolean") base[key] = val;
  }
  return base;
}

export function buildTenantCapabilities(input: {
  slug: string;
  name: string;
  profile: TenantProfile;
  features?: Record<string, unknown> | null;
}): TenantCapabilities {
  return {
    slug: input.slug,
    name: input.name,
    profile: input.profile,
    features: resolveTenantFeatures(input.profile, input.features),
    pilot: input.profile === TenantProfile.operations_pilot,
  };
}

export function tenantHasFeature(capabilities: TenantCapabilities, feature: TenantFeatureKey): boolean {
  return Boolean(capabilities.features[feature]);
}
