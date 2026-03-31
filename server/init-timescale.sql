-- TimescaleDB: конвертируем таблицы телеметрии в hypertables
-- Этот скрипт выполняется автоматически при первом запуске контейнера

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Пересоздаём vehicle_telemetry как hypertable
-- (партиции по месяцам создаются автоматически)
CREATE TABLE IF NOT EXISTS vehicle_telemetry (
    id BIGSERIAL,
    vehicle_id UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    route_id UUID,
    stop_index SMALLINT,
    odometer_km REAL,
    fuel_level REAL,
    engine_temp REAL,
    door_open BOOLEAN DEFAULT false,
    passengers SMALLINT,
    organization_id INT NOT NULL
);

SELECT create_hypertable('vehicle_telemetry', 'recorded_at',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON vehicle_telemetry(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_org_time ON vehicle_telemetry(organization_id, recorded_at DESC);

-- Пересоздаём vehicle_events как hypertable
CREATE TABLE IF NOT EXISTS vehicle_events (
    id BIGSERIAL,
    vehicle_id UUID NOT NULL,
    route_id UUID,
    organization_id INT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type VARCHAR(20) NOT NULL,
    event_value REAL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    details TEXT
);

SELECT create_hypertable('vehicle_events', 'recorded_at',
    chunk_time_interval => INTERVAL '3 months',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_events_vehicle_time ON vehicle_events(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_org_time ON vehicle_events(organization_id, recorded_at DESC);

-- Автоматическое сжатие данных старше 7 дней
ALTER TABLE vehicle_telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vehicle_id, organization_id',
    timescaledb.compress_orderby = 'recorded_at DESC'
);

SELECT add_compression_policy('vehicle_telemetry', INTERVAL '7 days', if_not_exists => TRUE);

ALTER TABLE vehicle_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vehicle_id, organization_id',
    timescaledb.compress_orderby = 'recorded_at DESC'
);

SELECT add_compression_policy('vehicle_events', INTERVAL '30 days', if_not_exists => TRUE);

-- Автоудаление данных старше 12 месяцев (телеметрия) и 6 месяцев (события)
SELECT add_retention_policy('vehicle_telemetry', INTERVAL '12 months', if_not_exists => TRUE);
SELECT add_retention_policy('vehicle_events', INTERVAL '6 months', if_not_exists => TRUE);

-- Continuous Aggregate: средняя скорость по транспорту за час
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    organization_id,
    route_id,
    time_bucket('1 hour', recorded_at) AS bucket,
    AVG(speed) AS avg_speed,
    MAX(speed) AS max_speed,
    COUNT(*) AS points_count,
    AVG(lat) AS avg_lat,
    AVG(lng) AS avg_lng
FROM vehicle_telemetry
GROUP BY vehicle_id, organization_id, route_id, bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('telemetry_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Continuous Aggregate: статистика за день
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_daily
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    organization_id,
    time_bucket('1 day', recorded_at) AS bucket,
    AVG(speed) AS avg_speed,
    MAX(speed) AS max_speed,
    COUNT(*) AS points_count,
    MAX(odometer_km) - MIN(odometer_km) AS distance_km
FROM vehicle_telemetry
GROUP BY vehicle_id, organization_id, bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('telemetry_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);
