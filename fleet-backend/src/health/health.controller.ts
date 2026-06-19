import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Pool } from "pg";
import { PG_POOL } from "../common/database/postgres-pool.provider";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    const tenantCount = await this.prisma.tenant.count({ where: { active: true } });
    return {
      status: "ok",
      service: "fleet-backend",
      timestamp: new Date().toISOString(),
      multitenancy: {
        activeWorkspaces: tenantCount,
        pgPool: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        },
      },
    };
  }
}
