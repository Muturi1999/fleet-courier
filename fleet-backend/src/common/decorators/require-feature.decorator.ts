import { SetMetadata } from "@nestjs/common";
import type { TenantFeatureKey } from "../../tenants/tenant-capabilities";

export const REQUIRE_FEATURE_KEY = "require_feature";

export const RequireFeature = (feature: TenantFeatureKey) => SetMetadata(REQUIRE_FEATURE_KEY, feature);
