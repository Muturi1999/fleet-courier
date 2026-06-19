import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolConfig } from "pg";

export const PG_POOL = Symbol("PG_POOL");

export function createPostgresPool(config: ConfigService): Pool {
  const poolConfig: PoolConfig = {
    connectionString: config.getOrThrow<string>("DATABASE_URL"),
    max: config.get<number>("PG_POOL_MAX", 20),
    idleTimeoutMillis: config.get<number>("PG_POOL_IDLE_MS", 30_000),
    connectionTimeoutMillis: config.get<number>("PG_POOL_CONNECT_MS", 5_000),
    allowExitOnIdle: false,
  };
  return new Pool(poolConfig);
}

export const postgresPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: createPostgresPool,
};
