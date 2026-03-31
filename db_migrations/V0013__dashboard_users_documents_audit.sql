
-- Таблица персонала dashboard (диспетчеры, техники, админы)
CREATE TABLE IF NOT EXISTS dashboard_users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('dispatcher', 'technician', 'admin')),
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица сессий dashboard
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

-- Таблица документов
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    doc_type VARCHAR(30) NOT NULL CHECK (doc_type IN ('route_sheet', 'maintenance_report', 'schedule', 'instruction', 'license')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'expired')),
    author_id INTEGER REFERENCES dashboard_users(id),
    assigned_to_driver_id INTEGER REFERENCES drivers(id),
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);

-- Таблица аудит-логов
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

-- Добавить dispatcher_id в messages чтобы знать кто отправил
ALTER TABLE messages ADD COLUMN IF NOT EXISTS dispatcher_id INTEGER REFERENCES dashboard_users(id);

-- Добавить mileage и next_maintenance в vehicles (если пустые)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_maintenance_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_maintenance_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS assigned_route_id UUID REFERENCES routes(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS assigned_driver_id INTEGER REFERENCES drivers(id);

-- Добавить поля в drivers для статуса смены и рейтинга
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS shift_status VARCHAR(20) DEFAULT 'off_shift' CHECK (shift_status IN ('on_shift', 'off_shift', 'break', 'sick'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 4.5;

-- Добавить distance и avg_time в routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,1) DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS avg_time_min INTEGER DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_status VARCHAR(20) DEFAULT 'active' CHECK (route_status IN ('active', 'route_change', 'temp_route', 'route_extension', 'suspended', 'planned'));
