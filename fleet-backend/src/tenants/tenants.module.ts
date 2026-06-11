import { Module } from "@nestjs/common";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantProvisioningService],
  exports: [TenantProvisioningService],
})
export class TenantsModule {}
