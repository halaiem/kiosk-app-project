-- Переименовываем роль personnel → mechanic

-- 1. Убираем старый CHECK
ALTER TABLE dashboard_users DROP CONSTRAINT IF EXISTS dashboard_users_role_check;

-- 2. Обновляем данные
UPDATE dashboard_users SET role = 'mechanic' WHERE role = 'personnel';

-- 3. Добавляем новый CHECK
ALTER TABLE dashboard_users ADD CONSTRAINT dashboard_users_role_check
  CHECK (role IN ('admin', 'dispatcher', 'technician', 'mechanic'));

-- 4. Обновляем имя/должность механика
UPDATE dashboard_users SET full_name = 'Механик Главный' WHERE employee_id = 'PRS01';
