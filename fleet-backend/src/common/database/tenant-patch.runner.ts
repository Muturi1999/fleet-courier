import * as fs from "fs";
import * as path from "path";
import type { PoolClient } from "pg";

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS _schema_patches (
  patch_name VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export type PatchRunResult = {
  schema: string;
  applied: string[];
  skipped: string[];
};

function patchesDir(): string {
  return path.join(process.cwd(), "prisma", "tenant-patches");
}

export function listTenantPatchFiles(): string[] {
  const dir = patchesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
}

export async function ensurePatchLedger(client: PoolClient, schema: string): Promise<void> {
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(LEDGER_DDL);
}

export async function runTenantPatches(
  client: PoolClient,
  schema: string,
  options?: { forceAll?: boolean },
): Promise<PatchRunResult> {
  const files = listTenantPatchFiles();
  const applied: string[] = [];
  const skipped: string[] = [];

  await ensurePatchLedger(client, schema);

  const ledger = await client.query<{ patch_name: string }>(
    `SELECT patch_name FROM _schema_patches`,
  );
  const done = new Set(ledger.rows.map((r) => r.patch_name));

  for (const file of files) {
    if (!options?.forceAll && done.has(file)) {
      skipped.push(file);
      continue;
    }
    const patch = fs.readFileSync(path.join(patchesDir(), file), "utf-8");
    await client.query(`SET search_path TO "${schema}"`);
    await client.query("BEGIN");
    try {
      await client.query(patch);
      await client.query(
        `INSERT INTO _schema_patches (patch_name) VALUES ($1)
         ON CONFLICT (patch_name) DO NOTHING`,
        [file],
      );
      await client.query("COMMIT");
      applied.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  return { schema, applied, skipped };
}
