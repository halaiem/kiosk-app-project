# Деплой ТрамДиспетч на свой сервер

## Что в папке server/
```
server/
  main.py              — FastAPI обёртка (ваш API сервер)
  requirements.txt     — Python зависимости
  .env.example         — шаблон переменных окружения
  init-db.sql          — создание таблиц в БД
  Dockerfile           — контейнер для API
  docker-compose.yml   — запуск API + PostgreSQL
  nginx.conf           — конфиг Nginx
  DEPLOY-GUIDE.md      — эта инструкция
```

---

## Способ 1 — Docker (рекомендуется)

### Шаг 1: Склонируй репозиторий
```bash
git clone https://github.com/ВАШ-АККАУНТ/ВАШ-РЕПО.git
cd ВАШ-РЕПО
```

### Шаг 2: Настрой переменные
```bash
cp server/.env.example server/.env
nano server/.env
```
Укажи пароль БД:
```
DB_PASSWORD=твой_сильный_пароль
```

### Шаг 3: Запусти
```bash
cd server
docker-compose up -d
```
Готово! API работает на порту 8000.

### Шаг 4: Создай таблицы
```bash
docker exec -i server-db-1 psql -U postgres -d tramdisp < init-db.sql
```

### Шаг 5: Проверь
```bash
curl http://localhost:8000/api/health
# Ответ: {"status":"ok","service":"tramdisp-api"}
```

---

## Способ 2 — Без Docker

### Шаг 1: Установи зависимости
```bash
sudo apt update
sudo apt install python3.11 python3-pip postgresql nginx
```

### Шаг 2: Создай БД
```bash
sudo -u postgres createdb tramdisp
sudo -u postgres psql -d tramdisp -f server/init-db.sql
```

### Шаг 3: Настрой Python
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Шаг 4: Создай .env
```bash
cp .env.example .env
nano .env
```
```
DATABASE_URL=postgresql://postgres:ПАРОЛЬ@localhost:5432/tramdisp
```

### Шаг 5: Запусти API
```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Шаг 6: Автозапуск (systemd)
```bash
sudo nano /etc/systemd/system/tramdisp-api.service
```
```ini
[Unit]
Description=TramDisp API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/путь/к/проекту/server
Environment=PATH=/путь/к/проекту/server/venv/bin
ExecStart=/путь/к/проекту/server/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable tramdisp-api
sudo systemctl start tramdisp-api
```

---

## Фронтенд (React)

### Сборка
```bash
npm install
npm run build
```

### Деплой
```bash
sudo mkdir -p /var/www/tramdisp
sudo cp -r dist/* /var/www/tramdisp/
```

### Nginx
```bash
sudo cp server/nginx.conf /etc/nginx/sites-available/tramdisp
sudo ln -s /etc/nginx/sites-available/tramdisp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ВАЖНО: Замена URL в коде фронтенда

Фронтенд сейчас вызывает API по адресам из `func2url.json`:
```
driver-auth     → https://functions.poehali.dev/...
driver-manage   → https://functions.poehali.dev/...
driver-messages → https://functions.poehali.dev/...
```

На своём сервере замени на:
```
driver-auth     → /api/driver-auth
driver-manage   → /api/driver-manage
driver-messages → /api/driver-messages
```

Найди в коде файл, где читается `func2url.json`, и замени URL на относительные пути `/api/...`

---

## SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

---

## Supabase вместо локальной БД

1. Зарегистрируйся на supabase.com
2. Создай проект
3. Зайди в SQL Editor → вставь содержимое `init-db.sql` → Run
4. Скопируй DATABASE_URL из Settings → Database → Connection string
5. Вставь в `.env`:
```
DATABASE_URL=postgresql://postgres:ПАРОЛЬ@db.xxxx.supabase.co:5432/postgres
```
6. В `docker-compose.yml` удали сервис `db` — он больше не нужен
