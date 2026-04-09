
-- ============================================================
-- V0034: Деактивация демо + минимальные записи
-- ============================================================

-- 1. Деактивация
UPDATE dashboard_users SET is_active = false;
UPDATE drivers SET is_active = false, shift_status = 'off_shift';
UPDATE routes SET is_active = false;
UPDATE vehicles SET transport_status = 'decommissioned';
UPDATE chats SET is_active = false;
UPDATE chat_messages SET is_read = true;
UPDATE messages SET is_read = true;

-- ============================================================
-- 2. 4 пользователя (1 на роль)
-- ============================================================
INSERT INTO dashboard_users (employee_id, full_name, role, password_hash, phone, is_active)
VALUES
  ('ADM01', 'Петров Максим Андреевич', 'admin',
   '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
   '+7 (900) 333-01-01', true),
  ('DSP01', 'Смирнова Елена Викторовна', 'dispatcher',
   'b806614d83ec9b3afbebd51db50d0d22cdd88a4d5a157598b9a805646bf58f7c',
   '+7 (900) 111-01-01', true),
  ('TCH01', 'Васильев Олег Николаевич', 'technician',
   '3ac40463b419a7de590185c7121f0bfbe411d6168699e8014f521b050b1d6653',
   '+7 (900) 222-01-01', true),
  ('PRS01', 'Кузнецова Мария Игоревна', 'personnel',
   '14e43efbe91076b71ee30e2e0b9b19ba1e8e8e82c42bb6bdbe0a867acfb41be0',
   '+7 (900) 444-01-01', true);

-- ============================================================
-- 3. 1 водитель (PIN: 12345678)
-- ============================================================
INSERT INTO drivers (full_name, pin, employee_id, vehicle_type, vehicle_number, route_number, shift_start, phone, is_active, shift_status, driver_status)
VALUES ('Иванов Александр Петрович', '12345678', 'DRV01', 'tram', 'ТМ-101', '1', '08:00', '+7 (900) 500-01-01', true, 'off_shift', 'active');

-- ============================================================
-- 4. 1 маршрут (10 остановок)
-- ============================================================
INSERT INTO routes (organization_id, route_number, name, transport_type, color, distance_km, avg_time_min, route_status, is_active)
VALUES (1, '1M', 'Депо Северное — Центральная площадь', 'tram', '#3b82f6', 8.5, 28, 'active', true);

INSERT INTO stops (id, name, lat, lng, address, has_shelter) VALUES
  (gen_random_uuid(), 'Депо Северное (М1)', 56.858, 60.603, 'ул. Депо, 1', true),
  (gen_random_uuid(), 'ул. Заводская (М1)', 56.855, 60.610, 'ул. Заводская, 15', true),
  (gen_random_uuid(), 'Парк Победы (М1)', 56.851, 60.615, 'ул. Победы, 8', true),
  (gen_random_uuid(), 'ул. Ленина (М1)', 56.847, 60.605, 'ул. Ленина, 24', true),
  (gen_random_uuid(), 'Дом культуры (М1)', 56.844, 60.600, 'пр. Культуры, 3', false),
  (gen_random_uuid(), 'Центральный рынок (М1)', 56.840, 60.597, 'ул. Малышева, 44', true),
  (gen_random_uuid(), 'пл. 1905 года (М1)', 56.838, 60.598, 'пл. 1905 года', true),
  (gen_random_uuid(), 'Театр драмы (М1)', 56.836, 60.601, 'пр. Ленина, 19', true),
  (gen_random_uuid(), 'Администрация (М1)', 56.834, 60.604, 'пр. Ленина, 24', false),
  (gen_random_uuid(), 'Центральная площадь (М1)', 56.832, 60.606, 'Центральная площадь', true);

INSERT INTO route_stops (route_id, stop_id, order_index, direction, avg_travel_sec)
SELECT r.id, s.id, rn.idx, 'forward', rn.travel_sec
FROM (SELECT id FROM routes WHERE route_number = '1M' LIMIT 1) r
CROSS JOIN LATERAL (
  VALUES
    ('Депо Северное (М1)', 1, 0),
    ('ул. Заводская (М1)', 2, 120),
    ('Парк Победы (М1)', 3, 90),
    ('ул. Ленина (М1)', 4, 100),
    ('Дом культуры (М1)', 5, 80),
    ('Центральный рынок (М1)', 6, 110),
    ('пл. 1905 года (М1)', 7, 70),
    ('Театр драмы (М1)', 8, 90),
    ('Администрация (М1)', 9, 100),
    ('Центральная площадь (М1)', 10, 80)
) AS rn(stop_name, idx, travel_sec)
JOIN stops s ON s.name = rn.stop_name;

-- ============================================================
-- 5. 1 ТС
-- ============================================================
INSERT INTO vehicles (organization_id, label, transport_type, model, capacity, manufacture_year, transport_status, mileage, board_number)
VALUES (1, 'ТМ-101', 'tram', '71-623', 190, 2020, 'active', 108000, 'ТМ-101');

-- ============================================================
-- 6. Лог
-- ============================================================
INSERT INTO audit_logs (user_name, action, target, details)
VALUES ('Система', 'data_reset', 'database', 'Деактивация демо. Минимальные записи: 4 пользователя, 1 водитель, 1 маршрут (10 ост.), 1 ТС');
