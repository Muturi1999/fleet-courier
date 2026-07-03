#!/usr/bin/env bash
# Zero-downtime rollout helpers — run on the production host (sourced or executed).
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/swiftfleet}"
COMPOSE_SERVICES="${COMPOSE_SERVICES:-}"
DEPLOY_BACKEND="${DEPLOY_BACKEND:-false}"
DEPLOY_FRONTEND="${DEPLOY_FRONTEND:-false}"
SWIFTFLEET_VERSION="${SWIFTFLEET_VERSION:-latest}"

cd "$REMOTE_DIR"

compose() {
  docker compose --env-file .env "$@"
}

network_name() {
  compose ps -q router 2>/dev/null | head -1 | xargs -r docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null \
    || compose ps -q frontend 2>/dev/null | head -1 | xargs -r docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' \
    || echo "swiftfleet_swiftfleet"
}

ensure_router() {
  if compose ps --status running router 2>/dev/null | grep -q router; then
    return 0
  fi

  echo "==> Starting edge router on 127.0.0.1:3300 (one-time cutover)..."
  if docker ps --format '{{.Names}} {{.Ports}}' | grep -q 'swiftfleet-frontend.*3300'; then
    echo "    Releasing port 3300 from legacy frontend binding..."
    compose stop frontend || true
  fi
  compose up -d router
  compose up -d frontend
  echo "server swiftfleet-frontend:3000 max_fails=2 fail_timeout=5s;" > "${REMOTE_DIR}/router/upstream.conf"
  compose exec -T router nginx -s reload 2>/dev/null || true
}

run_migrations() {
  echo "==> Running DB migrations (API stays up)..."
  local seed_env="-e RUN_SEED=false"
  if [[ "${RUN_SEED:-false}" == "true" ]]; then
    seed_env="-e RUN_SEED=true"
  fi
  # shellcheck disable=SC2086
  compose run --rm --no-deps \
    -e RUN_MIGRATIONS_ONLY=true \
    -e SKIP_MIGRATIONS=false \
    $seed_env \
    backend /entrypoint.sh
}

wait_backend_health() {
  local url="$1"
  local label="${2:-backend}"
  for i in $(seq 1 60); do
    if curl -sf "$url" >/dev/null; then
      echo "    ${label} healthy"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ${label} failed health check (${url})" >&2
  return 1
}

rollout_backend() {
  echo "==> Rolling backend (migrate-first)..."
  run_migrations

  export SWIFTFLEET_VERSION
  compose up -d --no-deps --wait backend || {
    echo "ERROR: backend container failed to start" >&2
    return 1
  }

  wait_backend_health "http://127.0.0.1:4300/api/v1/health" "backend"
}

frontend_env_args() {
  local env_file="${REMOTE_DIR}/.env"
  local backend_tenant
  backend_tenant="$(grep -E '^FLEET_BACKEND_TENANT=' "$env_file" | cut -d= -f2- | tr -d '"' || echo g4s-kenya)"
  printf '%s\n' \
    -e NODE_ENV=production \
    -e "FLEET_BACKEND_URL=http://backend:4000/api/v1" \
    -e "FLEET_BACKEND_TENANT=${backend_tenant:-g4s-kenya}"
}

rollout_frontend() {
  ensure_router

  local net image candidate="swiftfleet-frontend-candidate"
  net="$(network_name)"
  image="swiftfleet-frontend:${SWIFTFLEET_VERSION}"

  echo "==> Blue/green frontend rollout (${image})..."

  docker rm -f "$candidate" 2>/dev/null || true

  # shellcheck disable=SC2046
  docker run -d \
    --name "$candidate" \
    --network "$net" \
    --network-alias frontend-candidate \
    --label com.docker.compose.project=swiftfleet \
    --label com.docker.compose.service=frontend \
    $(frontend_env_args) \
    "$image"

  for i in $(seq 1 60); do
    if docker run --rm --network "$net" curlimages/curl:8.5.0 -sf "http://${candidate}:3000/api/health" >/dev/null; then
      echo "    ${candidate} healthy"
      break
    fi
    if [[ "$i" -eq 60 ]]; then
      echo "ERROR: frontend candidate /api/health failed" >&2
      docker rm -f "$candidate" 2>/dev/null || true
      return 1
    fi
    sleep 2
  done

  echo "==> Switching router to new frontend..."
  echo "server ${candidate}:3000 max_fails=2 fail_timeout=5s;" > "${REMOTE_DIR}/router/upstream.conf"
  compose exec -T router nginx -s reload

  sleep 1

  docker stop swiftfleet-frontend 2>/dev/null || true
  docker rm swiftfleet-frontend 2>/dev/null || true
  docker rename "$candidate" swiftfleet-frontend

  echo "server swiftfleet-frontend:3000 max_fails=2 fail_timeout=5s;" > "${REMOTE_DIR}/router/upstream.conf"
  compose exec -T router nginx -s reload

  compose up -d --no-recreate frontend 2>/dev/null || true

  echo "    Frontend cutover complete (NPM stays on :3300)."
}

main_rollout() {
  ensure_router

  if [[ "$DEPLOY_BACKEND" == "true" ]]; then
    rollout_backend
  fi

  if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
    rollout_frontend
  fi

  echo "==> Status:"
  compose ps
  curl -sf http://127.0.0.1:3300/api/health && echo " (via router)" || echo "(router health pending...)"
  curl -sf http://127.0.0.1:4300/api/v1/health && echo " (backend)" || echo "(backend health pending...)"
}

main_rollout
