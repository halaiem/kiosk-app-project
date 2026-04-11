
-- Add email and notification preferences to dashboard_users
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_push BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_on_status_change BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_on_new_request BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_on_comment BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS notify_on_forward BOOLEAN NOT NULL DEFAULT true;

-- Push subscription storage
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES dashboard_users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_ps_user ON push_subscriptions(user_id);
