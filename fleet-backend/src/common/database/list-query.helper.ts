import type { ListQueryDto } from "../dto/list-query.dto";

export const DEFAULT_LIST_PAGE = 1;
export const DEFAULT_LIST_LIMIT = 50;

export function wantsFullList(query: ListQueryDto): boolean {
  return query.all === "true";
}

export function resolvePageLimit(query: ListQueryDto): { page: number; limit: number } {
  return {
    page: query.page ?? DEFAULT_LIST_PAGE,
    limit: query.limit ?? DEFAULT_LIST_LIMIT,
  };
}

export function addSearchClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  columns: string[],
  search?: string,
): number {
  if (!search?.trim()) return idx;
  const term = `%${search.trim().toLowerCase()}%`;
  const parts = columns.map((col) => `LOWER(${col}) LIKE $${idx}`);
  clauses.push(`(${parts.join(" OR ")})`);
  params.push(term);
  return idx + 1;
}

export function addDateClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  primaryColumn: string,
  date?: string,
): number {
  if (!date?.trim()) return idx;
  clauses.push(
    `(${primaryColumn}::date = $${idx}::date OR created_at::date = $${idx}::date)`,
  );
  params.push(date.trim());
  return idx + 1;
}

export function addDestinationClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  column: string,
  destination?: string,
): number {
  if (!destination?.trim()) return idx;
  clauses.push(`LOWER(${column}) LIKE $${idx}`);
  params.push(`%${destination.trim().toLowerCase()}%`);
  return idx + 1;
}

export function addStatusClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  status?: string,
): number {
  if (!status?.trim() || status === "all") return idx;
  clauses.push(`status = $${idx}`);
  params.push(status);
  return idx + 1;
}

/** Client portal tab → SQL status filter */
export function addClientTabClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  tab?: string,
): number {
  if (!tab || tab === "all") return idx;
  if (tab === "awaiting") {
    clauses.push(`status IN ($${idx}, $${idx + 1})`);
    params.push("sent", "pending");
    return idx + 2;
  }
  if (tab === "approved") {
    clauses.push(`status = $${idx}`);
    params.push("approved");
    return idx + 1;
  }
  if (tab === "returned") {
    clauses.push(`status = $${idx}`);
    params.push("rejected");
    return idx + 1;
  }
  return idx;
}

export function wantsKeyset(query: ListQueryDto): boolean {
  return query.useKeyset === "true" || Boolean(query.cursor?.trim());
}

export function addRunTypeClause(
  clauses: string[],
  params: unknown[],
  idx: number,
  runType?: string,
): number {
  if (!runType?.trim()) return idx;
  clauses.push(`run_type = $${idx}`);
  params.push(runType);
  return idx + 1;
}
