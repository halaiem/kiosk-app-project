CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    route_number VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    transport_type VARCHAR(20) NOT NULL DEFAULT 'bus' CHECK (transport_type IN ('bus', 'tram', 'trolleybus', 'minibus')),
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routes_org ON routes(organization_id);
CREATE INDEX idx_routes_active ON routes(is_active);
CREATE INDEX idx_routes_type ON routes(transport_type);

CREATE TABLE stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    address TEXT,
    has_shelter BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stops_coords ON stops(lat, lng);

CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id),
    stop_id UUID NOT NULL REFERENCES stops(id),
    order_index INT NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'forward' CHECK (direction IN ('forward', 'backward')),
    avg_travel_sec INT DEFAULT 0,
    UNIQUE(route_id, stop_id, direction)
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_stop ON route_stops(stop_id);