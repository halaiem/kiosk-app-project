
-- Add routing rules for new roles
INSERT INTO service_request_routing (from_role, to_role, is_enabled) VALUES
  ('engineer', 'dispatcher', true), ('engineer', 'technician', true), ('engineer', 'mechanic', true), ('engineer', 'admin', true), ('engineer', 'manager', true),
  ('manager', 'dispatcher', true), ('manager', 'technician', true), ('manager', 'mechanic', true), ('manager', 'admin', true), ('manager', 'engineer', true),
  ('dispatcher', 'engineer', true), ('dispatcher', 'manager', true),
  ('technician', 'engineer', true), ('technician', 'manager', true),
  ('mechanic', 'engineer', true), ('mechanic', 'manager', true),
  ('admin', 'engineer', true), ('admin', 'manager', true)
ON CONFLICT (from_role, to_role) DO NOTHING;
