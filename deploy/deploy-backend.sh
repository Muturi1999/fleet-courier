#!/usr/bin/env bash
# Rebuild and deploy backend image only (faster than full stack).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
VERSION="${1:-latest}"

cd "$ROOT"
docker compose -f docker-compose.yml build backend --pull=false
docker tag fleet-courier-backend:latest "swiftfleet-backend:${VERSION}"
docker tag fleet-courier-backend:latest swiftfleet-backend:latest

TMP_TAR="$(mktemp /tmp/swiftfleet-backend-XXXXXX.tar.gz)"
docker save "swiftfleet-backend:${VERSION}" | gzip > "$TMP_TAR"
scp "$TMP_TAR" "${SERVER}:${REMOTE_DIR}/backend.tar.gz"
rm -f "$TMP_TAR"

ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
gunzip -c backend.tar.gz | docker load
rm -f backend.tar.gz
docker compose --env-file .env up -d --force-recreate backend
sleep 40
docker compose ps
curl -sf http://127.0.0.1:4300/api/v1/health; echo
docker compose up -d frontend
sleep 10
curl -sf http://127.0.0.1:3300/api/health; echo
REMOTE
echo "Backend redeployed: ${VERSION}"
