#!/usr/bin/env bash
# Load full demo dataset into production tenant schema (schedules, vehicles, invoices, etc.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
FORCE="${FORCE_DEMO_SEED:-false}"

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
  esac
done

echo "==> Deploy backend image (includes seed-demo-data.ts)..."
"$ROOT/deploy/deploy-backend.sh" latest

echo "==> Running demo data migration on server..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
FORCE_DEMO_SEED=${FORCE} docker compose exec -T -e FORCE_DEMO_SEED=${FORCE} backend sh -c \
  'TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='"'"'{"module":"commonjs"}'"'"' npx ts-node prisma/seed-demo-data.ts'
REMOTE

echo "==> Verifying API counts..."
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
TOKEN=\$(curl -sf -X POST http://127.0.0.1:4300/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","tenantSlug":"g4s-kenya"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
for path in schedules vehicles invoices rates work-tickets expenses notifications; do
  count=\$(curl -sf -H "Authorization: Bearer \$TOKEN" "http://127.0.0.1:4300/api/v1/\$path" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else d.get('total',0))" 2>/dev/null || echo "?")
  echo "  \$path: \$count"
done
REMOTE

echo "Demo data migration complete."
