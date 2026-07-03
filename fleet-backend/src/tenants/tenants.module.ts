import { Module } from "@nestjs/common";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { FeatureGuard } from "../common/guards/feature.guard";
import { PlatformKeyGuard } from "../common/guards/platform-key.guard";
import { TenantCapabilitiesService } from "./tenant-capabilities.service";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  controllers: [TenantsController],
  providers: [
    TenantsService,
    TenantProvisioningService,
    TenantCapabilitiesService,
    FeatureGuard,
    PlatformKeyGuard,
    ManagedCredentialService,
  ],
  exports: [TenantProvisioningService, TenantsService, TenantCapabilitiesService, FeatureGuard],
})
export class TenantsModule {}
