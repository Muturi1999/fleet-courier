import type { PaginatedMeta, PaginatedResult } from "../dto/pagination.dto";
import { paginateOffset } from "../dto/pagination.dto";
import { TenantDatabaseService } from "./tenant-database.service";

export async function queryPaginated<T extends Record<string, unknown>>(
  db: TenantDatabaseService,
  options: {
    table: string;
    where?: string;
    params?: unknown[];
    orderBy?: string;
    page: number;
    limit: number;
  },
): Promise<PaginatedResult<T>> {
  const { offset, limit } = paginateOffset(options.page, options.limit);
  const where = options.where ?? "";
  const params = options.params ?? [];
  const orderBy = options.orderBy ?? "created_at DESC";

  const countRow = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${options.table} ${where}`,
    params,
  );
  const total = parseInt(countRow?.count ?? "0", 10);

  const data = await db.queryAll<T>(
    `SELECT * FROM ${options.table} ${where} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const meta: PaginatedMeta = {
    page: Math.max(1, options.page),
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };

  return { data, meta };
}
