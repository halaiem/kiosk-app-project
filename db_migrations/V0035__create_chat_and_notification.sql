
-- ============================================================
-- V0035: Создание 1 чата + 1 уведомления
-- ============================================================

-- 1. Чат «Общий»
INSERT INTO chats (title, created_by, default_type, is_active)
VALUES ('Общий чат', 15, 'message', true);

-- Добавляем всех активных пользователей
INSERT INTO chat_members (chat_id, user_id, role)
SELECT c.id, u.id, CASE WHEN u.id = 15 THEN 'owner' ELSE 'member' END
FROM (SELECT id FROM chats WHERE title = 'Общий чат' AND is_active = true ORDER BY id DESC LIMIT 1) c
CROSS JOIN dashboard_users u
WHERE u.is_active = true;

-- Добавляем активного водителя
INSERT INTO chat_members (chat_id, driver_id, role)
SELECT c.id, d.id, 'member'
FROM (SELECT id FROM chats WHERE title = 'Общий чат' AND is_active = true ORDER BY id DESC LIMIT 1) c
CROSS JOIN drivers d
WHERE d.is_active = true;

-- 1 сообщение
INSERT INTO chat_messages (chat_id, sender_user_id, content, subject, message_type)
SELECT c.id, 15, 'Добро пожаловать в систему! Это общий чат для всех сотрудников и водителей.', 'Приветствие', 'message'
FROM (SELECT id FROM chats WHERE title = 'Общий чат' AND is_active = true ORDER BY id DESC LIMIT 1) c;

UPDATE chats SET last_message_at = NOW()
WHERE id = (SELECT id FROM chats WHERE title = 'Общий чат' AND is_active = true ORDER BY id DESC LIMIT 1);

-- ============================================================
-- 2. Канал уведомлений
-- ============================================================
INSERT INTO chats (title, created_by, default_type, is_active)
VALUES ('Уведомления', 15, 'notification', true);

INSERT INTO chat_members (chat_id, user_id, role)
SELECT c.id, u.id, CASE WHEN u.id = 15 THEN 'owner' ELSE 'member' END
FROM (SELECT id FROM chats WHERE title = 'Уведомления' AND is_active = true ORDER BY id DESC LIMIT 1) c
CROSS JOIN dashboard_users u
WHERE u.is_active = true;

INSERT INTO chat_members (chat_id, driver_id, role)
SELECT c.id, d.id, 'member'
FROM (SELECT id FROM chats WHERE title = 'Уведомления' AND is_active = true ORDER BY id DESC LIMIT 1) c
CROSS JOIN drivers d
WHERE d.is_active = true;

INSERT INTO chat_messages (chat_id, sender_user_id, content, subject, message_type)
SELECT c.id, 15, 'Система запущена. Все модули работают штатно.', 'Запуск системы', 'notification'
FROM (SELECT id FROM chats WHERE title = 'Уведомления' AND is_active = true ORDER BY id DESC LIMIT 1) c;

UPDATE chats SET last_message_at = NOW()
WHERE id = (SELECT id FROM chats WHERE title = 'Уведомления' AND is_active = true ORDER BY id DESC LIMIT 1);
