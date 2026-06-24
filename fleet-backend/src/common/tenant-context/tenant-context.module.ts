import { Global, Module, OnModuleDestroy, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL, postgresPoolProvider } from "../database/postgres-pool.provider";
import { TenantContextService } from "./tenant-context.service";
import { TenantDatabaseService } from "../database/tenant-database.service";
import { TenantSequenceService } from "../database/tenant-sequence.service";

@Global()
@Module({
  providers: [postgresPoolProvider, TenantContextService, TenantDatabaseService, TenantSequenceService],
  exports: [PG_POOL, TenantContextService, TenantDatabaseService, TenantSequenceService],
})
export class TenantContextModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
