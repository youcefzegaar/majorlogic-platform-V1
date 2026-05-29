-- M-gov: integrity certificate per decision
-- Stores the output of governance-evaluator runAll() for each decision run.
-- guards_json keyed by guard id for efficient JSONB querying.
-- e.g.: guards_json->'money-separation'->'evidence'->>'spearmanCorrelation'

CREATE TABLE IF NOT EXISTS ml_governance.integrity_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_run_id UUID NOT NULL,
  overall_passed  BOOLEAN NOT NULL,
  integrity_score NUMERIC(5,2) NOT NULL,
  guards_json     JSONB NOT NULL,
  evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ic_decision_run
  ON ml_governance.integrity_certificates(decision_run_id);

CREATE INDEX IF NOT EXISTS idx_ic_evaluated_at
  ON ml_governance.integrity_certificates(evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ic_overall_passed
  ON ml_governance.integrity_certificates(overall_passed)
  WHERE overall_passed = false;
