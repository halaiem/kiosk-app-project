
CREATE TABLE t_p25163990_kiosk_app_project.chats (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    created_by INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE t_p25163990_kiosk_app_project.chat_members (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.chats(id),
    user_id INTEGER REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id),
    driver_id INTEGER REFERENCES t_p25163990_kiosk_app_project.drivers(id),
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP,
    UNIQUE(chat_id, user_id),
    CHECK (
        (user_id IS NOT NULL AND driver_id IS NULL) OR
        (user_id IS NULL AND driver_id IS NOT NULL)
    )
);

CREATE TABLE t_p25163990_kiosk_app_project.chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.chats(id),
    sender_user_id INTEGER REFERENCES t_p25163990_kiosk_app_project.dashboard_users(id),
    sender_driver_id INTEGER REFERENCES t_p25163990_kiosk_app_project.drivers(id),
    content TEXT NOT NULL,
    subject VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false,
    CHECK (
        (sender_user_id IS NOT NULL AND sender_driver_id IS NULL) OR
        (sender_user_id IS NULL AND sender_driver_id IS NOT NULL)
    )
);

CREATE TABLE t_p25163990_kiosk_app_project.chat_files (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES t_p25163990_kiosk_app_project.chat_messages(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_members_chat ON t_p25163990_kiosk_app_project.chat_members(chat_id);
CREATE INDEX idx_chat_members_user ON t_p25163990_kiosk_app_project.chat_members(user_id);
CREATE INDEX idx_chat_members_driver ON t_p25163990_kiosk_app_project.chat_members(driver_id);
CREATE INDEX idx_chat_messages_chat ON t_p25163990_kiosk_app_project.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_sender_user ON t_p25163990_kiosk_app_project.chat_messages(sender_user_id);
CREATE INDEX idx_chat_messages_created ON t_p25163990_kiosk_app_project.chat_messages(created_at DESC);
CREATE INDEX idx_chats_last_message ON t_p25163990_kiosk_app_project.chats(last_message_at DESC);
