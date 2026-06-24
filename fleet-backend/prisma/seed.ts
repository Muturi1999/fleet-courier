import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { encryptPassword } = require("./credential-vault.js");

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "partner";
}

async function storeCredential(userId: string, password: string) {
  await prisma.managedCredential.upsert({
    where: { userId },
    create: { userId, passwordEncrypted: encryptPassword(password) },
    update: { passwordEncrypted: encryptPassword(password) },
  });
}

const prisma = new PrismaClient();

function schemaName(slug: string) {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

async function applyTenantPatches(pool: Pool, schema: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { runTenantPatches } = require("./tenant-patch-runner.js");
  const client = await pool.connect();
  try {
    await runTenantPatches(client, schema);
  } finally {
    client.release();
  }
}

async function provisionTenantSchema(pool: Pool, schema: string) {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  const sqlPath = path.join(__dirname, "tenant-template.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(`SET search_path TO "${schema}"`);
  await pool.query(sql);
  await applyTenantPatches(pool, schema);
}

async function seedTenantData(pool: Pool, schema: string) {
  await pool.query(`SET search_path TO "${schema}"`);

  const drivers = ["Hillary", "Samuel", "James", "Peter", "Joseph"];
  for (const name of drivers) {
    await pool.query(
      `INSERT INTO drivers (name, active) SELECT $1::varchar, TRUE WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = $1::varchar)`,
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

  const billingCount = await pool.query(`SELECT COUNT(*)::int AS c FROM billing_profiles`);
  if ((billingCount.rows[0]?.c ?? 0) === 0) {
    await pool.query(
      `INSERT INTO billing_profiles (supplier, client) VALUES ($1::jsonb, $2::jsonb)`,
      [
        JSON.stringify({
          name: "Road network transporters",
          address: "P.O. Box 4622-00200, Nairobi.",
          phone: "Tel: 020 2011330",
          vatNo: "0161681P",
          pin: "P051470271Y",
        }),
        JSON.stringify({
          name: "G4S COURIER",
          legalName: "G4S Courier Services Kenya Ltd",
          address: "G4S House, Waiyaki Way",
          city: "Nairobi, Kenya",
          pin: "P051987654G",
          contact: "Accounts Payable",
          email: "accounts@g4s.co.ke",
          contractRef: "G4S-RNT-2026-001",
        }),
      ],
    );
    console.log("Seeded billing profile");
  }

  const expenseCount = await pool.query(`SELECT COUNT(*)::int AS c FROM expenses`);
  if ((expenseCount.rows[0]?.c ?? 0) === 0) {
    await pool.query(
      `INSERT INTO expenses (expense_date, category, description, amount, vehicle_plate, month, status) VALUES
       ('2026-03-05','fuel','Fleet diesel — Nairobi depot',485000,NULL,'Mar 2026','paid'),
       ('2026-03-12','maintenance','KBH 667W — brake service',42000,'KBH 667W','Mar 2026','approved'),
       ('2026-03-18','insurance','Commercial fleet cover — Q1',320000,NULL,'Mar 2026','paid'),
       ('2026-03-22','salaries','Driver wages — March',890000,NULL,'Mar 2026','recorded')`,
    );
    console.log("Seeded sample expenses");
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
        name: "Road Network Transporters",
        schema,
        contract: "G4S Courier Services — March 2026",
      },
    });
    console.log(`Created tenant: ${tenant.name} (${schema})`);
  } else {
    await applyTenantPatches(pool, schema);
    if (tenant.name !== "Road Network Transporters") {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          name: "Road Network Transporters",
          contract: tenant.contract ?? "G4S Courier Services — March 2026",
        },
      });
      console.log(`Updated tenant display name to: ${tenant.name}`);
    }
  }

  await seedTenantData(pool, schema);

  let partner = await prisma.partner.findFirst({ where: { tenantId: tenant.id } });
  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        tenantId: tenant.id,
        slug: "g4s",
        name: "G4S COURIER",
        legalName: "G4S Courier Services Kenya Ltd",
        email: "accounts@g4s.co.ke",
      },
    });
  }

  const users = [
    { username: "admin", role: UserRole.admin, displayName: "RNT Fleet Admin", password: "admin123", partnerId: null as string | null },
    { username: "client", role: UserRole.client, displayName: "G4S Partner", password: "client123", partnerId: partner.id },
  ];

  for (const u of users) {
    const exists = await prisma.user.findFirst({
      where: { tenantId: tenant.id, username: u.username },
    });
    if (!exists) {
      const created = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          partnerId: u.partnerId,
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          passwordHash: await bcrypt.hash(u.password, 10),
        },
      });
      await storeCredential(created.id, u.password);
      console.log(`Seeded user: ${u.username} / ${u.password}`);
    }
  }

  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? "SwiftFleet2026!";
  const platformUser = await prisma.platformUser.upsert({
    where: { username: "superadmin" },
    create: {
      username: "superadmin",
      displayName: "SwiftFleet Super Admin",
      email: "admin@swiftfleet.africa",
      passwordHash: await bcrypt.hash(platformPassword, 10),
    },
    update: {},
  });
  if (platformUser) {
    console.log(`Platform super-admin: superadmin / ${platformPassword}`);
  }

  await pool.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
