-- Add extended vehicle fields for full vehicle card management
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin_number VARCHAR(17);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS board_number VARCHAR(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gov_reg_number VARCHAR(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS reg_certificate_number VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS documents_info TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS passenger_capacity INT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tech_inspection_expiry DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin_number) WHERE vin_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_board_number ON vehicles(board_number) WHERE board_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_gov_reg ON vehicles(gov_reg_number) WHERE gov_reg_number IS NOT NULL;