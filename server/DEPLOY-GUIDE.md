# Деплой ИРИДА на свой сервер (Dokploy / VPS)

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

## Быстрый старт

```bash
# 1. Склонируй проект
git clone https://github.com/твой-репо/irida.git /opt/irida
cd /opt/irida

# 2. Настрой переменные
cp server/.env.example server/.env
nano server/.env
```

Заполни в `.env`:
- `DB_PASSWORD` — надёжный пароль для PostgreSQL
- `SECRET_KEY` — случайная строка 48 символов
- `DOMAIN` — твой домен
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — для S3 (файлы, аудио)
- `YANDEX_SPEECHKIT_KEY` — для транскрибации аудио (опционально)

```bash
# 3. Запусти
cd server
docker compose up -d
```

---

## Структура сервисов

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
          │ (SPA)   │  │(15 функц)│
          │ static  │  └────┬────┘
          └─────────┘   ┌───┴───┬──────────┐
                        │       │          │
                   ┌────┴──┐ ┌─┴────┐ ┌───┴───┐
                   │ PG +  │ │Redis │ │  S3   │
                   │Timesc.│ │      │ │(файлы)│
                   └───────┘ └──────┘ └───────┘
```

---

## Секреты и переменные окружения

| Переменная | Где используется | Обязательно |
|---|---|---|
| `DATABASE_URL` | Все 15 функций | ✅ Да |
| `MAIN_DB_SCHEMA` | dashboard-data, dashboard-messages, irida-database, irida-mrm, irida-shell | Нет (по умолчанию `public`) |
| `AWS_ACCESS_KEY_ID` | transcribe, dashboard-messages, service-requests | Для файлов/аудио |
| `AWS_SECRET_ACCESS_KEY` | transcribe, dashboard-messages, service-requests | Для файлов/аудио |
| `YANDEX_SPEECHKIT_KEY` | transcribe | Для транскрибации |
| `SECRET_KEY` | JWT сессии | ✅ Да |

---

## Бэкенд-функции (API роуты)

FastAPI-сервер (`server/main.py`) автоматически подхватывает все 15 функций из `/backend/` и создаёт роуты:

| Облачный URL (Поехали) | Self-hosted URL | Назначение |
|---|---|---|
| `functions.poehali.dev/eed2e5...` | `/api/dashboard-auth` | Авторизация диспетчеров |
| `functions.poehali.dev/9b521d...` | `/api/dashboard-data` | CRUD данных (маршруты, ТС, расписание) |
| `functions.poehali.dev/ec0123...` | `/api/dashboard-messages` | Мессенджер панели |
| `functions.poehali.dev/9ebe4d...` | `/api/dashboard-seed` | Инициализация демо-данных |
| `functions.poehali.dev/b5ce54...` | `/api/driver-auth` | Авторизация водителей (PIN) |
| `functions.poehali.dev/504848...` | `/api/driver-docs` | Документы для водителей |
| `functions.poehali.dev/1357aa...` | `/api/driver-manage` | Управление водителями |
| `functions.poehali.dev/29b782...` | `/api/driver-messages` | Сообщения водителей |
| `functions.poehali.dev/22cfaa...` | `/api/irida-database` | Управление БД (таблицы, CSV) |
| `functions.poehali.dev/9a4d89...` | `/api/irida-files` | Файловая система ИРИДА |
| `functions.poehali.dev/1cd76a...` | `/api/irida-mrm` | MRM-аккаунты планшетов |
| `functions.poehali.dev/e8230c...` | `/api/irida-shell` | Терминал ИРИДА |
| `functions.poehali.dev/49b1d7...` | `/api/service-requests` | Заявки на обслуживание |
| `functions.poehali.dev/be33a4...` | `/api/transcribe` | Транскрибация аудио |
| `functions.poehali.dev/4ed5fd...` | `/api/vehicle-diagnostics` | Диагностика ТС |

Health check: `GET /api/health`

---

## Переключение фронтенда

Фронтенд автоматически определяет режим через переменную `VITE_API_BASE_URL`:

- **Не задана** → используются облачные URL из `func2url.json` (Поехали)
- **Задана** → все запросы идут на `{VITE_API_BASE_URL}/api/{function-name}`

При сборке фронтенда для self-hosted:
```bash
VITE_API_BASE_URL=https://api.mysite.ru npm run build
```

Или в `.env` файле:
```
VITE_API_BASE_URL=https://api.mysite.ru
```

---

## Деплой в Dokploy

### 1. Создай проект в Dokploy

Добавь 3 сервиса:
- **PostgreSQL** — из шаблона Database
- **Backend (API)** — Docker из `server/Dockerfile`
- **Frontend** — Docker из `server/Dockerfile.frontend`

### 2. Настрой переменные окружения

В каждом сервисе Backend задай Environment Variables:
```
DATABASE_URL=postgresql://user:pass@postgres-host:5432/irida
MAIN_DB_SCHEMA=public
AWS_ACCESS_KEY_ID=твой_ключ
AWS_SECRET_ACCESS_KEY=твой_секрет
YANDEX_SPEECHKIT_KEY=твой_ключ
```

### 3. Настрой домен

В Dokploy: домен → привязать к фронтенд-сервису с проксированием `/api/*` на бэкенд.

---

## Управление

```bash
cd /opt/irida/server

# Статус
docker compose ps

# Логи
docker compose logs -f api

# Перезапуск
docker compose restart api

# Обновление
git pull
docker compose build --no-cache api frontend
docker compose up -d

# Бэкап БД
bash backup.sh
```

---

## Автоматические бэкапы

```bash
crontab -e
# Каждый день в 3:00
0 3 * * * /bin/bash /opt/irida/server/backup.sh >> /var/log/irida-backup.log 2>&1
```

### Восстановление
```bash
docker compose exec -T db pg_restore -U postgres -d tramdisp --clean < backups/irida_ДАТА.dump
```
