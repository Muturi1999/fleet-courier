import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { PG_POOL } from "./postgres-pool.provider";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    // Pool lifecycle owned by global module — do not end here when shared
  }

  getPool(): Pool {
    return this.pool;
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const schema = TenantContextStorage.getOrThrow().schema;
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      return await fn(client);
    } finally {
      client.release();
    }
  }

  /** Run multiple statements atomically within the current tenant schema. */
  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.withClient((client) => client.query<T>(sql, params));
  }

  async queryOne<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const res = await this.query<T>(sql, params);
    return res.rows[0] ?? null;
  }

  async queryAll<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const res = await this.query<T>(sql, params);
    return res.rows;
  }
}
