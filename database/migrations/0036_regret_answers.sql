-- M-report C4: regret answers from day-30 follow-up emails
-- Stores the user's regret response linked to the originating decision,
-- and whether the sacrifice was clearly shown (for the golden metric split).

CREATE TABLE IF NOT EXISTS ml_telemetry.regret_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_run_id UUID NOT NULL,
  domain_id       TEXT NOT NULL,
  answer          TEXT NOT NULL CHECK (answer IN ('happy', 'surprised', 'regret')),
  sacrifice_shown BOOLEAN,          -- was sacrifice guard passed for this decision?
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regret_decision_run
  ON ml_telemetry.regret_answers(decision_run_id);

CREATE INDEX IF NOT EXISTS idx_regret_received_at
  ON ml_telemetry.regret_answers(received_at DESC);

-- Prevent duplicate answers per decision (one user, one answer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_regret_unique_per_decision
  ON ml_telemetry.regret_answers(decision_run_id);
