import { Module } from "@nestjs/common";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { PlatformKeyGuard } from "../common/guards/platform-key.guard";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantProvisioningService, PlatformKeyGuard, ManagedCredentialService],
  exports: [TenantProvisioningService, TenantsService],
})
export class TenantsModule {}
