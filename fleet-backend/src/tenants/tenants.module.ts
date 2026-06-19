import { Module } from "@nestjs/common";
import { PlatformKeyGuard } from "../common/guards/platform-key.guard";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantProvisioningService, PlatformKeyGuard],
  exports: [TenantProvisioningService, TenantsService],
})
export class TenantsModule {}
