
-- Расширяем drivers: добавляем статусы отпуск/больничный/уволен
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_status varchar(20) NOT NULL DEFAULT 'active';
-- active, vacation, sick_leave, fired
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status_note text NULL;

-- Расширяем assignments: добавляем привязку документа и тип смены
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS document_id integer NULL REFERENCES documents(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS shift_type varchar(20) NOT NULL DEFAULT 'regular';
-- regular, additional
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS notes text NULL;

-- Обновляем существующих водителей: если is_active=false, ставим fired
UPDATE drivers SET driver_status = 'fired' WHERE is_active = false AND driver_status = 'active';
