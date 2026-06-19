import { Inject, Injectable } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import * as fs from "fs";
import * as path from "path";
import { PG_POOL } from "../common/database/postgres-pool.provider";
import { PatchRunResult, runTenantPatches } from "../common/database/tenant-patch.runner";

export function tenantSchemaName(slug: string): string {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

@Injectable()
export class TenantProvisioningService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async provisionSchema(schema: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      const sqlPath = path.join(process.cwd(), "prisma", "tenant-template.sql");
      const sql = fs.readFileSync(sqlPath, "utf-8");
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(sql);
      await runTenantPatches(client, schema);
    } finally {
      client.release();
    }
  }

  async applyPatches(schema: string): Promise<PatchRunResult> {
    const client = await this.pool.connect();
    try {
      return await runTenantPatches(client, schema);
    } finally {
      client.release();
    }
  }

  async dropSchema(schema: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      client.release();
    }
  }

  async migrateSchemaWithClient(client: PoolClient, schema: string): Promise<PatchRunResult> {
    return runTenantPatches(client, schema);
  }
}
