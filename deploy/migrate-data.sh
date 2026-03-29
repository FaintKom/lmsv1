#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Migrate data from Render PostgreSQL to Hetzner PostgreSQL
# Run this AFTER the new server is set up and running
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "LearnHub — Database Migration"
echo ""

# Source: Render PostgreSQL
RENDER_DB_URL="${1:-}"
# Target: Hetzner PostgreSQL
HETZNER_IP="${2:-}"
HETZNER_DB_PASS="${3:-}"

if [ -z "$RENDER_DB_URL" ] || [ -z "$HETZNER_IP" ] || [ -z "$HETZNER_DB_PASS" ]; then
  echo "Usage: ./migrate-data.sh RENDER_DB_URL HETZNER_IP HETZNER_DB_PASSWORD"
  echo ""
  echo "RENDER_DB_URL: Get from Render dashboard → Database → External Connection String"
  echo "HETZNER_IP: Your Hetzner server IP"
  echo "HETZNER_DB_PASS: Password from .env POSTGRES_PASSWORD"
  exit 1
fi

echo "Step 1: Dumping from Render..."
pg_dump "$RENDER_DB_URL" --no-owner --no-acl --clean --if-exists > /tmp/lms_dump.sql
echo "  Dump size: $(du -h /tmp/lms_dump.sql | cut -f1)"

echo "Step 2: Restoring to Hetzner..."
PGPASSWORD="$HETZNER_DB_PASS" psql -h "$HETZNER_IP" -U lms -d lms < /tmp/lms_dump.sql

echo "Step 3: Cleanup..."
rm /tmp/lms_dump.sql

echo ""
echo "Migration complete!"
echo "Verify: PGPASSWORD=$HETZNER_DB_PASS psql -h $HETZNER_IP -U lms -d lms -c 'SELECT count(*) FROM users;'"
