#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Applying tenant schema patches..."
node prisma/migrate-tenant-patches.js

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node prisma/seed.ts || echo "Seed skipped or already applied"
fi

echo "Starting Fleet API..."
exec node dist/main.js
