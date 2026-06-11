import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function schemaName(slug: string) {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

async function runTenantPatches(pool: Pool, schema: string) {
  const patchesDir = path.join(__dirname, "tenant-patches");
  if (!fs.existsSync(patchesDir)) return;
  const files = fs.readdirSync(patchesDir).filter((f) => f.endsWith(".sql")).sort();
  await pool.query(`SET search_path TO "${schema}"`);
  for (const file of files) {
    await pool.query(fs.readFileSync(path.join(patchesDir, file), "utf-8"));
  }
  await pool.query(`SET search_path TO public`);
}

async function provisionTenantSchema(pool: Pool, schema: string) {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  const sqlPath = path.join(__dirname, "tenant-template.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(`SET search_path TO "${schema}"`);
  await pool.query(sql);
  await runTenantPatches(pool, schema);
}

async function seedTenantData(pool: Pool, schema: string) {
  await pool.query(`SET search_path TO "${schema}"`);

  const drivers = ["Hillary", "Samuel", "James", "Peter", "Joseph"];
  for (const name of drivers) {
    await pool.query(
      `INSERT INTO drivers (name, active) SELECT $1, TRUE WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = $1)`,
      [name],
    );
  }

  const wtCount = await pool.query(`SELECT COUNT(*)::int AS c FROM work_tickets`);
  if ((wtCount.rows[0]?.c ?? 0) === 0) {
    const legs = JSON.stringify([
      {
        id: "leg-1",
        details: "Base — Total",
        openingMileage: 434488,
        timeOut: "0822",
        officerAuthorising: "",
        fuelDrawn: "20",
        timeIn: "",
        closingMileage: 434635,
        serviceType: "S/S",
      },
    ]);
    await pool.query(
      `INSERT INTO work_tickets (
        serial_no, branch, trip_date, plate, make, driver_name, route,
        rate_type, agreed_rate, legs, official_km, net, vat, total, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        "1189105",
        "Embakasi",
        "2026-01-05",
        "KAV 038M",
        "Mitsubishi",
        "Hillary",
        "Nairobi local collection",
        "fixed",
        8500,
        legs,
        147,
        8500,
        1360,
        9860,
        "sent",
      ],
    );
    console.log("Seeded sample work ticket 1189105");
  }

  await pool.query(`SET search_path TO public`);
}

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "g4s-kenya";
  const schema = schemaName(slug);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const pool = new Pool({ connectionString: databaseUrl });

  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    await provisionTenantSchema(pool, schema);
    tenant = await prisma.tenant.create({
      data: {
        slug,
        name: "G4S Kenya",
        schema,
        contract: "G4S Courier Services — March 2026",
      },
    });
    console.log(`Created tenant: ${tenant.name} (${schema})`);
  } else {
    await runTenantPatches(pool, schema);
  }

  await seedTenantData(pool, schema);

  const users = [
    { username: "admin", role: UserRole.admin, displayName: "Fleet Admin", password: "admin123" },
    { username: "client", role: UserRole.client, displayName: "G4S Client", password: "client123" },
  ];

  for (const u of users) {
    const exists = await prisma.user.findFirst({
      where: { tenantId: tenant.id, username: u.username },
    });
    if (!exists) {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          passwordHash: await bcrypt.hash(u.password, 10),
        },
      });
      console.log(`Seeded user: ${u.username} / ${u.password}`);
    }
  }

  await pool.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
