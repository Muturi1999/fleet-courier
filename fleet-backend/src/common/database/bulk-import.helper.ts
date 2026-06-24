import { TenantDatabaseService } from "./tenant-database.service";

/** Multi-row INSERT in chunks — returns inserted rows when `returning` is set. */
export async function bulkInsert<T extends Record<string, unknown>>(
  db: TenantDatabaseService,
  options: {
    table: string;
    columns: string[];
    rows: unknown[][];
    chunkSize?: number;
    returning?: boolean;
  },
): Promise<T[]> {
  const chunkSize = options.chunkSize ?? 500;
  const inserted: T[] = [];
  const cols = options.columns.join(", ");

  for (let offset = 0; offset < options.rows.length; offset += chunkSize) {
    const chunk = options.rows.slice(offset, offset + chunkSize);
    if (!chunk.length) continue;

    const values: unknown[] = [];
    const tuples: string[] = [];
    let param = 1;

    for (const row of chunk) {
      const ph = row.map(() => `$${param++}`);
      tuples.push(`(${ph.join(", ")})`);
      values.push(...row);
    }

    const returning = options.returning !== false ? " RETURNING *" : "";
    const sql = `INSERT INTO ${options.table} (${cols}) VALUES ${tuples.join(", ")}${returning}`;
    const result = await db.queryAll<T>(sql, values);
    inserted.push(...result);
  }

  return inserted;
}
