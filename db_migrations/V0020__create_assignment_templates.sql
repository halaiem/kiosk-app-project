
CREATE TABLE assignment_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    rows JSONB NOT NULL DEFAULT '[]',
    created_by INTEGER REFERENCES dashboard_users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_assignment_templates_created_by ON assignment_templates(created_by);
