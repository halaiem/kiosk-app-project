
-- Деактивация старого пустого чата id=1 (был is_active=true из-за раннего создания)
UPDATE chats SET is_active = false WHERE id = 1 AND created_by NOT IN (SELECT id FROM dashboard_users WHERE is_active = true AND employee_id = 'ADM01');
