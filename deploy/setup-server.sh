#!/usr/bin/env bash
# One-time server setup: create /opt/swiftfleet and .env from template.
set -euo pipefail

SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

JWT_SECRET="$(openssl rand -hex 32)"
DB_PASS="$(openssl rand -hex 16)"

ssh "$SERVER" "mkdir -p ${REMOTE_DIR}"

scp "$ROOT/deploy/.env.production.example" "${SERVER}:${REMOTE_DIR}/.env.production.example"

ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
if [[ -f .env ]]; then
  echo ".env already exists — not overwriting"
  exit 0
fi
cp .env.production.example .env
sed -i "s/CHANGE_ME_strong_random_password/${DB_PASS}/" .env
sed -i "s/CHANGE_ME_long_random_jwt_secret_min_32_chars/${JWT_SECRET}/" .env
chmod 600 .env
echo "Created ${REMOTE_DIR}/.env with generated secrets"
REMOTE

echo "Server ready. Run: ./deploy/deploy.sh --seed"
