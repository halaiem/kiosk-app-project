CREATE TABLE vehicle_telemetry (
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
    organization_id INT NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE INDEX idx_telemetry_vehicle_time ON vehicle_telemetry(vehicle_id, recorded_at);
CREATE INDEX idx_telemetry_org_time ON vehicle_telemetry(organization_id, recorded_at);
CREATE INDEX idx_telemetry_route ON vehicle_telemetry(route_id);

CREATE TABLE vehicle_telemetry_2025_01 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE vehicle_telemetry_2025_02 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE vehicle_telemetry_2025_03 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE vehicle_telemetry_2025_04 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE vehicle_telemetry_2025_05 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE vehicle_telemetry_2025_06 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE vehicle_telemetry_2025_07 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE vehicle_telemetry_2025_08 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE vehicle_telemetry_2025_09 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE vehicle_telemetry_2025_10 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE vehicle_telemetry_2025_11 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE vehicle_telemetry_2025_12 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE vehicle_telemetry_2026_01 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE vehicle_telemetry_2026_02 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE vehicle_telemetry_2026_03 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE vehicle_telemetry_2026_04 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE vehicle_telemetry_2026_05 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE vehicle_telemetry_2026_06 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE vehicle_telemetry_2026_07 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE vehicle_telemetry_2026_08 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE vehicle_telemetry_2026_09 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE vehicle_telemetry_2026_10 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE vehicle_telemetry_2026_11 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE vehicle_telemetry_2026_12 PARTITION OF vehicle_telemetry
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');