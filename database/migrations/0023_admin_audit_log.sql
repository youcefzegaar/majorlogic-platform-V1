-- Admin Audit Log: records every mutating action performed via the admin panel
CREATE TABLE IF NOT EXISTS ml_commercial.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL,
  action       TEXT NOT NULL,          -- e.g. 'save_logic', 'export_leads', 'change_password'
  resource     TEXT,                   -- e.g. 'laptop-student-us', 'affiliate_settings'
  details      JSONB DEFAULT '{}'::jsonb,
  ip_address   TEXT,
  status       TEXT DEFAULT 'success', -- 'success' | 'error'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_username   ON ml_commercial.admin_audit_log (username);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON ml_commercial.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON ml_commercial.admin_audit_log (created_at DESC);
