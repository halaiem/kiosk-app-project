-- Скрипт инициализации БД для своего сервера
-- Запусти один раз: psql -U postgres -d tramdisp -f init-db.sql

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    pin VARCHAR(10) NOT NULL,
    employee_id TEXT NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'tram',
    vehicle_number VARCHAR(50),
    route_number VARCHAR(20),
    shift_start TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_sessions (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    session_token VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT now(),
    last_seen TIMESTAMP DEFAULT now(),
    is_online BOOLEAN DEFAULT true,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    sender VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    message_type VARCHAR(30) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON drivers(employee_id);
CREATE INDEX IF NOT EXISTS idx_drivers_pin ON drivers(pin);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON driver_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_driver ON driver_sessions(driver_id, is_online);
CREATE INDEX IF NOT EXISTS idx_messages_driver ON messages(driver_id);
