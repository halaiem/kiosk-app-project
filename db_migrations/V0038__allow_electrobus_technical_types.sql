ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_transport_type_check;
ALTER TABLE routes ADD CONSTRAINT routes_transport_type_check
  CHECK (transport_type IN ('tram', 'trolleybus', 'bus', 'electrobus', 'technical'));

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_transport_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_transport_type_check
  CHECK (transport_type IN ('tram', 'trolleybus', 'bus', 'electrobus', 'technical'));
