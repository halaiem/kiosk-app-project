
ALTER TABLE t_p25163990_kiosk_app_project.chat_messages
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent' NOT NULL;

COMMENT ON COLUMN t_p25163990_kiosk_app_project.chat_messages.status IS 'sent | delivered | read';
