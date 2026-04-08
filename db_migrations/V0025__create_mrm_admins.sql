CREATE TABLE t_p25163990_kiosk_app_project.mrm_admins (
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

CREATE INDEX idx_mrm_admins_login ON t_p25163990_kiosk_app_project.mrm_admins(login);
