#!/usr/bin/env bash
# Build Docker images locally, transfer to server, start stack.
#
# Usage:
#   ./deploy/deploy.sh                  # full deploy (zero-downtime rollout)
#   ./deploy/deploy.sh --frontend       # frontend only — blue/green, no 502
#   ./deploy/deploy.sh --backend        # backend only — migrate-first
#   ./deploy/deploy.sh --frontend --fast
#   ./deploy/deploy.sh --clean          # full deploy + prune Docker cache
#   ./deploy/deploy.sh [version] --seed
#
# NPM always points to 127.0.0.1:3300 (swiftfleet-router). The app frontend
# is swapped behind the router during deploys so users do not see 502.

set -euo pipefail

cleanup_docker_artifacts() {
  local version="${1:-}"
  echo "==> Pruning Docker build cache..."
  docker builder prune -af >/dev/null 2>&1 || true

  echo "==> Removing old fleet-courier / swiftfleet image tags..."
  for repo in fleet-courier-backend fleet-courier-frontend swiftfleet-backend swiftfleet-frontend; do
    while IFS= read -r tag; do
      [[ -z "$tag" || "$tag" == "latest" || "$tag" == "$version" ]] && continue
      docker rmi "${repo}:${tag}" 2>/dev/null || true
    done < <(docker images "$repo" --format '{{.Tag}}' 2>/dev/null || true)
  done

  echo "==> Pruning dangling images..."
  docker image prune -f >/dev/null 2>&1 || true
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
SERVER="${SWIFTFLEET_SERVER:-root@62.171.186.126}"
REMOTE_DIR="${SWIFTFLEET_REMOTE_DIR:-/opt/swiftfleet}"
RUN_SEED_FLAG="${RUN_SEED:-false}"
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true
FAST=false
CLEAN=false

for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED_FLAG=true ;;
    --frontend) DEPLOY_BACKEND=false ;;
    --backend) DEPLOY_FRONTEND=false ;;
    --fast) FAST=true ;;
    --clean) CLEAN=true ;;
    --*) ;;
    *) VERSION="$arg" ;;
  esac
done

if [[ "$DEPLOY_FRONTEND" == false && "$DEPLOY_BACKEND" == false ]]; then
  echo "ERROR: cannot use --frontend and --backend together"
  exit 1
fi

SERVICES=()
IMAGES=()
[[ "$DEPLOY_BACKEND" == true ]] && SERVICES+=(backend) && IMAGES+=(swiftfleet-backend)
[[ "$DEPLOY_FRONTEND" == true ]] && SERVICES+=(frontend) && IMAGES+=(swiftfleet-frontend)

SCOPE="full"
[[ "$DEPLOY_FRONTEND" == true && "$DEPLOY_BACKEND" == false ]] && SCOPE="frontend"
[[ "$DEPLOY_BACKEND" == true && "$DEPLOY_FRONTEND" == false ]] && SCOPE="backend"

echo "==> Fleet Courier deploy v${VERSION} (${SCOPE}) → ${SERVER}"

cd "$ROOT"

echo "==> Building: ${SERVICES[*]}..."
docker compose -f docker-compose.yml build --pull=false "${SERVICES[@]}"

if [[ "$DEPLOY_BACKEND" == true ]]; then
  docker tag fleet-courier-backend:latest "swiftfleet-backend:${VERSION}"
  docker tag fleet-courier-backend:latest swiftfleet-backend:latest
fi
if [[ "$DEPLOY_FRONTEND" == true ]]; then
  docker tag fleet-courier-frontend:latest "swiftfleet-frontend:${VERSION}"
  docker tag fleet-courier-frontend:latest swiftfleet-frontend:latest
fi

if [[ "$CLEAN" == true && "$FAST" == false ]]; then
  cleanup_docker_artifacts "$VERSION"
elif [[ "$FAST" == false ]]; then
  echo "==> Skipping pre-build cache prune (use --clean to free disk)"
fi

echo "==> Packaging image(s)..."
TMP_TAR="$(mktemp /tmp/swiftfleet-images-XXXXXX.tar.gz)"
SAVE_TAGS=()
[[ "$DEPLOY_BACKEND" == true ]] && SAVE_TAGS+=("swiftfleet-backend:${VERSION}")
[[ "$DEPLOY_FRONTEND" == true ]] && SAVE_TAGS+=("swiftfleet-frontend:${VERSION}")
docker save "${SAVE_TAGS[@]}" | gzip > "$TMP_TAR"
TAR_MB="$(du -m "$TMP_TAR" | cut -f1)"
echo "    Archive size: ~${TAR_MB} MB"

echo "==> Preparing remote directory..."
ssh "$SERVER" "mkdir -p ${REMOTE_DIR}"

echo "==> Uploading images..."
scp "$TMP_TAR" "${SERVER}:${REMOTE_DIR}/images.tar.gz"
rm -f "$TMP_TAR"

echo "==> Uploading compose + env template..."
scp "$ROOT/docker-compose.prod.yml" "${SERVER}:${REMOTE_DIR}/docker-compose.yml"
scp "$ROOT/deploy/.env.production.example" "${SERVER}:${REMOTE_DIR}/.env.production.example"
ssh "$SERVER" "mkdir -p ${REMOTE_DIR}/router"
scp "$ROOT/deploy/router/nginx.conf" "${SERVER}:${REMOTE_DIR}/router/nginx.conf"
scp "$ROOT/deploy/router/upstream.conf" "${SERVER}:${REMOTE_DIR}/router/upstream.conf"
scp "$ROOT/deploy/rollout-remote.sh" "${SERVER}:${REMOTE_DIR}/rollout-remote.sh"

COMPOSE_SERVICES=""
[[ "$DEPLOY_BACKEND" == true ]] && COMPOSE_SERVICES+=" backend"
[[ "$DEPLOY_FRONTEND" == true ]] && COMPOSE_SERVICES+=" frontend"

ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}

if [[ ! -f .env ]]; then
  echo "ERROR: ${REMOTE_DIR}/.env missing on server."
  exit 1
fi

echo "==> Loading Docker images..."
gunzip -c images.tar.gz | docker load
rm -f images.tar.gz

export SWIFTFLEET_VERSION=${VERSION}
export DEPLOY_BACKEND=${DEPLOY_BACKEND}
export DEPLOY_FRONTEND=${DEPLOY_FRONTEND}
export REMOTE_DIR=${REMOTE_DIR}
export RUN_SEED=${RUN_SEED_FLAG}

if [[ "${RUN_SEED_FLAG}" == "true" ]]; then
  sed -i 's/^RUN_SEED=.*/RUN_SEED=true/' .env || echo 'RUN_SEED=true' >> .env
fi

chmod +x rollout-remote.sh
./rollout-remote.sh

if [[ "${CLEAN}" == "true" && "${FAST}" == "false" ]]; then
  echo "==> Pruning old images on server..."
  docker builder prune -af >/dev/null 2>&1 || true
  for repo in swiftfleet-backend swiftfleet-frontend; do
    while IFS= read -r tag; do
      [[ -z "\$tag" || "\$tag" == "latest" || "\$tag" == "${VERSION}" ]] && continue
      docker rmi "\${repo}:\${tag}" 2>/dev/null || true
    done < <(docker images "\$repo" --format '{{.Tag}}' 2>/dev/null || true)
  done
  docker image prune -f >/dev/null 2>&1 || true
fi
REMOTE

if [[ "$CLEAN" == true && "$FAST" == false ]]; then
  cleanup_docker_artifacts "$VERSION"
fi

echo ""
echo "Deploy complete (${SCOPE}, ~${TAR_MB} MB uploaded)."
echo "  Zero-downtime: NPM → router :3300 → blue/green frontend"
echo "  Tip: UI-only → ./deploy/deploy.sh --frontend --fast"
echo "  Version: ${VERSION}"
