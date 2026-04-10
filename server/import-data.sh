#!/bin/bash
# ============================================
# ИРИДА: Импорт данных из облачной БД
# ============================================
# Скачивает полный дамп из облачной функции export-db
# и импортирует в локальную БД.
#
# Использование:
#   ./import-data.sh                    # из облака (по умолчанию)
#   ./import-data.sh --from-file dump.sql  # из файла
#
# Требования: curl, psql (или docker compose для контейнерной БД)

set -e

EXPORT_URL="https://functions.poehali.dev/fdbed3a2-3ef2-4988-a81e-07c0387d98e4"
DB_NAME="tramdisp"
DB_USER="postgres"
DUMP_DIR="/opt/tramdisp/dumps"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$DUMP_DIR/export_${TIMESTAMP}.sql"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[ИРИДА] Импорт данных из облачной БД${NC}"
echo "========================================"

mkdir -p "$DUMP_DIR"

if [ "$1" = "--from-file" ] && [ -n "$2" ]; then
    DUMP_FILE="$2"
    echo -e "${YELLOW}Используем существующий файл: $DUMP_FILE${NC}"
    if [ ! -f "$DUMP_FILE" ]; then
        echo -e "${RED}Файл не найден: $DUMP_FILE${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Скачиваю данные из облака...${NC}"
    echo "URL: $EXPORT_URL/?action=full"

    curl -s -o "$DUMP_FILE" "$EXPORT_URL/?action=full"

    FILESIZE=$(du -h "$DUMP_FILE" | cut -f1)
    LINES=$(wc -l < "$DUMP_FILE")
    echo -e "${GREEN}Скачано: $DUMP_FILE (${FILESIZE}, ${LINES} строк)${NC}"

    HEAD=$(head -1 "$DUMP_FILE")
    if echo "$HEAD" | grep -q "error"; then
        echo -e "${RED}Ошибка экспорта:${NC}"
        head -5 "$DUMP_FILE"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Импортирую в БД...${NC}"

COMPOSE_FILE="/opt/tramdisp/server/docker-compose.yml"

if [ -f "$COMPOSE_FILE" ]; then
    echo "Используем Docker PostgreSQL"
    docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U "$DB_USER" -d "$DB_NAME" -f - < "$DUMP_FILE"
else
    echo "Используем локальный PostgreSQL"
    psql -U "$DB_USER" -d "$DB_NAME" -f "$DUMP_FILE"
fi

echo ""
echo -e "${GREEN}========================================"
echo -e "Импорт завершён!"
echo -e "Файл дампа: $DUMP_FILE"
echo -e "========================================${NC}"
