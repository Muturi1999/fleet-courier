#!/usr/bin/env bash
# Build Docker images locally, transfer to server, start stack.
# Usage: ./deploy/deploy.sh [version] [--seed]
# Requires: SSH key access to SERVER (no password in this script).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
RUN_SEED_FLAG="${RUN_SEED:-false}"

for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED_FLAG=true ;;
    --*) ;;
    *) VERSION="$arg" ;;
  esac
done

echo "==> Fleet Courier deploy v${VERSION} → ${SERVER}"

cd "$ROOT"

echo "==> Building images locally..."
docker compose -f docker-compose.yml build --pull=false

docker tag fleet-courier-backend:latest "swiftfleet-backend:${VERSION}"
docker tag fleet-courier-backend:latest swiftfleet-backend:latest
docker tag fleet-courier-frontend:latest "swiftfleet-frontend:${VERSION}"
docker tag fleet-courier-frontend:latest swiftfleet-frontend:latest

echo "==> Packaging images (~compressed tar)..."
TMP_TAR="$(mktemp /tmp/swiftfleet-images-XXXXXX.tar.gz)"
docker save "swiftfleet-backend:${VERSION}" "swiftfleet-frontend:${VERSION}" | gzip > "$TMP_TAR"

echo "==> Preparing remote directory..."
ssh "$SERVER" "mkdir -p ${REMOTE_DIR}"

echo "==> Uploading images (this may take a few minutes)..."
scp "$TMP_TAR" "${SERVER}:${REMOTE_DIR}/images.tar.gz"
rm -f "$TMP_TAR"

echo "==> Uploading compose + env template..."
scp "$ROOT/docker-compose.prod.yml" "${SERVER}:${REMOTE_DIR}/docker-compose.yml"
scp "$ROOT/deploy/.env.production.example" "${SERVER}:${REMOTE_DIR}/.env.production.example"

ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}

if [[ ! -f .env ]]; then
  echo "ERROR: ${REMOTE_DIR}/.env missing on server."
  echo "Copy deploy/.env.production.example to .env and set secrets first."
  echo "  ssh ${SERVER} 'cp ${REMOTE_DIR}/.env.production.example ${REMOTE_DIR}/.env && nano ${REMOTE_DIR}/.env'"
  exit 1
fi

echo "==> Loading Docker images..."
gunzip -c images.tar.gz | docker load
rm -f images.tar.gz

export SWIFTFLEET_VERSION=${VERSION}
if [[ "${RUN_SEED_FLAG}" == "true" ]]; then
  sed -i 's/^RUN_SEED=.*/RUN_SEED=true/' .env || echo 'RUN_SEED=true' >> .env
fi

echo "==> Starting stack (port 3300 frontend, 4300 API debug)..."
docker compose --env-file .env up -d --remove-orphans

echo "==> Status:"
docker compose ps
curl -sf http://127.0.0.1:3300/api/health || echo "(frontend health pending...)"
curl -sf http://127.0.0.1:4300/api/v1/health || echo "(backend health pending...)"
REMOTE

echo ""
echo "Deploy complete."
echo "  Frontend (NPM target): http://127.0.0.1:3300"
echo "  Backend (optional):    http://127.0.0.1:4300/api/v1"
echo "  Configure NPM → https://swiftfleet.africa → 127.0.0.1:3300"
echo "  Version deployed: ${VERSION}"
