import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { TenantDatabaseService } from "./tenant-database.service";

export const SEQUENCE_KEYS = {
  invoiceNo: "invoice_no",
  workTicketSerial: "work_ticket_serial",
  consolidatedInvoiceSerial: "consolidated_invoice_serial",
} as const;

const FLOOR: Record<string, number> = {
  [SEQUENCE_KEYS.invoiceNo]: 17206,
  [SEQUENCE_KEYS.workTicketSerial]: 1189100,
  [SEQUENCE_KEYS.consolidatedInvoiceSerial]: 1000,
};

@Injectable()
export class TenantSequenceService {
  constructor(private readonly db: TenantDatabaseService) {}

  /** Allocate the next serial value atomically (transaction + advisory lock). */
  async next(key: string): Promise<number> {
    const floor = FLOOR[key] ?? 1;
    return this.db.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [key]);
      await client.query(
        `INSERT INTO tenant_sequences (key, next_value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, floor],
      );
      const row = await client.query<{ next_value: string }>(
        `UPDATE tenant_sequences
         SET next_value = next_value + 1, updated_at = NOW()
         WHERE key = $1
         RETURNING next_value - 1 AS next_value`,
        [key],
      );
      const val = parseInt(row.rows[0]?.next_value ?? String(floor), 10);
      return Math.max(val, floor);
    });
  }

  /** Allocate N sequential values inside an existing transaction (for bulk import). */
  async nextN(client: PoolClient, key: string, count: number): Promise<number> {
    if (count <= 0) return 0;
    const floor = FLOOR[key] ?? 1;
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [key]);
    await client.query(
      `INSERT INTO tenant_sequences (key, next_value) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, floor],
    );
    const row = await client.query<{ start: string }>(
      `UPDATE tenant_sequences
       SET next_value = next_value + $2, updated_at = NOW()
       WHERE key = $1
       RETURNING next_value - $2 AS start`,
      [key, count],
    );
    const start = parseInt(row.rows[0]?.start ?? String(floor), 10);
    return Math.max(start, floor);
  }
}
