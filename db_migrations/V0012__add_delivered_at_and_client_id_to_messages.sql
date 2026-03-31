ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages (driver_id, delivered_at) WHERE delivered_at IS NULL AND sender = 'dispatcher';
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages (client_id) WHERE client_id IS NOT NULL;