import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

export function tenantSchemaName(slug: string): string {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

@Injectable()
export class TenantProvisioningService {
  private pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow("DATABASE_URL") });
  }

  async provisionSchema(schema: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      const sqlPath = path.join(process.cwd(), "prisma", "tenant-template.sql");
      const sql = fs.readFileSync(sqlPath, "utf-8");
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(sql);
      await this.runPatches(client, schema);
    } finally {
      client.release();
    }
  }

  async applyPatches(schema: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await this.runPatches(client, schema);
    } finally {
      client.release();
    }
  }

  private async runPatches(client: import("pg").PoolClient, schema: string) {
    const patchesDir = path.join(process.cwd(), "prisma", "tenant-patches");
    if (!fs.existsSync(patchesDir)) return;
    const files = fs.readdirSync(patchesDir).filter((f) => f.endsWith(".sql")).sort();
    await client.query(`SET search_path TO "${schema}"`);
    for (const file of files) {
      const patch = fs.readFileSync(path.join(patchesDir, file), "utf-8");
      await client.query(patch);
    }
  }
}
