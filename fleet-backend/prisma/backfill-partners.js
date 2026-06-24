/**
 * One-time / startup backfill: create Partner rows for legacy tenants,
 * link client users, and scope tenant-schema data by partner_id.
 */
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");

const prisma = new PrismaClient();

function slugify(name) {
  return String(name || "partner")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "partner";
}

async function readBillingClient(pool, schema) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    const res = await client.query(`SELECT client FROM billing_profiles ORDER BY created_at DESC LIMIT 1`);
    return res.rows[0]?.client;
  } catch {
    return null;
  } finally {
    client.release();
  }
}

async function backfillTenantSchema(pool, schema, partnerId) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    for (const table of ["invoices", "work_tickets", "consolidated_invoices", "workflow_notifications", "billing_profiles"]) {
      await client.query(`UPDATE ${table} SET partner_id = $1::uuid WHERE partner_id IS NULL`, [partnerId]);
    }
  } finally {
    client.release();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("DATABASE_URL not set — skipping partner backfill");
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const tenants = await prisma.tenant.findMany({ where: { active: true } });

  for (const tenant of tenants) {
    let partner = await prisma.partner.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" } });
    if (!partner) {
      const clientParty = await readBillingClient(pool, tenant.schema);
      const name = clientParty?.name ?? "Partner";
      partner = await prisma.partner.create({
        data: {
          tenantId: tenant.id,
          slug: slugify(name),
          name: String(name),
          legalName: clientParty?.legalName ?? String(name),
          email: clientParty?.email ?? null,
        },
      });
      console.log(`Created partner ${partner.slug} for ${tenant.slug}`);
    }

    await prisma.user.updateMany({
      where: { tenantId: tenant.id, role: "client", partnerId: null },
      data: { partnerId: partner.id },
    });

    await backfillTenantSchema(pool, tenant.schema, partner.id);
    console.log(`Backfilled ${tenant.slug}`);
  }

  await pool.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
