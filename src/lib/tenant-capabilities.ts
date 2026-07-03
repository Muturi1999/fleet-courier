export type TenantProfile = "contract_fleet" | "operations_pilot";

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

const CONTRACT_FLEET: TenantFeatures = {
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

/** Offline fallback when capabilities API is unavailable. */
export function fallbackCapabilities(tenantSlug?: string | null): TenantCapabilities {
  const pilot = tenantSlug === "horizon-logistics-ltd";
  return {
    slug: tenantSlug ?? "g4s-kenya",
    name: pilot ? "Horizon Logistics Ltd" : "Road Network Transporters Limited",
    profile: pilot ? "operations_pilot" : "contract_fleet",
    features: pilot
      ? { ...CONTRACT_FLEET, drivers: true, orders: true, dispatch: true, gps_tracking: true, maintenance: true, fleet_extended: true, driver_portal: true, customer_shipments: true, ai_ops: true }
      : { ...CONTRACT_FLEET },
    pilot,
  };
}

export function hasFeature(capabilities: TenantCapabilities | null, feature: TenantFeatureKey): boolean {
  return Boolean(capabilities?.features[feature]);
}

/** Backend JSON uses camelCase (global interceptor); nav uses snake_case keys. */
const CAMEL_FEATURE_KEYS: Record<string, TenantFeatureKey> = {
  billingProfile: "billing_profile",
  workflowInvoices: "workflow_invoices",
  workflowWorkTickets: "workflow_work_tickets",
  workflowConsolidated: "workflow_consolidated",
  localDeliveries: "local_deliveries",
  gpsTracking: "gps_tracking",
  fleetExtended: "fleet_extended",
  driverPortal: "driver_portal",
  customerShipments: "customer_shipments",
  aiOps: "ai_ops",
};

export function parseCapabilitiesResponse(raw: unknown): TenantCapabilities | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const base = fallbackCapabilities(typeof r.slug === "string" ? r.slug : undefined);
  const featuresIn =
    r.features && typeof r.features === "object" ? (r.features as Record<string, unknown>) : {};

  const features = { ...base.features };
  for (const [key, val] of Object.entries(featuresIn)) {
    if (typeof val !== "boolean") continue;
    const snake = (CAMEL_FEATURE_KEYS[key] ?? key) as TenantFeatureKey;
    if (snake in features) features[snake] = val;
  }

  return {
    slug: typeof r.slug === "string" ? r.slug : base.slug,
    name: typeof r.name === "string" ? r.name : base.name,
    profile: r.profile === "operations_pilot" ? "operations_pilot" : "contract_fleet",
    features,
    pilot: Boolean(r.pilot),
  };
}
