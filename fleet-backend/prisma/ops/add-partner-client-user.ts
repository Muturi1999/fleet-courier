/**
 * Add or update a partner client portal user (full client access).
 *
 * Usage (from fleet-backend, with DATABASE_URL set):
 *   CLIENT_PASSWORD='...' npx ts-node prisma/ops/add-partner-client-user.ts
 *
 * Optional env:
 *   TENANT_SLUG=g4s-kenya
 *   PARTNER_SLUG=g4s-courier
 *   CLIENT_USERNAME=carolyn.wanjiru@ke.g4s.com
 *   CLIENT_DISPLAY_NAME=Carolyn Wanjiru
 */
import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { encryptPassword } from "../../src/common/utils/credential-vault";

const prisma = new PrismaClient();

async function main() {
  const tenantSlug = process.env.TENANT_SLUG ?? "g4s-kenya";
  const partnerSlug = process.env.PARTNER_SLUG ?? "g4s-courier";
  const username = (process.env.CLIENT_USERNAME ?? "carolyn.wanjiru@ke.g4s.com").trim().toLowerCase();
  const displayName = process.env.CLIENT_DISPLAY_NAME ?? "Carolyn Wanjiru";
  const password = process.env.CLIENT_PASSWORD;

  if (!password?.trim()) {
    throw new Error("CLIENT_PASSWORD env var is required");
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug, active: true } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);

  const partner = await prisma.partner.findFirst({
    where: { tenantId: tenant.id, slug: partnerSlug, active: true },
  });
  if (!partner) throw new Error(`Partner not found: ${partnerSlug}`);

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst({
    where: { tenantId: tenant.id, username },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          partnerId: partner.id,
          displayName,
          role: UserRole.client,
          passwordHash,
          active: true,
        },
      })
    : await prisma.user.create({
        data: {
          tenantId: tenant.id,
          partnerId: partner.id,
          username,
          displayName,
          role: UserRole.client,
          passwordHash,
          active: true,
        },
      });

  const passwordEncrypted = encryptPassword(password);
  await prisma.managedCredential.upsert({
    where: { userId: user.id },
    create: { userId: user.id, passwordEncrypted },
    update: { passwordEncrypted },
  });

  console.log(JSON.stringify({
    ok: true,
    action: existing ? "updated" : "created",
    tenant: tenant.slug,
    partner: partner.slug,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    loginUrl: `https://swiftfleet.africa/login?tenant=${tenant.slug}`,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
