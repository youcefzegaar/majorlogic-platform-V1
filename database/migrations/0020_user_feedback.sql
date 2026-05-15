-- 0020_user_feedback.sql
-- Captures closed-loop feedback from users about decision quality.

CREATE TABLE IF NOT EXISTS ml_telemetry.user_feedback (
  id UUID PRIMARY KEY,
  decision_run_id UUID REFERENCES ml_telemetry.decision_runs(id),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  tags TEXT[],
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_run_id ON ml_telemetry.user_feedback(decision_run_id);
