-- Growth Leads Schema
-- يضم كل الإيميلات التي جمعناها من الزوار عبر 3 استراتيجيات أخلاقية

CREATE SCHEMA IF NOT EXISTS ml_growth;

CREATE TABLE IF NOT EXISTS ml_growth.leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id    TEXT NOT NULL,
  email        TEXT NOT NULL,
  -- نوع الاصطياد: save_results | price_alert | interstitial_gate
  lead_type    TEXT NOT NULL CHECK (lead_type IN ('save_results', 'price_alert', 'interstitial_gate')),
  -- بيانات السياق (decision_run_id, entity_id, الخ)
  metadata     JSONB NOT NULL DEFAULT '{}',
  -- هل وافق الطالب صراحةً على التسويق؟ (GDPR compliance)
  opted_in     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- فهرسة للبحث السريع
CREATE INDEX IF NOT EXISTS idx_growth_leads_domain  ON ml_growth.leads (domain_id);
CREATE INDEX IF NOT EXISTS idx_growth_leads_email   ON ml_growth.leads (email);
CREATE INDEX IF NOT EXISTS idx_growth_leads_type    ON ml_growth.leads (lead_type);
CREATE INDEX IF NOT EXISTS idx_growth_leads_created ON ml_growth.leads (created_at DESC);
