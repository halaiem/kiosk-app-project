CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    vehicle_id UUID REFERENCES vehicles(id),
    route_id UUID REFERENCES routes(id),
    incident_type VARCHAR(20) NOT NULL DEFAULT 'other' CHECK (incident_type IN ('delay', 'breakdown', 'accident', 'detour', 'other')),
    severity VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created ON incidents(created_at);

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INT NOT NULL REFERENCES organizations(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    updated_by UUID REFERENCES accounts(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, setting_key)
);

CREATE INDEX idx_settings_org ON settings(organization_id);