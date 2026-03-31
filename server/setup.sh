#!/bin/bash
set -e

echo "========================================="
echo "  TramDispatch - Настройка VPS сервера"
echo "========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Запусти скрипт от root: sudo bash setup.sh"
  exit 1
fi

read -p "Введи доменное имя (например, disp.example.ru): " DOMAIN
read -p "Введи email для SSL-сертификата: " EMAIL
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
SECRET_KEY=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)

echo ""
echo ">>> 1/6 Обновляю систему..."
apt-get update && apt-get upgrade -y

echo ""
echo ">>> 2/6 Устанавливаю Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

echo ""
echo ">>> 3/6 Устанавливаю полезные утилиты..."
apt-get install -y git curl htop fail2ban ufw

echo ""
echo ">>> 4/6 Настраиваю файрвол..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

echo ""
echo ">>> 5/6 Клонирую проект и создаю .env..."
mkdir -p /opt/tramdisp
cd /opt/tramdisp

if [ ! -d ".git" ]; then
    read -p "URL Git-репозитория (или Enter чтобы пропустить): " GIT_URL
    if [ -n "$GIT_URL" ]; then
        git clone "$GIT_URL" .
    else
        echo "Скопируй файлы проекта в /opt/tramdisp вручную"
    fi
fi

cat > server/.env << EOF
DB_PASSWORD=${DB_PASSWORD}
SECRET_KEY=${SECRET_KEY}
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
ENVIRONMENT=production
EOF

echo ""
echo ">>> 6/6 Получаю SSL-сертификат и запускаю..."

cd /opt/tramdisp/server

sed -i "s/\${DOMAIN}/${DOMAIN}/g" nginx.conf

docker compose up -d db redis
echo "Жду запуска БД..."
sleep 10

docker compose up -d api frontend

docker run --rm \
    -v tramdisp_certbot-conf:/etc/letsencrypt \
    -v tramdisp_certbot-www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

docker compose restart frontend

docker compose up -d certbot

echo ""
echo "========================================="
echo "  Готово! Сервер настроен"
echo "========================================="
echo ""
echo "  Домен:    https://${DOMAIN}"
echo "  БД:       PostgreSQL + TimescaleDB"
echo "  Кэш:     Redis"
echo "  SSL:      Let's Encrypt (авто-обновление)"
echo ""
echo "  Пароль БД: ${DB_PASSWORD}"
echo "  (сохрани в надёжное место!)"
echo ""
echo "  Файлы:    /opt/tramdisp/"
echo "  Логи:     docker compose -f /opt/tramdisp/server/docker-compose.yml logs -f"
echo ""
echo "========================================="
