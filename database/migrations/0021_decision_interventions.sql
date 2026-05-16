-- Migration: 0021_decision_interventions
-- Adds a table to track when the RecoveryEngine relaxes constraints.

CREATE TABLE IF NOT EXISTS ml_telemetry.interventions (
  id UUID PRIMARY KEY,
  decision_run_id UUID NOT NULL REFERENCES ml_telemetry.decision_runs(id),
  domain_id TEXT NOT NULL,
  relaxed_constraint TEXT NOT NULL,
  integrity_score INT NOT NULL,
  original_excluded_count INT NOT NULL,
  recovered_count INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by decision run
CREATE INDEX IF NOT EXISTS idx_interventions_decision_run ON ml_telemetry.interventions(decision_run_id);
