-- ============================================================================
-- ИРИДА (IRIDA) — Полная инициализация базы данных PostgreSQL 16
-- ============================================================================
--
-- Этот файл создаёт ВСЕ таблицы и индексы проекта ИРИДА на чистом PostgreSQL.
-- Предназначен для развёртывания на собственном сервере (self-hosted).
--
-- Важно:
--   - Все таблицы создаются в схеме public (без префикса схемы).
--   - TimescaleDB-таблицы (vehicle_telemetry, vehicle_events) НЕ включены —
--     они создаются отдельно через init-timescale.sql.
--   - Seed-данные (пользователи, маршруты, ТС) НЕ включены —
--     они создаются через функцию dashboard-seed.
--   - Используется CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
--     для безопасного повторного запуска.
--
-- Запуск:
--   psql -U postgres -d tramdisp -f init-db.sql
--
-- Порядок таблиц определяется зависимостями (FK): сначала родительские таблицы.
-- Собрано из миграций V0001–V0047 + таблицы, добавленные в production.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. organizations — организации (корневая таблица)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. accounts — учётные записи (привязаны к организации)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    access_level VARCHAR(20) NOT NULL DEFAULT 'viewer'
        CHECK (access_level IN ('admin', 'dispatcher', 'driver', 'viewer')),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_access ON accounts(access_level);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. drivers — водители
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    pin TEXT NOT NULL UNIQUE,
    employee_id TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL DEFAULT 'tram',
    vehicle_number TEXT NOT NULL DEFAULT '001',
    route_number TEXT NOT NULL DEFAULT '5',
    shift_start TIME NOT NULL DEFAULT '08:00',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- V0013: статус смены, рейтинг, телефон
    phone VARCHAR(30),
    shift_status VARCHAR(20) DEFAULT 'off_shift'
        CHECK (shift_status IN ('on_shift', 'off_shift', 'break', 'sick')),
    rating NUMERIC(2,1) DEFAULT 4.5,
    -- V0019: расширенные статусы водителя
    driver_status VARCHAR(20) NOT NULL DEFAULT 'active',
    status_changed_at TIMESTAMPTZ,
    status_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON drivers(employee_id);
CREATE INDEX IF NOT EXISTS idx_drivers_pin ON drivers(pin);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. driver_sessions — сессии водителей (авторизация + геолокация)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_sessions (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    session_token TEXT NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_online BOOLEAN NOT NULL DEFAULT false,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON driver_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_driver ON driver_sessions(driver_id, is_online);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. dashboard_users — персонал дашборда (диспетчеры, техники, механики, админы)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'dispatcher', 'technician', 'mechanic')),
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Рейтинг сотрудника (обновляется из user_ratings)
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0
);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. dashboard_sessions — сессии дашборда
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES dashboard_users(id),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_token ON dashboard_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_user ON dashboard_sessions(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. messages — сообщения водитель <-> диспетчер (киоск/legacy)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    sender VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    message_type VARCHAR(30) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    -- V0012: доставка и привязка клиента
    delivered_at TIMESTAMP,
    client_id VARCHAR(50),
    -- V0013: кто из диспетчеров отправил
    dispatcher_id INTEGER REFERENCES dashboard_users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_driver ON messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages(driver_id, delivered_at)
    WHERE delivered_at IS NULL AND sender = 'dispatcher';
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id)
    WHERE client_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. routes — маршруты
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    route_number VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    transport_type VARCHAR(20) NOT NULL DEFAULT 'bus'
        CHECK (transport_type IN ('tram', 'trolleybus', 'bus', 'electrobus', 'technical')),
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- V0013: расстояние, время, статус маршрута
    distance_km NUMERIC(6,1) DEFAULT 0,
    avg_time_min INTEGER DEFAULT 0,
    route_status VARCHAR(20) DEFAULT 'active'
        CHECK (route_status IN ('active', 'route_change', 'temp_route', 'route_extension', 'suspended', 'planned'))
);

CREATE INDEX IF NOT EXISTS idx_routes_org ON routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(transport_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 9. stops — остановки
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    address TEXT,
    has_shelter BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stops_coords ON stops(lat, lng);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. route_stops — привязка остановок к маршрутам
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id),
    stop_id UUID NOT NULL REFERENCES stops(id),
    order_index INT NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'forward'
        CHECK (direction IN ('forward', 'backward')),
    avg_travel_sec INT DEFAULT 0,
    UNIQUE(route_id, stop_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop ON route_stops(stop_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 11. vehicles — транспортные средства
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    label VARCHAR(50) NOT NULL,
    transport_type VARCHAR(20) NOT NULL DEFAULT 'bus'
        CHECK (transport_type IN ('tram', 'trolleybus', 'bus', 'electrobus', 'technical')),
    license_plate VARCHAR(20),
    model VARCHAR(100),
    capacity INT,
    manufacture_year INT,
    transport_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (transport_status IN ('active', 'maintenance', 'decommissioned', 'idle', 'offline')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- V0013: пробег, обслуживание, привязки
    mileage INTEGER DEFAULT 0,
    last_maintenance_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    assigned_route_id UUID REFERENCES routes(id),
    assigned_driver_id INTEGER REFERENCES drivers(id),
    -- V0018: расширенные поля карточки ТС
    vin_number VARCHAR(17),
    board_number VARCHAR(20),
    gov_reg_number VARCHAR(20),
    manufacturer VARCHAR(100),
    reg_certificate_number VARCHAR(50),
    documents_info TEXT,
    fuel_type VARCHAR(30),
    color VARCHAR(30),
    passenger_capacity INT,
    is_accessible BOOLEAN DEFAULT false,
    insurance_number VARCHAR(50),
    insurance_expiry DATE,
    tech_inspection_expiry DATE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(transport_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(transport_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin_number) WHERE vin_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_board_number ON vehicles(board_number) WHERE board_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_gov_reg ON vehicles(gov_reg_number) WHERE gov_reg_number IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 12. documents — документы (маршрутные листы, акты ТО, расписания и пр.)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    doc_type VARCHAR(30) NOT NULL
        CHECK (doc_type IN ('route_sheet', 'maintenance_report', 'schedule', 'instruction', 'license')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'review', 'approved', 'expired')),
    author_id INTEGER REFERENCES dashboard_users(id),
    assigned_to_driver_id INTEGER REFERENCES drivers(id),
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 13. assignments — назначения (ТС + маршрут + водитель + смена)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    driver_id INTEGER REFERENCES drivers(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ,
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (assignment_status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- V0019: привязка документа и тип смены
    document_id INTEGER REFERENCES documents(id),
    shift_type VARCHAR(20) NOT NULL DEFAULT 'regular',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_route ON assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver ON assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_assignments_shift ON assignments(shift_start, shift_end);

-- ────────────────────────────────────────────────────────────────────────────
-- 14. assignment_templates — шаблоны назначений
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    rows JSONB NOT NULL DEFAULT '[]',
    created_by INTEGER REFERENCES dashboard_users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_templates_created_by ON assignment_templates(created_by);

-- ────────────────────────────────────────────────────────────────────────────
-- 15. incidents — инциденты
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    vehicle_id UUID REFERENCES vehicles(id),
    route_id UUID REFERENCES routes(id),
    incident_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (incident_type IN ('delay', 'breakdown', 'accident', 'detour', 'other')),
    severity VARCHAR(10) NOT NULL DEFAULT 'low'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 16. settings — настройки организации
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    updated_by UUID REFERENCES accounts(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_settings_org ON settings(organization_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 17. audit_logs — журнал аудита
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES dashboard_users(id),
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 18. trip_summary — сводка рейсов
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    route_id UUID NOT NULL,
    driver_id UUID,
    organization_id INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    total_km REAL DEFAULT 0,
    avg_speed REAL DEFAULT 0,
    max_speed REAL DEFAULT 0,
    stops_visited SMALLINT DEFAULT 0,
    delay_minutes REAL DEFAULT 0,
    passengers_max SMALLINT DEFAULT 0,
    trip_status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (trip_status IN ('in_progress', 'completed', 'interrupted', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_trip_org_route ON trip_summary(organization_id, route_id);
CREATE INDEX IF NOT EXISTS idx_trip_vehicle ON trip_summary(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_started ON trip_summary(started_at);
CREATE INDEX IF NOT EXISTS idx_trip_status ON trip_summary(trip_status);

-- ────────────────────────────────────────────────────────────────────────────
-- 19. vehicle_diagnostic_apis — API-источники диагностики ТС
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_diagnostic_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    api_name VARCHAR(100) NOT NULL,
    api_type VARCHAR(50) NOT NULL DEFAULT 'fema',
    api_url TEXT NOT NULL,
    api_key TEXT,
    poll_interval_sec INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_diagnostic_apis_vehicle ON vehicle_diagnostic_apis(vehicle_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 20. vehicle_diagnostics — результаты диагностики ТС
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_id UUID REFERENCES routes(id),
    api_source_id UUID REFERENCES vehicle_diagnostic_apis(id),
    check_code VARCHAR(50) NOT NULL,
    check_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    short_description TEXT,
    full_description TEXT,
    raw_data JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_diagnostics_vehicle ON vehicle_diagnostics(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_diagnostics_severity ON vehicle_diagnostics(severity);
CREATE INDEX IF NOT EXISTS idx_vehicle_diagnostics_status ON vehicle_diagnostics(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_diagnostics_detected ON vehicle_diagnostics(detected_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 21. vehicle_issue_reports — отчёты о проблемах ТС (от водителя)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    route_id UUID REFERENCES routes(id),
    diagnostic_id UUID REFERENCES vehicle_diagnostics(id),
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    report_status VARCHAR(20) NOT NULL DEFAULT 'new',
    dispatcher_notified BOOLEAN NOT NULL DEFAULT false,
    technician_notified BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES dashboard_users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_issue_reports_vehicle ON vehicle_issue_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_issue_reports_status ON vehicle_issue_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_issue_reports_driver ON vehicle_issue_reports(driver_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 22. dispatcher_ratings — оценки диспетчера водителем (при завершении смены)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispatcher_ratings (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    session_token TEXT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 23. driver_new_docs — новые документы для водителей (push-уведомления)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_new_docs (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('schedule', 'document', 'instruction', 'other')),
    content TEXT,
    file_size VARCHAR(20) DEFAULT '',
    created_by INTEGER REFERENCES dashboard_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    opened_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_confirmed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_driver_new_docs_driver_id ON driver_new_docs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_new_docs_confirmed ON driver_new_docs(is_confirmed);

-- ────────────────────────────────────────────────────────────────────────────
-- 24. irida_project_files — файлы проекта (код/конфигурации, хранение в БД)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS irida_project_files (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 25. mrm_admins — администраторы MRM (киоск-режим планшетов)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mrm_admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    kiosk_exit_password VARCHAR(100) NOT NULL,
    admin_pin VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    last_tablet_ip VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mrm_admins_login ON mrm_admins(login);

-- ────────────────────────────────────────────────────────────────────────────
-- 26. chats — чаты мессенджера дашборда
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    created_by INTEGER NOT NULL REFERENCES dashboard_users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    last_message_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    -- V0031: тип чата по умолчанию (message / notification)
    default_type VARCHAR(20) NOT NULL DEFAULT 'message'
);

CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(last_message_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 27. chat_members — участники чатов
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_members (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES chats(id),
    user_id INTEGER REFERENCES dashboard_users(id),
    driver_id INTEGER REFERENCES drivers(id),
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT now(),
    last_read_at TIMESTAMP DEFAULT now(),
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP,
    UNIQUE(chat_id, user_id),
    CHECK (
        (user_id IS NOT NULL AND driver_id IS NULL) OR
        (user_id IS NULL AND driver_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_driver ON chat_members(driver_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 28. chat_messages — сообщения в чатах
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES chats(id),
    sender_user_id INTEGER REFERENCES dashboard_users(id),
    sender_driver_id INTEGER REFERENCES drivers(id),
    content TEXT NOT NULL,
    subject VARCHAR(255),
    created_at TIMESTAMP DEFAULT now(),
    is_read BOOLEAN DEFAULT false,
    -- V0028: статус доставки
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    -- V0029: закреплённые сообщения
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    pinned_at TIMESTAMPTZ,
    pinned_by INTEGER REFERENCES dashboard_users(id),
    -- V0031: тип сообщения (message / notification)
    message_type VARCHAR(20) NOT NULL DEFAULT 'message',
    CHECK (
        (sender_user_id IS NOT NULL AND sender_driver_id IS NULL) OR
        (sender_user_id IS NULL AND sender_driver_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_user ON chat_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON chat_messages(chat_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 29. chat_files — файлы, прикреплённые к сообщениям
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_files (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES chat_messages(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 30. chat_reactions — реакции на сообщения (эмодзи)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES chat_messages(id),
    user_id INTEGER REFERENCES dashboard_users(id),
    driver_id INTEGER REFERENCES drivers(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(message_id, user_id, emoji),
    CHECK (
        (user_id IS NOT NULL AND driver_id IS NULL) OR
        (user_id IS NULL AND driver_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 31. chat_visibility_rules — правила видимости чатов между ролями
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_visibility_rules (
    id SERIAL PRIMARY KEY,
    from_role VARCHAR(30) NOT NULL,
    visible_to_role VARCHAR(30) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(from_role, visible_to_role)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 32. filter_presets — пресеты фильтров пользователя (мессенджер)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS filter_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON filter_presets(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 33. service_requests — заявки на обслуживание/ремонт ТС
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_label VARCHAR(50),
    source VARCHAR(30) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'dispatcher', 'technician', 'mechanic', 'diagnostic', 'fema', 'onboard')),
    source_type VARCHAR(30) NOT NULL DEFAULT 'request'
        CHECK (source_type IN ('request', 'notification', 'message', 'document', 'diagnostic')),
    created_by_user_id INTEGER REFERENCES dashboard_users(id),
    created_by_role VARCHAR(30),
    assigned_to_user_id INTEGER REFERENCES dashboard_users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'needs_info')),
    category VARCHAR(50),
    equipment_info TEXT,
    diagnostic_code VARCHAR(50),
    resolved_by_name VARCHAR(255),
    resolved_by_position VARCHAR(100),
    resolved_by_employee_id VARCHAR(50),
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    -- V0044: целевая роль для маршрутизации
    target_role VARCHAR(30)
);

CREATE INDEX IF NOT EXISTS idx_sr_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_vehicle ON service_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sr_assigned ON service_requests(assigned_to_user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 34. service_logs — журнал действий по заявкам (аудит заявок)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(id),
    user_id INTEGER REFERENCES dashboard_users(id),
    user_name VARCHAR(255),
    user_role VARCHAR(30),
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    comment TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sl_request ON service_logs(request_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 35. service_request_routing — настройки маршрутизации заявок между ролями
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_request_routing (
    id SERIAL PRIMARY KEY,
    from_role VARCHAR(30) NOT NULL,
    to_role VARCHAR(30) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(from_role, to_role)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 36. ts_documents — техническая документация ТС (паспорта, инструкции)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_documents (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_model VARCHAR(100),
    manufacturer VARCHAR(100),
    doc_type VARCHAR(50) NOT NULL DEFAULT 'manual'
        CHECK (doc_type IN ('manual', 'passport', 'license', 'certificate', 'instruction', 'scheme', 'spare_parts', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_mime VARCHAR(100),
    tags TEXT[],
    uploaded_by INTEGER REFERENCES dashboard_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsd_vehicle ON ts_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tsd_model ON ts_documents(vehicle_model);

-- ────────────────────────────────────────────────────────────────────────────
-- 37. external_emails — исходящие email (отправка техподдержке/заводу)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_emails (
    id SERIAL PRIMARY KEY,
    sent_by INTEGER REFERENCES dashboard_users(id),
    sent_by_name VARCHAR(255),
    sent_by_role VARCHAR(30),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_org VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    request_id INTEGER REFERENCES service_requests(id),
    vehicle_id UUID REFERENCES vehicles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 38. message_templates — шаблоны быстрых сообщений
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    target_role VARCHAR(30) NOT NULL DEFAULT 'driver',
    target_scope VARCHAR(30) NOT NULL DEFAULT 'dashboard',
    category VARCHAR(50),
    icon VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 39. notification_templates — шаблоны уведомлений (включая гео-привязку)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    icon VARCHAR(50),
    target_roles TEXT[] NOT NULL DEFAULT '{}',
    geo_lat DOUBLE PRECISION,
    geo_lng DOUBLE PRECISION,
    geo_radius_km NUMERIC(10,3),
    geo_city VARCHAR(100),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 40. motivation_phrases — мотивационные фразы (показываются при выходе)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motivation_phrases (
    id SERIAL PRIMARY KEY,
    phrase TEXT NOT NULL,
    target_role VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 41. user_ratings — оценки сотрудников/водителей друг другом
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rater_user_id INTEGER REFERENCES dashboard_users(id),
    rater_driver_id INTEGER REFERENCES drivers(id),
    rater_role VARCHAR(30),
    target_user_id INTEGER REFERENCES dashboard_users(id),
    target_driver_id INTEGER REFERENCES drivers(id),
    target_role VARCHAR(30),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ratings_target_user ON user_ratings(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_target_driver ON user_ratings(target_driver_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_user ON user_ratings(rater_user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 42. geo_zones — гео-зоны (круг, полигон, линия, маркер)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geo_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('circle', 'polygon', 'line', 'marker')),
    coordinates JSONB NOT NULL DEFAULT '[]',
    radius_km NUMERIC(10,3),
    color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'entry'
        CHECK (trigger_type IN ('entry', 'exit', 'nearby')),
    nearby_distance_km NUMERIC(10,3),
    notification_template_id INTEGER REFERENCES notification_templates(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 43. geo_zone_events — события срабатывания гео-зон
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geo_zone_events (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    driver_name VARCHAR(255),
    zone_id INTEGER NOT NULL,
    zone_name VARCHAR(255),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit', 'nearby')),
    notification_template_id INTEGER,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km NUMERIC(10,3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_zone_events_driver ON geo_zone_events(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_zone_events_zone ON geo_zone_events(zone_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- Последовательность для нумерации заявок
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'service_request_number_seq') THEN
        CREATE SEQUENCE service_request_number_seq START 1;
    END IF;
END
$$;

-- ============================================================================
-- Готово. Все таблицы созданы.
-- Следующие шаги:
--   1. Запустить init-timescale.sql (если используется TimescaleDB)
--   2. Запустить dashboard-seed для создания начальных данных
-- ============================================================================
