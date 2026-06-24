import type { KeysetMeta, PaginatedResult } from "../dto/pagination.dto";
import { TenantDatabaseService } from "./tenant-database.service";

export type KeysetCursor = { t: string; i: string };

export function encodeKeysetCursor(createdAt: string | Date, id: string): string {
  const t = typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  return Buffer.from(JSON.stringify({ t, i: id }), "utf8").toString("base64url");
}

export function decodeKeysetCursor(raw: string): KeysetCursor | null {
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as KeysetCursor;
    if (json?.t && json?.i) return { t: String(json.t), i: String(json.i) };
  } catch {
    /* invalid cursor */
  }
  return null;
}

type KeysetRow = Record<string, unknown> & { id: string; created_at?: string | Date };

export async function queryKeysetPaginated<T extends KeysetRow>(
  db: TenantDatabaseService,
  options: {
    table: string;
    where?: string;
    params?: unknown[];
    limit: number;
    cursor?: string;
    direction?: "next" | "prev";
    timeColumn?: string;
  },
): Promise<PaginatedResult<T>> {
  const limit = Math.min(100, Math.max(1, options.limit));
  const timeCol = options.timeColumn ?? "created_at";
  const params = [...(options.params ?? [])];
  const direction = options.direction === "prev" ? "prev" : "next";
  const decoded = options.cursor ? decodeKeysetCursor(options.cursor) : null;

  const baseWhere = (options.where ?? "").trim();
  let whereSql = baseWhere;
  if (decoded) {
    const tIdx = params.length + 1;
    const iIdx = params.length + 2;
    params.push(decoded.t, decoded.i);
    const cmp =
      direction === "next"
        ? `(${timeCol}, id) < ($${tIdx}::timestamptz, $${iIdx}::uuid)`
        : `(${timeCol}, id) > ($${tIdx}::timestamptz, $${iIdx}::uuid)`;
    whereSql = baseWhere ? `${baseWhere} AND ${cmp}` : `WHERE ${cmp}`;
  } else if (baseWhere && !baseWhere.toUpperCase().startsWith("WHERE")) {
    whereSql = `WHERE ${baseWhere}`;
  }

  const orderBy =
    direction === "prev" ? `${timeCol} ASC, id ASC` : `${timeCol} DESC, id DESC`;

  const rows = await db.queryAll<T>(
    `SELECT * FROM ${options.table} ${whereSql} ORDER BY ${orderBy} LIMIT $${params.length + 1}`,
    [...params, limit + 1],
  );

  let data = rows;
  let hasMore = rows.length > limit;
  if (hasMore) data = rows.slice(0, limit);
  if (direction === "prev") data = [...data].reverse();

  const first = data[0];
  const last = data[data.length - 1];
  const meta: KeysetMeta = {
    mode: "keyset",
    limit,
    hasMore,
    nextCursor: last ? encodeKeysetCursor(String(last[timeCol] ?? last.created_at), last.id) : null,
    prevCursor: first ? encodeKeysetCursor(String(first[timeCol] ?? first.created_at), first.id) : null,
    page: 0,
    total: 0,
    totalPages: 0,
  };

  return { data, meta };
}
