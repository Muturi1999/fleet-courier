#!/usr/bin/env bash
# Upsert RNTL fleet list vehicles into production tenant DB (no full redeploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
TENANT="${DEFAULT_TENANT_SLUG:-g4s-kenya}"

echo "==> Copying fleet seed files to server..."
scp "$ROOT/fleet-backend/prisma/rntl-fleet-list.ts" \
    "$ROOT/fleet-backend/prisma/seed-rntl-fleet.ts" \
    "${SERVER}:${REMOTE_DIR}/"

echo "==> Running fleet upsert in backend container..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
CID=\$(docker compose ps -q backend)
docker cp rntl-fleet-list.ts "\${CID}:/app/prisma/rntl-fleet-list.ts"
docker cp seed-rntl-fleet.ts "\${CID}:/app/prisma/seed-rntl-fleet.ts"
docker compose exec -T -e DEFAULT_TENANT_SLUG=${TENANT} backend sh -c \
  'TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='"'"'{"module":"commonjs"}'"'"' npx ts-node prisma/seed-rntl-fleet.ts'
rm -f rntl-fleet-list.ts seed-rntl-fleet.ts
REMOTE

echo "==> Verifying vehicle count via API..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
TOKEN=$(curl -sf -X POST http://127.0.0.1:4300/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","tenantSlug":"g4s-kenya"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:4300/api/v1/vehicles?all=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('vehicles:', len(d) if isinstance(d,list) else d.get('meta',{}).get('total', len(d.get('data',[]))))"
REMOTE

echo "RNTL fleet seed done."
