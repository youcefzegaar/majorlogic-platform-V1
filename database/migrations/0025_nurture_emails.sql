-- Nurture Email Tracking
-- تتبع إيميلات التسلسل التلقائي لتفادي الإرسال المكرر

CREATE TABLE IF NOT EXISTS ml_growth.nurture_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL,
  email        TEXT NOT NULL,
  sequence_day INT NOT NULL CHECK (sequence_day IN (1, 3, 7)),
  sent_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lead_id, sequence_day)
);

CREATE INDEX IF NOT EXISTS idx_nurture_emails_lead_id ON ml_growth.nurture_emails (lead_id);
CREATE INDEX IF NOT EXISTS idx_nurture_emails_sent_at ON ml_growth.nurture_emails (sent_at DESC);

-- Price alert watch prices — tracks the price at time of alert registration
-- stored in leads.metadata->>'watchedPriceUsd' (set by API on capture)
