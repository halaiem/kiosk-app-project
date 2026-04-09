-- Таблица настроек маршрутизации заявок (кто кому может отправлять)
CREATE TABLE service_request_routing (
  id SERIAL PRIMARY KEY,
  from_role VARCHAR(30) NOT NULL,
  to_role VARCHAR(30) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_role, to_role)
);

-- Дефолтные маршруты:
-- dispatcher → technician, mechanic, admin
-- technician → admin, mechanic, dispatcher
-- mechanic → technician, admin, dispatcher
-- admin → всем
INSERT INTO service_request_routing (from_role, to_role, is_enabled) VALUES
  ('dispatcher', 'technician', true),
  ('dispatcher', 'mechanic', true),
  ('dispatcher', 'admin', true),
  ('technician', 'admin', true),
  ('technician', 'mechanic', true),
  ('technician', 'dispatcher', true),
  ('mechanic', 'technician', true),
  ('mechanic', 'admin', true),
  ('mechanic', 'dispatcher', true),
  ('admin', 'dispatcher', true),
  ('admin', 'technician', true),
  ('admin', 'mechanic', true);

-- Добавляем target_role в service_requests
ALTER TABLE service_requests ADD COLUMN target_role VARCHAR(30);
