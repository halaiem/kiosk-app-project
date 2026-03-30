
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  pin VARCHAR(10) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'tram',
  vehicle_number VARCHAR(50),
  route_number VARCHAR(20),
  shift_start TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_sessions (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  started_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
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
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO drivers (full_name, pin, vehicle_type, vehicle_number, route_number, shift_start)
VALUES 
  ('Иванов Александр Петрович', '1234', 'tram', 'ТМ-3407', '5', '08:00'),
  ('Петров Сергей Иванович', '5678', 'trolleybus', 'ТБ-1205', '12', '09:00')
ON CONFLICT (pin) DO NOTHING;
