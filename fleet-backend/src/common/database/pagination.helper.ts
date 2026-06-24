import type { PaginatedMeta, PaginatedResult } from "../dto/pagination.dto";
import { paginateOffset } from "../dto/pagination.dto";
import { ListQueryDto } from "../dto/list-query.dto";
import { queryKeysetPaginated } from "./keyset-pagination.helper";
import { resolvePageLimit, wantsKeyset } from "./list-query.helper";
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
    mode: "offset",
  };

  return { data, meta };
}

/** Route to keyset or offset pagination based on query flags. */
type KeysetRow = Record<string, unknown> & { id: string; created_at?: string | Date };

export async function queryList<T extends Record<string, unknown>>(
  db: TenantDatabaseService,
  query: ListQueryDto,
  options: {
    table: string;
    where?: string;
    params?: unknown[];
    orderBy?: string;
    timeColumn?: string;
  },
): Promise<PaginatedResult<T>> {
  const { limit } = resolvePageLimit(query);

  if (wantsKeyset(query)) {
    return queryKeysetPaginated<T & KeysetRow>(db, {
      table: options.table,
      where: options.where,
      params: options.params,
      limit,
      cursor: query.cursor,
      direction: query.direction === "prev" ? "prev" : "next",
      timeColumn: options.timeColumn,
    });
  }

  const { page } = resolvePageLimit(query);
  return queryPaginated<T>(db, {
    table: options.table,
    where: options.where,
    params: options.params,
    page,
    limit,
    orderBy: options.orderBy,
  });
}
