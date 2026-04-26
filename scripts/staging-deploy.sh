#!/usr/bin/env bash
# Deploy the latest main branch to the staging stack on the prod VPS.
#
# Usage on the server:
#   bash /opt/lms-staging/scripts/staging-deploy.sh
#
# What it does:
#   1. cd into /opt/lms-staging (a clone of the same repo, separate from /opt/lms)
#   2. Pull latest main
#   3. Rebuild the staging images (only services with build context changes)
#   4. Recreate staging containers (zero downtime not required for staging)
#   5. Run alembic migrations against the staging DB
#   6. Smoke check /health/ready
#
# Safe to run repeatedly. Does NOT touch the prod stack — different project
# name (`-p staging`), different volumes, different DB credentials.

set -euo pipefail

STAGING_DIR="/opt/lms-staging"
COMPOSE_FILE="docker-compose.staging.yml"
PROJECT="staging"

cd "$STAGING_DIR"

echo "==> Pulling latest main"
git fetch origin main
git reset --hard origin/main

echo "==> Building staging images"
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" build

echo "==> Starting staging containers"
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d

echo "==> Waiting for staging-db to be healthy"
for i in {1..30}; do
    if docker exec staging-db pg_isready -U "${POSTGRES_USER:-lms_staging}" >/dev/null 2>&1; then
        echo "    staging-db ready"
        break
    fi
    sleep 2
done

echo "==> Running migrations"
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" exec -T staging-backend alembic upgrade head || {
    echo "    Migrations failed — check logs with:"
    echo "    docker compose -p $PROJECT -f $COMPOSE_FILE logs staging-backend"
    exit 1
}

echo "==> Smoke check /health/ready"
sleep 3
if docker exec lms-nginx-1 wget -q -O - -T 5 http://staging-backend:8000/health/ready | grep -q '"status":"ready"'; then
    echo "    staging-backend ready"
else
    echo "    WARNING: /health/ready did not return ready — check logs"
fi

echo "==> Done. Visit https://staging.grasslms.online"
echo "    Logs: docker compose -p $PROJECT -f $COMPOSE_FILE logs -f"
