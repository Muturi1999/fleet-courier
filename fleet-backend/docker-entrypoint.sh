#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Applying tenant schema patches..."
node prisma/migrate-tenant-patches.js

echo "Backfilling partner records..."
node prisma/backfill-partners.js || echo "Partner backfill skipped"

echo "Backfilling work-ticket invoices..."
node prisma/backfill-work-ticket-invoices.js || echo "Work-ticket invoice backfill skipped"

echo "Ensuring platform super-admin..."
node prisma/ensure-platform-admin.js || echo "Platform admin setup skipped"

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node prisma/seed.ts || echo "Seed skipped or already applied"
fi

echo "Starting Fleet API..."
exec node dist/main.js
