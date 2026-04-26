#!/bin/bash
# GrassLMS Postgres backup — runs daily via cron at 04:00.
#
# Dumps the `lms` database from the lms-db-1 container into /opt/lms/backups/
# with a date-stamped filename, gzips it, and prunes backups older than
# RETENTION_DAYS. Exits non-zero on any failure so cron MAILTO gets alerted.
#
# Environment variables (optional):
#   RETENTION_DAYS — number of daily backups to keep (default 7)
#   BACKUP_DIR     — where to write dumps (default /opt/lms/backups)

set -euo pipefail

RETENTION_DAYS="${RETENTION_DAYS:-7}"
BACKUP_DIR="${BACKUP_DIR:-/opt/lms/backups}"
DB_CONTAINER="${DB_CONTAINER:-lms-db-1}"
DB_NAME="${DB_NAME:-lms}"
DB_USER="${DB_USER:-lms}"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_FILE="${BACKUP_DIR}/lms-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u --iso-8601=seconds)] starting backup -> ${OUT_FILE}"

# Pipe through gzip inline so we never materialize the uncompressed dump on disk.
if ! docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl \
    | gzip -9 > "${OUT_FILE}.tmp"; then
  echo "[$(date -u --iso-8601=seconds)] ERROR: pg_dump failed" >&2
  rm -f "${OUT_FILE}.tmp"
  exit 1
fi

# Sanity check: a valid gzipped dump is never tiny
SIZE="$(stat -c %s "${OUT_FILE}.tmp")"
if [ "${SIZE}" -lt 1024 ]; then
  echo "[$(date -u --iso-8601=seconds)] ERROR: dump too small (${SIZE} bytes), aborting" >&2
  rm -f "${OUT_FILE}.tmp"
  exit 1
fi

mv "${OUT_FILE}.tmp" "${OUT_FILE}"
echo "[$(date -u --iso-8601=seconds)] backup ok: ${OUT_FILE} (${SIZE} bytes)"

# Retention: delete dumps older than RETENTION_DAYS days
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'lms-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/  pruned: /'

# Keep the log file under control too — only the last ~1000 lines
LOG="${BACKUP_DIR}/backup.log"
if [ -f "${LOG}" ] && [ "$(wc -l < "${LOG}")" -gt 2000 ]; then
  tail -n 1000 "${LOG}" > "${LOG}.tmp" && mv "${LOG}.tmp" "${LOG}"
fi

echo "[$(date -u --iso-8601=seconds)] done"
