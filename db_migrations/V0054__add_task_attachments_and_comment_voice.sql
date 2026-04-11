
CREATE TABLE task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    user_id INTEGER NOT NULL REFERENCES dashboard_users(id),
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(200) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL,
    cdn_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS file_name VARCHAR(500);
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS content_type VARCHAR(200);
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS is_voice BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS voice_transcript TEXT;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);

CREATE TABLE sidebar_configs (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL UNIQUE,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
