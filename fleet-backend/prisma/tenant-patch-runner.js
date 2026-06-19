const fs = require("fs");
const path = require("path");

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS _schema_patches (
  patch_name VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function patchesDir() {
  return path.join(process.cwd(), "prisma", "tenant-patches");
}

function listTenantPatchFiles() {
  const dir = patchesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
}

async function ensurePatchLedger(client, schema) {
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(LEDGER_DDL);
}

async function runTenantPatches(client, schema, options = {}) {
  const files = listTenantPatchFiles();
  const applied = [];
  const skipped = [];

  await ensurePatchLedger(client, schema);

  const ledger = await client.query(`SELECT patch_name FROM _schema_patches`);
  const done = new Set(ledger.rows.map((r) => r.patch_name));

  for (const file of files) {
    if (!options.forceAll && done.has(file)) {
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

module.exports = { runTenantPatches, listTenantPatchFiles };
