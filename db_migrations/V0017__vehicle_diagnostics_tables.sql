
-- Таблица API-источников диагностики (настраиваемых администратором)
CREATE TABLE vehicle_diagnostic_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    api_name VARCHAR(100) NOT NULL,
    api_type VARCHAR(50) NOT NULL DEFAULT 'fema',
    api_url TEXT NOT NULL,
    api_key TEXT,
    poll_interval_sec INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица результатов диагностики
CREATE TABLE vehicle_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_id UUID REFERENCES routes(id),
    api_source_id UUID REFERENCES vehicle_diagnostic_apis(id),
    check_code VARCHAR(50) NOT NULL,
    check_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    short_description TEXT,
    full_description TEXT,
    raw_data JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_diagnostics_vehicle ON vehicle_diagnostics(vehicle_id);
CREATE INDEX idx_vehicle_diagnostics_severity ON vehicle_diagnostics(severity);
CREATE INDEX idx_vehicle_diagnostics_status ON vehicle_diagnostics(status);
CREATE INDEX idx_vehicle_diagnostics_detected ON vehicle_diagnostics(detected_at DESC);

-- Таблица отчётов о проблемах (от водителя диспетчеру/технику)
CREATE TABLE vehicle_issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_id INTEGER NOT NULL REFERENCES drivers(id),
    route_id UUID REFERENCES routes(id),
    diagnostic_id UUID REFERENCES vehicle_diagnostics(id),
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    report_status VARCHAR(20) NOT NULL DEFAULT 'new',
    dispatcher_notified BOOLEAN NOT NULL DEFAULT false,
    technician_notified BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES dashboard_users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_issue_reports_vehicle ON vehicle_issue_reports(vehicle_id);
CREATE INDEX idx_vehicle_issue_reports_status ON vehicle_issue_reports(report_status);
CREATE INDEX idx_vehicle_issue_reports_driver ON vehicle_issue_reports(driver_id);

-- Индекс для api таблицы
CREATE INDEX idx_vehicle_diagnostic_apis_vehicle ON vehicle_diagnostic_apis(vehicle_id);
