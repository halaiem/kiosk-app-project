ALTER TABLE drivers ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;
UPDATE drivers SET employee_id = LPAD(id::TEXT, 4, '0') WHERE employee_id IS NULL;
ALTER TABLE drivers ALTER COLUMN employee_id SET NOT NULL;