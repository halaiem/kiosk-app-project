CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    driver_id UUID REFERENCES accounts(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ,
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (assignment_status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_vehicle ON assignments(vehicle_id);
CREATE INDEX idx_assignments_route ON assignments(route_id);
CREATE INDEX idx_assignments_driver ON assignments(driver_id);
CREATE INDEX idx_assignments_status ON assignments(assignment_status);
CREATE INDEX idx_assignments_shift ON assignments(shift_start, shift_end);