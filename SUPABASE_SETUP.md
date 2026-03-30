# Настройка Supabase для проекта

## Шаг 1. Создать проект на Supabase

1. Зайди на [supabase.com](https://supabase.com) → New Project
2. Запомни: **Project URL** и **anon public key** (Settings → API)
3. Вставь их в `src/lib/supabase.ts` вместо `ВАШ-ПРОЕКТ` и `ВАШ-ANON-KEY`

## Шаг 2. Создать таблицы

Открой: **Supabase → SQL Editor → New query** → вставь SQL ниже → нажми **Run**

```sql
-- ─────────────────────────────────────────────────
-- 1. ПОЛЬЗОВАТЕЛИ ДАШБОРДА (диспетчеры, техники, администраторы)
-- ─────────────────────────────────────────────────
CREATE TABLE dashboard_users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('dispatcher', 'technician', 'admin')),
  password_hash TEXT NOT NULL,
  avatar_url  TEXT,
  last_login  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Начальные пользователи (пароли: disp123, tech123, admin123)
INSERT INTO dashboard_users (id, name, role, password_hash, is_active) VALUES
  ('D001', 'Иванов Дмитрий',    'dispatcher', 'disp123', true),
  ('D002', 'Смирнова Елена',    'dispatcher', 'disp123', true),
  ('T001', 'Петров Алексей',    'technician', 'tech123', true),
  ('T002', 'Козлова Марина',    'technician', 'tech123', true),
  ('A001', 'Администратор',     'admin',      'admin123', true);


-- ─────────────────────────────────────────────────
-- 2. ВОДИТЕЛИ (для планшетного киоска)
-- ─────────────────────────────────────────────────
CREATE TABLE drivers (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  tab_number   TEXT NOT NULL UNIQUE,
  pin          TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'off_shift'
               CHECK (status IN ('on_shift', 'off_shift', 'break', 'sick')),
  vehicle_number TEXT NOT NULL DEFAULT '',
  route_number   TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  rating         NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  shift_start    TIMESTAMPTZ,
  shift_end      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Тестовые водители
INSERT INTO drivers (name, tab_number, pin, vehicle_number, route_number, phone, rating) VALUES
  ('Тестовый Водитель 1', '10001', '1234', 'ТС-101', '17',  '+7 900 000-01-01', 4.8),
  ('Тестовый Водитель 2', '10002', '5678', 'ТС-102', '17К', '+7 900 000-01-02', 4.6),
  ('Тестовый Водитель 3', '10003', '0000', 'ТС-103', '53',  '+7 900 000-01-03', 4.9);


-- ─────────────────────────────────────────────────
-- 3. ТРАНСПОРТНЫЕ СРЕДСТВА
-- ─────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number            TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL CHECK (type IN ('tram', 'trolleybus', 'bus')),
  status            TEXT NOT NULL DEFAULT 'idle'
                    CHECK (status IN ('active', 'maintenance', 'idle', 'offline')),
  route_number      TEXT NOT NULL DEFAULT '',
  driver_name       TEXT NOT NULL DEFAULT '',
  last_maintenance  DATE NOT NULL DEFAULT now(),
  next_maintenance  DATE NOT NULL DEFAULT (now() + interval '90 days'),
  mileage           INTEGER NOT NULL DEFAULT 0,
  lat               NUMERIC(10,7),
  lng               NUMERIC(10,7),
  speed             NUMERIC(5,1) DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────
-- 4. МАРШРУТЫ
-- ─────────────────────────────────────────────────
CREATE TABLE routes (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number            TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  stops_count       INTEGER NOT NULL DEFAULT 0,
  distance          NUMERIC(6,2) NOT NULL DEFAULT 0,
  avg_time          INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  assigned_vehicles INTEGER NOT NULL DEFAULT 0,
  route_status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (route_status IN ('active','route_change','temp_route','route_extension','suspended','planned')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO routes (number, name, stops_count, distance, avg_time, is_active, route_status) VALUES
  ('17',  'Ул. Садовая — Площадь Победы',   24, 12.5, 45, true, 'active'),
  ('17К', 'Ул. Садовая — Купчино (кор.)',    18, 9.0,  35, true, 'active'),
  ('53',  'Финляндский вокзал — Ладожская',  31, 16.8, 60, true, 'active');


-- ─────────────────────────────────────────────────
-- 5. СООБЩЕНИЯ (диспетчер ↔ водитель)
-- ─────────────────────────────────────────────────
CREATE TABLE dispatch_messages (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  driver_id      TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  driver_name    TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  route_number   TEXT NOT NULL,
  text           TEXT NOT NULL,
  direction      TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  type           TEXT NOT NULL DEFAULT 'normal'
                 CHECK (type IN ('normal', 'urgent', 'system')),
  is_read        BOOLEAN NOT NULL DEFAULT false,
  confirmed      BOOLEAN NOT NULL DEFAULT false,
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_driver_id ON dispatch_messages(driver_id);
CREATE INDEX idx_messages_created_at ON dispatch_messages(created_at DESC);


-- ─────────────────────────────────────────────────
-- 6. УВЕДОМЛЕНИЯ
-- ─────────────────────────────────────────────────
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  level       TEXT NOT NULL DEFAULT 'info'
              CHECK (level IN ('info', 'warning', 'critical')),
  target_role TEXT NOT NULL DEFAULT 'all',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────
-- 7. АЛЕРТЫ / ИНЦИДЕНТЫ
-- ─────────────────────────────────────────────────
CREATE TABLE alerts (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  driver_id      TEXT NOT NULL,
  driver_name    TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  route_number   TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('sos','breakdown','delay','deviation','speeding')),
  message        TEXT NOT NULL,
  level          TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','critical')),
  resolved       BOOLEAN NOT NULL DEFAULT false,
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_resolved ON alerts(resolved);


-- ─────────────────────────────────────────────────
-- 8. ДОКУМЕНТЫ
-- ─────────────────────────────────────────────────
CREATE TABLE documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('route_sheet','maintenance_report','schedule','instruction','license')),
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','review','approved','expired')),
  author      TEXT NOT NULL,
  assigned_to TEXT,
  file_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────
-- 9. РАСПИСАНИЕ
-- ─────────────────────────────────────────────────
CREATE TABLE schedule (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  route_number   TEXT NOT NULL,
  driver_name    TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  start_time     TEXT NOT NULL,
  end_time       TEXT NOT NULL,
  date           DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'planned'
                 CHECK (status IN ('planned','active','completed','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_date ON schedule(date);


-- ─────────────────────────────────────────────────
-- 10. СЕССИИ ВОДИТЕЛЕЙ (токены для планшета)
-- ─────────────────────────────────────────────────
CREATE TABLE driver_sessions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  driver_id  TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '12 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────
-- 11. ЛОГ АУДИТА
-- ─────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL,
  user_name  TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);


-- ─────────────────────────────────────────────────
-- 12. НАСТРОЙКИ ПРИЛОЖЕНИЯ (одна строка)
-- ─────────────────────────────────────────────────
CREATE TABLE app_settings (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  carrier_name         TEXT NOT NULL DEFAULT 'ГУП «Горэлектротранс»',
  carrier_logo         TEXT,
  carrier_description  TEXT DEFAULT '',
  city                 TEXT NOT NULL DEFAULT 'spb',
  transport_type       TEXT NOT NULL DEFAULT 'tram',
  settings_json        JSONB NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Одна строка настроек
INSERT INTO app_settings (id, carrier_name) VALUES (1, 'ГУП «Горэлектротранс»')
ON CONFLICT (id) DO NOTHING;
```

## Шаг 3. Включить Real-time (для живых сообщений и алертов)

В Supabase: **Database → Replication → Tables**  
Включи переключатели для таблиц:
- `dispatch_messages`
- `alerts`
- `notifications`

## Шаг 4. Установить пакет в проекте

```bash
npm install @supabase/supabase-js
```

## Шаг 5. Использование в коде

```typescript
import { supabase, driversApi, messagesApi, alertsApi } from '@/lib/supabase'

// Получить всех водителей
const { data: drivers, error } = await driversApi.getAll()

// Отправить сообщение
await messagesApi.send({
  driver_id: 'uuid',
  driver_name: 'Иванов',
  vehicle_number: 'ТС-101',
  route_number: '17',
  text: 'Выйдите на конечную',
  direction: 'outgoing',
  type: 'urgent',
  is_read: false,
  confirmed: false,
})

// Подписаться на новые алерты в реальном времени
const channel = alertsApi.subscribe((newAlert) => {
  console.log('Новый алерт:', newAlert)
})

// Отписаться
supabase.removeChannel(channel)
```

## Таблицы и их назначение

| Таблица | Назначение |
|---|---|
| `dashboard_users` | Диспетчеры, техники, администраторы |
| `drivers` | Водители (вход через планшет) |
| `vehicles` | Трамваи, троллейбусы, автобусы |
| `routes` | Маршруты |
| `dispatch_messages` | Переписка диспетчер ↔ водитель |
| `notifications` | Уведомления для ролей |
| `alerts` | Инциденты (SOS, поломки, опоздания) |
| `documents` | Маршрутные листы, инструкции |
| `schedule` | Расписание смен |
| `driver_sessions` | Токены входа с планшета |
| `audit_logs` | История действий пользователей |
| `app_settings` | Настройки компании-перевозчика |
