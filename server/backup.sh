#!/bin/bash
set -e

BACKUP_DIR="/opt/tramdisp/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начинаю бэкап БД..."

docker compose -f /opt/tramdisp/server/docker-compose.yml exec -T db \
    pg_dump -U postgres -Fc --no-owner tramdisp \
    > "$BACKUP_DIR/tramdisp_${TIMESTAMP}.dump"

FILESIZE=$(du -h "$BACKUP_DIR/tramdisp_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] Бэкап создан: tramdisp_${TIMESTAMP}.dump (${FILESIZE})"

find "$BACKUP_DIR" -name "*.dump" -mtime +${KEEP_DAYS} -exec rm -f {} \;
echo "[$(date)] Удалены бэкапы старше ${KEEP_DAYS} дней"

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date)] Всего бэкапов: ${BACKUP_COUNT}, размер: ${TOTAL_SIZE}"
