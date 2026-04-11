
-- 1. Add ticket_comments table for dialog messages
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(id),
    user_id INTEGER REFERENCES dashboard_users(id),
    user_name VARCHAR(255),
    user_role VARCHAR(30),
    message TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tc_request ON ticket_comments(request_id);

-- 2. Add ticket_notifications table
CREATE TABLE IF NOT EXISTS ticket_notifications (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(id),
    user_id INTEGER NOT NULL REFERENCES dashboard_users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tn_user ON ticket_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tn_request ON ticket_notifications(request_id);

-- 3. Add ticket_settings table for admin config
CREATE TABLE IF NOT EXISTS ticket_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add columns to service_requests for expanded lifecycle
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS forwarded_from_role VARCHAR(30);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS forwarded_from_user_id INTEGER REFERENCES dashboard_users(id);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;

-- 5. Insert default ticket settings
INSERT INTO ticket_settings (key, value) VALUES 
    ('number_prefixes', '{"dispatcher": "ДИС", "technician": "ТЕХ", "mechanic": "МЕХ", "admin": "АДМ"}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO ticket_settings (key, value) VALUES 
    ('ticket_types', '["Ремонт", "Обслуживание", "Диагностика", "Замена", "Проверка", "Другое"]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO ticket_settings (key, value) VALUES 
    ('ticket_categories', '["Двигатель", "Тормоза", "Электрика", "Кузов", "Шасси", "Салон", "Оборудование", "Другое"]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO ticket_settings (key, value) VALUES 
    ('processing_time', '{"low": 72, "normal": 48, "high": 24, "critical": 4}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO ticket_settings (key, value) VALUES 
    ('priority_colors', '{"low": "#71717a", "normal": "#3b82f6", "high": "#f97316", "critical": "#ef4444"}')
ON CONFLICT (key) DO NOTHING;
