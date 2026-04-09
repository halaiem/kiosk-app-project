-- Помечаем все старые сообщения водителей как прочитанные и доставленные (деактивация без удаления)
UPDATE messages SET is_read = true, delivered_at = COALESCE(delivered_at, NOW()) WHERE is_read = false;
