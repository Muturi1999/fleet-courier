import { Global, Module } from "@nestjs/common";
import { TenantContextService } from "./tenant-context.service";
import { TenantDatabaseService } from "../database/tenant-database.service";

@Global()
@Module({
  providers: [TenantContextService, TenantDatabaseService],
  exports: [TenantContextService, TenantDatabaseService],
})
export class TenantContextModule {}
