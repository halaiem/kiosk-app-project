CREATE TABLE trip_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    route_id UUID NOT NULL,
    driver_id UUID,
    organization_id INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    total_km REAL DEFAULT 0,
    avg_speed REAL DEFAULT 0,
    max_speed REAL DEFAULT 0,
    stops_visited SMALLINT DEFAULT 0,
    delay_minutes REAL DEFAULT 0,
    passengers_max SMALLINT DEFAULT 0,
    trip_status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (trip_status IN ('in_progress', 'completed', 'interrupted', 'cancelled'))
);

CREATE INDEX idx_trip_org_route ON trip_summary(organization_id, route_id);
CREATE INDEX idx_trip_vehicle ON trip_summary(vehicle_id);
CREATE INDEX idx_trip_started ON trip_summary(started_at);
CREATE INDEX idx_trip_status ON trip_summary(trip_status);

CREATE TABLE vehicle_events (
    id BIGSERIAL,
    vehicle_id UUID NOT NULL,
    route_id UUID,
    organization_id INT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('speeding', 'hard_brake', 'door_error', 'deviation', 'idle', 'sos')),
    event_value REAL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    details TEXT,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE INDEX idx_events_vehicle_time ON vehicle_events(vehicle_id, recorded_at);
CREATE INDEX idx_events_org_time ON vehicle_events(organization_id, recorded_at);
CREATE INDEX idx_events_type ON vehicle_events(event_type);

CREATE TABLE vehicle_events_2025_q1 PARTITION OF vehicle_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE vehicle_events_2025_q2 PARTITION OF vehicle_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE vehicle_events_2025_q3 PARTITION OF vehicle_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE vehicle_events_2025_q4 PARTITION OF vehicle_events
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE vehicle_events_2026_q1 PARTITION OF vehicle_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE vehicle_events_2026_q2 PARTITION OF vehicle_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE vehicle_events_2026_q3 PARTITION OF vehicle_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE vehicle_events_2026_q4 PARTITION OF vehicle_events
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');