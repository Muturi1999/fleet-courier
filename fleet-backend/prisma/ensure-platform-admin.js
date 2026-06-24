const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.PLATFORM_ADMIN_USER ?? "superadmin";
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? "SwiftFleet2026!";
  const email = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@swiftfleet.africa";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.platformUser.upsert({
    where: { username },
    create: {
      username,
      displayName: "SwiftFleet Super Admin",
      email,
      passwordHash,
    },
    update: {
      displayName: "SwiftFleet Super Admin",
      email,
      active: true,
    },
  });

  console.log(`Platform admin ready: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
