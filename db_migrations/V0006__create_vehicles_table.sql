CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    label VARCHAR(50) NOT NULL,
    transport_type VARCHAR(20) NOT NULL DEFAULT 'bus' CHECK (transport_type IN ('bus', 'tram', 'trolleybus', 'minibus')),
    license_plate VARCHAR(20),
    model VARCHAR(100),
    capacity INT,
    manufacture_year INT,
    transport_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (transport_status IN ('active', 'maintenance', 'decommissioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON vehicles(transport_status);
CREATE INDEX idx_vehicles_type ON vehicles(transport_type);