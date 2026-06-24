/**
 * Upsert Road Network fleet vehicles from RNTL FLEET LIST PDF.
 * Safe to re-run — updates cls on conflict, inserts new plates.
 */
import { Pool } from "pg";
import { RNTL_FLEET_LIST } from "./rntl-fleet-list";

const slug = process.env.DEFAULT_TENANT_SLUG ?? "g4s-kenya";
const schema = `tenant_${slug.replace(/-/g, "_")}`;
const client = process.env.FLEET_VEHICLE_CLIENT ?? "G4S Kenya";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(`SET search_path TO "${schema}"`);

  let inserted = 0;
  let updated = 0;

  for (const v of RNTL_FLEET_LIST) {
    const res = await pool.query(
      `INSERT INTO vehicles (plate, cls, run_type, runs, days, total, dests, status, client)
       VALUES ($1, $2, 'Nairobi', 0, 0, 0, '[]'::jsonb, 'active', $3)
       ON CONFLICT (plate) DO UPDATE SET
         cls = EXCLUDED.cls,
         status = 'active',
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [v.plate, v.cls, client],
    );
    if (res.rows[0]?.inserted) inserted++;
    else updated++;
  }

  const count = await pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM vehicles`);
  console.log(`RNTL fleet seed complete: ${inserted} inserted, ${updated} updated, ${count.rows[0]?.c} total vehicles`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
