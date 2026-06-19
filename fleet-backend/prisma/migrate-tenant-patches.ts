/**
 * Apply pending tenant schema patches to every active workspace.
 * Run after `prisma migrate deploy` on deploy / CI.
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { runTenantPatches } from "../src/common/database/tenant-patch.runner";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const prisma = new PrismaClient();
  const pool = new Pool({ connectionString: databaseUrl });
  const tenants = await prisma.tenant.findMany({ where: { active: true } });

  console.log(`Migrating tenant patches for ${tenants.length} workspace(s)...`);

  const client = await pool.connect();
  try {
    for (const tenant of tenants) {
      const result = await runTenantPatches(client, tenant.schema);
      console.log(
        `${tenant.slug}: applied=[${result.applied.join(", ")}] skipped=[${result.skipped.join(", ")}]`,
      );
    }
  } finally {
    client.release();
    await pool.end();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
