
ALTER TABLE dashboard_users DROP CONSTRAINT IF EXISTS dashboard_users_role_check;
ALTER TABLE dashboard_users ADD CONSTRAINT dashboard_users_role_check
  CHECK (role IN ('dispatcher', 'technician', 'admin', 'mechanic', 'irida_tools', 'engineer', 'manager'));

INSERT INTO dashboard_users (employee_id, full_name, role, password_hash, phone)
VALUES
  ('ENG001', 'Петров Алексей Сергеевич', 'engineer', encode(sha256(convert_to('engineer123', 'UTF8')), 'hex'), '+79001234567'),
  ('MGR001', 'Сидорова Елена Владимировна', 'manager', encode(sha256(convert_to('manager123', 'UTF8')), 'hex'), '+79002345678');
