-- 0027: Domain Ownership Configs
-- Stores per-domain acquisition strategy parameters, editable from admin UI.
-- Falls back to domain pack defaults if no row exists.

CREATE TABLE IF NOT EXISTS ml_commercial.domain_ownership_configs (
  id             SERIAL PRIMARY KEY,
  domain_slug    VARCHAR(100) UNIQUE NOT NULL,
  preset_key     VARCHAR(50),
  config         JSONB NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_by     VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_domain_ownership_configs_slug
  ON ml_commercial.domain_ownership_configs (domain_slug);
