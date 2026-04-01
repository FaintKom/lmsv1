#!/bin/bash
LOCAL_DIR="F:/lms/backups"
mkdir -p "$LOCAL_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M)
ssh root@204.168.165.41 "docker exec lms-db-1 pg_dump -U lms lms" | gzip > "$LOCAL_DIR/lms_$TIMESTAMP.sql.gz"
echo "Downloaded: $LOCAL_DIR/lms_$TIMESTAMP.sql.gz"
