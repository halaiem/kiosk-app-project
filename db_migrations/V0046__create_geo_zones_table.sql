CREATE TABLE IF NOT EXISTS geo_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('circle', 'polygon', 'line', 'marker')),
  coordinates JSONB NOT NULL DEFAULT '[]',
  radius_km NUMERIC(10, 3),
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'entry' CHECK (trigger_type IN ('entry', 'exit', 'nearby')),
  nearby_distance_km NUMERIC(10, 3),
  notification_template_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
