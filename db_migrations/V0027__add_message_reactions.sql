
CREATE TABLE t_p25163990_kiosk_app_project.chat_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.chat_messages(id),
    user_id INTEGER REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id),
    driver_id INTEGER REFERENCES t_p25163990_kiosk_app_project.drivers(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji),
    CHECK (
        (user_id IS NOT NULL AND driver_id IS NULL) OR
        (user_id IS NULL AND driver_id IS NOT NULL)
    )
);
CREATE INDEX idx_chat_reactions_message ON t_p25163990_kiosk_app_project.chat_reactions(message_id);
