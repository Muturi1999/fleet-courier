-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "password_encrypted" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_credentials_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "partner_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "partners_tenant_id_slug_key" ON "partners"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_username_key" ON "platform_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "managed_credentials_user_id_key" ON "managed_credentials"("user_id");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_credentials" ADD CONSTRAINT "managed_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
