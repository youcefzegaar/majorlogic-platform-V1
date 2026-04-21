CREATE SCHEMA IF NOT EXISTS ml_telemetry;

CREATE TABLE IF NOT EXISTS ml_telemetry.decision_runs (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  segment TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ml_telemetry.telemetry_clicks (
  id SERIAL PRIMARY KEY,
  decision_run_id UUID REFERENCES ml_telemetry.decision_runs(id),
  entity_id TEXT NOT NULL,
  click_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
