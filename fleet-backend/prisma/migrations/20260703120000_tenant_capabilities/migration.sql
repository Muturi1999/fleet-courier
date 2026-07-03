-- CreateEnum
CREATE TYPE "TenantProfile" AS ENUM ('contract_fleet', 'operations_pilot');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "profile" "TenantProfile" NOT NULL DEFAULT 'contract_fleet';
ALTER TABLE "tenants" ADD COLUMN "features" JSONB;

-- Pilot tenant for logistics OS vision (RNT/G4S stays contract_fleet)
UPDATE "tenants" SET "profile" = 'operations_pilot' WHERE "slug" = 'horizon-logistics-ltd';
