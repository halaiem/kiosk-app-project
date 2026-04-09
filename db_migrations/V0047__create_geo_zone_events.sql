CREATE TABLE IF NOT EXISTS geo_zone_events (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL,
  driver_name VARCHAR(255),
  zone_id INTEGER NOT NULL,
  zone_name VARCHAR(255),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit', 'nearby')),
  notification_template_id INTEGER,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km NUMERIC(10, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_zone_events_driver ON geo_zone_events (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_zone_events_zone ON geo_zone_events (zone_id, created_at DESC);
