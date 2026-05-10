-- 0016_performance_optimization_indices.sql
-- تحسين أداء الاستعلامات عبر إضافة فهارس متقدمة للبيانات الضخمة والـ JSONB

-- 1. فهارس GIN للبحث السريع داخل كائنات JSONB
CREATE INDEX IF NOT EXISTS idx_published_entities_payload_gin ON ml_catalog.published_entities USING GIN (entity_payload);
CREATE INDEX IF NOT EXISTS idx_source_observations_payload_gin ON ml_raw.source_observations USING GIN (raw_payload);
CREATE INDEX IF NOT EXISTS idx_decision_runs_cards_gin ON ml_decision.decision_runs USING GIN (cards_payload);

-- 2. فهارس زمنية لتسريع عمليات الترتيب (Sorting) والـ Dashboard
CREATE INDEX IF NOT EXISTS idx_published_entities_date ON ml_catalog.published_entities (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_runs_date ON ml_decision.decision_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_observations_date ON ml_raw.source_observations (fetched_at DESC);

-- 3. فهارس فريدة لتسريع الوصول لصفحات الـ SEO
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_payloads_slug ON ml_growth.page_payloads (domain_id, slug);

-- 4. فهارس لمفاتيح الربط الخارجية (Foreign Keys) المفقودة
CREATE INDEX IF NOT EXISTS idx_ownership_recommendations_decision_id ON ml_decision.ownership_recommendations (decision_run_id);
CREATE INDEX IF NOT EXISTS idx_trust_audits_decision_id ON ml_decision.trust_audits (decision_run_id);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_domain_date ON ml_governance.guardrail_events (domain_id, created_at DESC);
