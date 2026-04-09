
-- Расширяем CHECK constraint для role: добавляем personnel
ALTER TABLE dashboard_users DROP CONSTRAINT IF EXISTS dashboard_users_role_check;
ALTER TABLE dashboard_users ADD CONSTRAINT dashboard_users_role_check
  CHECK (role IN ('admin', 'dispatcher', 'technician', 'personnel'));
