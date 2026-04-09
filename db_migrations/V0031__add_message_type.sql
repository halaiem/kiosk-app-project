ALTER TABLE t_p25163990_kiosk_app_project.chat_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'message';

ALTER TABLE t_p25163990_kiosk_app_project.chats
  ADD COLUMN IF NOT EXISTS default_type VARCHAR(20) NOT NULL DEFAULT 'message';

CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON t_p25163990_kiosk_app_project.chat_messages(message_type);