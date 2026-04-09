-- Очистка лишних старых демо-записей: оставляем только 1 каждого типа

-- 1. Деактивируем старые чаты (оставляем id=4 и id=5)
UPDATE chats SET is_active = false WHERE id IN (1, 2, 3);

-- 2. Деактивируем старого водителя DRV01 (id=54)
UPDATE drivers SET is_active = false WHERE id = 54;

-- 3. Списываем лишний трамвай ТМ-101
UPDATE vehicles SET transport_status = 'decommissioned' WHERE label = 'ТМ-101';

-- 4. Деактивируем старый маршрут 1M (дубль трамвайного)
UPDATE routes SET is_active = false WHERE route_number = '1M';

-- 5. Обнуляем privileges у старых dashboard_users (не относящихся к нашим 4 основным)
UPDATE dashboard_users SET is_active = false
WHERE employee_id NOT IN ('ADM01', 'DSP01', 'TCH01', 'PRS01')
  AND employee_id NOT LIKE 'mrm%';
