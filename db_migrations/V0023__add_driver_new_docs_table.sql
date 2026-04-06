CREATE TABLE IF NOT EXISTS t_p25163990_kiosk_app_project.driver_new_docs (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.drivers(id),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('schedule', 'document', 'instruction', 'other')),
  content TEXT,
  file_size VARCHAR(20) DEFAULT '—',
  created_by INTEGER REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_confirmed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_driver_new_docs_driver_id ON t_p25163990_kiosk_app_project.driver_new_docs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_new_docs_confirmed ON t_p25163990_kiosk_app_project.driver_new_docs(is_confirmed);
