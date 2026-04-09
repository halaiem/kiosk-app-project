-- ═══════════════════════════════════════════════════════════════
-- Заявки на обслуживание/ремонт ТС
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE service_requests (
  id SERIAL PRIMARY KEY,
  request_number VARCHAR(20) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_label VARCHAR(50),
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  source_type VARCHAR(30) NOT NULL DEFAULT 'request',
  created_by_user_id INTEGER REFERENCES dashboard_users(id),
  created_by_role VARCHAR(30),
  assigned_to_user_id INTEGER REFERENCES dashboard_users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  category VARCHAR(50),
  equipment_info TEXT,
  diagnostic_code VARCHAR(50),
  resolved_by_name VARCHAR(255),
  resolved_by_position VARCHAR(100),
  resolved_by_employee_id VARCHAR(50),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT sr_priority_check CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT sr_status_check CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'needs_info')),
  CONSTRAINT sr_source_check CHECK (source IN ('manual', 'dispatcher', 'technician', 'mechanic', 'diagnostic', 'fema', 'onboard')),
  CONSTRAINT sr_source_type_check CHECK (source_type IN ('request', 'notification', 'message', 'document', 'diagnostic'))
);

CREATE INDEX idx_sr_status ON service_requests(status);
CREATE INDEX idx_sr_vehicle ON service_requests(vehicle_id);
CREATE INDEX idx_sr_assigned ON service_requests(assigned_to_user_id);

-- ═══════════════════════════════════════════════════════════════
-- Журнал действий по заявкам (аудит)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE service_logs (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sl_request ON service_logs(request_id);

-- ═══════════════════════════════════════════════════════════════
-- Документация ТС (паспорта, инструкции, лицензии)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE ts_documents (
  id SERIAL PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_model VARCHAR(100),
  manufacturer VARCHAR(100),
  doc_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_mime VARCHAR(100),
  tags TEXT[],
  uploaded_by INTEGER REFERENCES dashboard_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tsd_type_check CHECK (doc_type IN ('manual', 'passport', 'license', 'certificate', 'instruction', 'scheme', 'spare_parts', 'other'))
);

CREATE INDEX idx_tsd_vehicle ON ts_documents(vehicle_id);
CREATE INDEX idx_tsd_model ON ts_documents(vehicle_model);

-- ═══════════════════════════════════════════════════════════════
-- Внешние email (отправка техподдержке/заводу)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE external_emails (
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
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ee_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- ═══════════════════════════════════════════════════════════════
-- Счётчик номеров заявок
-- ═══════════════════════════════════════════════════════════════
CREATE SEQUENCE service_request_number_seq START 1;
