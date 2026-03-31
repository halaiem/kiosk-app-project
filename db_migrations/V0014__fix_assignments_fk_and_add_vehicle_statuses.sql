
-- Fix assignments.driver_id to reference drivers(id) instead of accounts(id)
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_driver_id_fkey;
ALTER TABLE assignments ALTER COLUMN driver_id TYPE integer USING NULL;
ALTER TABLE assignments ADD CONSTRAINT assignments_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- Update vehicles transport_status check to allow idle/offline
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_transport_status_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_transport_status_check CHECK (transport_status IN ('active', 'maintenance', 'decommissioned', 'idle', 'offline'));
