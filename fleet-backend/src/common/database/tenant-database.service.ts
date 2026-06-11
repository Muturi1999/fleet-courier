import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow("DATABASE_URL") });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const schema = TenantContextStorage.getOrThrow().schema;
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}", public`);
      return await fn(client);
    } finally {
      client.release();
    }
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
