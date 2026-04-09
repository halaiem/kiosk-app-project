-- После тестирования: оставляем в каждом чате только приветственное/системное сообщение
-- Для общего чата (id=4) оставляем самое первое приветствие (id=3)
-- Для канала уведомлений (id=5) оставляем первое уведомление (id=4)

-- Меняем содержимое тестовых сообщений в архив, чтобы не засорять UI
UPDATE chat_messages SET content = '[архив] ' || content
  WHERE chat_id = 4 AND id NOT IN (SELECT MIN(id) FROM chat_messages WHERE chat_id = 4);
UPDATE chat_messages SET content = '[архив] ' || content
  WHERE chat_id = 5 AND id NOT IN (SELECT MIN(id) FROM chat_messages WHERE chat_id = 5);
