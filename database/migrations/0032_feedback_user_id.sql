-- M8: Attach feedback to user account when logged in (editable/withdrawable)
ALTER TABLE ml_telemetry.user_feedback
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES ml_users.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON ml_telemetry.user_feedback(user_id) WHERE user_id IS NOT NULL;
