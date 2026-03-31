# Деплой ТрамДиспетч на VPS

## Требования к серверу

| Параметр | Значение |
|---|---|
| ОС | Ubuntu 22.04 LTS |
| CPU | 4 ядра |
| RAM | 8 ГБ |
| Диск | 160 ГБ NVMe SSD |
| Сеть | 200+ Мбит |

Рассчитано на **150 транспортов**, **150 пользователей**.

---

## Быстрый старт (автоматический)

```bash
# 1. Подключись к серверу
ssh root@твой-сервер

# 2. Скачай проект
git clone https://github.com/твой-репо/tramdisp.git /opt/tramdisp

# 3. Запусти установку
cd /opt/tramdisp
sudo bash server/setup.sh
```

Скрипт сам установит Docker, настроит файрвол, получит SSL-сертификат и запустит всё.

---

## Ручной деплой

### 1. Установи Docker

```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

### 2. Настрой .env

```bash
cd /opt/tramdisp/server
cp .env.example .env
nano .env
```

Заполни: `DB_PASSWORD`, `SECRET_KEY`, `DOMAIN`, `EMAIL`.

### 3. Замени домен в nginx.conf

```bash
sed -i 's/${DOMAIN}/твой-домен.ru/g' nginx.conf
```

### 4. Получи SSL-сертификат

```bash
docker run --rm -p 80:80 \
    -v tramdisp_certbot-conf:/etc/letsencrypt \
    certbot/certbot certonly \
    --standalone \
    --email твой@email.ru \
    --agree-tos -d твой-домен.ru
```

### 5. Запусти

```bash
docker compose up -d
```

---

## Управление

```bash
cd /opt/tramdisp/server

# Статус всех сервисов
docker compose ps

# Логи (все)
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f api
docker compose logs -f db

# Перезапуск
docker compose restart

# Обновление (после git pull)
docker compose build --no-cache
docker compose up -d

# Остановка
docker compose down
```

---

## Бэкапы

### Ручной бэкап
```bash
bash /opt/tramdisp/server/backup.sh
```

### Автоматический (cron — каждый день в 3:00)
```bash
crontab -e
# Добавь строку:
0 3 * * * /bin/bash /opt/tramdisp/server/backup.sh >> /var/log/tramdisp-backup.log 2>&1
```

### Восстановление из бэкапа
```bash
docker compose exec -T db pg_restore -U postgres -d tramdisp --clean < backups/tramdisp_ДАТА.dump
```

---

## Архитектура на сервере

```
                    Интернет
                       │
                   ┌───┴───┐
                   │ Nginx │ :80/:443
                   │ (SSL) │
                   └───┬───┘
                 ┌─────┴─────┐
                 │           │
          ┌──────┴──┐  ┌────┴─────┐
          │ React   │  │ FastAPI  │ :8000
          │ (SPA)   │  │ (API)   │
          │ static  │  └────┬────┘
          └─────────┘   ┌───┴───┬──────────┐
                        │       │          │
                   ┌────┴──┐ ┌─┴────┐ ┌───┴───┐
                   │ PG +  │ │Redis │ │  S3   │
                   │Timesc.│ │      │ │(файлы)│
                   └───────┘ └──────┘ └───────┘
```

---

## Мониторинг

```bash
# Использование ресурсов контейнерами
docker stats

# Размер БД
docker compose exec db psql -U postgres -d tramdisp \
    -c "SELECT pg_size_pretty(pg_database_size('tramdisp'));"

# Размер таблицы телеметрии
docker compose exec db psql -U postgres -d tramdisp \
    -c "SELECT hypertable_size('vehicle_telemetry');"

# Количество чанков TimescaleDB
docker compose exec db psql -U postgres -d tramdisp \
    -c "SELECT * FROM timescaledb_information.chunks ORDER BY range_start DESC LIMIT 10;"
```

---

## Масштабирование (когда > 500 транспортов)

1. **Вертикально**: увеличь RAM до 16 ГБ, CPU до 8 ядер
2. **Redis**: вынеси на отдельный сервер
3. **Read replicas**: настрой PostgreSQL streaming replication
4. **API**: увеличь workers в Dockerfile (--workers 8)
