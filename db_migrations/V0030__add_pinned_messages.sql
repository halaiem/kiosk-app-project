ALTER TABLE t_p25163990_kiosk_app_project.chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE t_p25163990_kiosk_app_project.chat_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

ALTER TABLE t_p25163990_kiosk_app_project.chat_messages
  ADD COLUMN IF NOT EXISTS pinned_by INT REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned 
  ON t_p25163990_kiosk_app_project.chat_messages(chat_id, is_pinned)
  WHERE is_pinned = TRUE;
