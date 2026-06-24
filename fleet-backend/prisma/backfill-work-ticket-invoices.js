/**
 * Create per-trip invoices for work tickets that do not have one yet.
 * Default: tickets created today. Pass BACKFILL_ALL=true for all tenants/history.
 */
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

function formatPeriod(tripDate) {
  const d = new Date(tripDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

async function resolveCls(client, plate) {
  const res = await client.query(`SELECT cls FROM vehicles WHERE plate = $1 LIMIT 1`, [plate]);
  return res.rows[0]?.cls ?? "7T";
}

async function backfillSchema(pool, schema, onlyToday) {
  const client = await pool.connect();
  let created = 0;
  try {
    await client.query(`SET search_path TO "${schema}"`);
    const dateFilter = onlyToday ? `AND wt.created_at::date = CURRENT_DATE` : "";
    const missing = await client.query(`
      SELECT wt.*
      FROM work_tickets wt
      LEFT JOIN invoices i ON i.work_ticket_id = wt.id
      WHERE i.id IS NULL ${dateFilter}
      ORDER BY wt.created_at ASC
    `);

    for (const wt of missing.rows) {
      const cls = await resolveCls(client, wt.plate);
      const tripDate = wt.trip_date instanceof Date ? wt.trip_date.toISOString().slice(0, 10) : String(wt.trip_date).slice(0, 10);
      await client.query(
        `INSERT INTO invoices (
          id, invoice_no, plate, cls, route, days, net, vat, total, status,
          service_date, period, delivery_note_no, work_ticket_id, partner_id
        ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,'draft',$9,$10,$11,$12,$13)`,
        [
          randomUUID(),
          `WT-${wt.serial_no}`,
          wt.plate,
          cls,
          wt.route,
          wt.net,
          wt.vat,
          wt.total,
          tripDate,
          formatPeriod(tripDate),
          wt.serial_no,
          wt.id,
          wt.partner_id ?? null,
        ],
      );
      created++;
      console.log(`  + invoice WT-${wt.serial_no} (${wt.plate})`);
    }
  } finally {
    client.release();
  }
  return created;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("DATABASE_URL not set — skipping work-ticket invoice backfill");
    return;
  }

  const onlyToday = process.env.BACKFILL_ALL !== "true";
  const pool = new Pool({ connectionString: databaseUrl });
  const tenants = await prisma.tenant.findMany({ where: { active: true } });

  for (const tenant of tenants) {
    console.log(`Backfilling ${tenant.slug} (${tenant.schema})...`);
    const n = await backfillSchema(pool, tenant.schema, onlyToday);
    console.log(`  ${n} invoice(s) created`);
  }

  await pool.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
