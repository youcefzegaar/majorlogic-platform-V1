CREATE SCHEMA IF NOT EXISTS ml_users;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS ml_users.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_users.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ml_users.users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS ml_users.saved_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ml_users.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  ir_hash TEXT,
  title TEXT NOT NULL,
  profile_snapshot JSONB NOT NULL,
  decision_snapshot JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_users.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ml_users.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'laptop-student-us',
  target_price NUMERIC(10,2),
  current_price NUMERIC(10,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON ml_users.user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user  ON ml_users.user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_saved_decisions_user ON ml_users.saved_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user    ON ml_users.price_alerts(user_id, active);

-- Unique constraint for price alert upsert (user + entity)
ALTER TABLE ml_users.price_alerts
  ADD CONSTRAINT uq_price_alerts_user_entity UNIQUE (user_id, entity_id);
