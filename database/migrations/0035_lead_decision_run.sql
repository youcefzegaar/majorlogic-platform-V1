-- M-report R.4: link growth leads to their originating decision run
-- Enables regret-check emails to reference the specific decision and
-- verify whether the sacrifice was clearly shown (joins with decision_runs).

ALTER TABLE ml_growth.leads
  ADD COLUMN IF NOT EXISTS decision_run_id UUID;

CREATE INDEX IF NOT EXISTS idx_leads_decision_run_id
  ON ml_growth.leads(decision_run_id)
  WHERE decision_run_id IS NOT NULL;
