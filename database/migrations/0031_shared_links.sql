-- M4: Shared decision links — read-only, expiring, revocable, no PII in token
CREATE TABLE IF NOT EXISTS ml_users.shared_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        UNIQUE NOT NULL,           -- random 32-byte hex (no PII)
  decision_id UUID        REFERENCES ml_users.saved_decisions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES ml_users.users(id) ON DELETE CASCADE,
  ir_hash     TEXT,                                  -- snapshot anchor
  snapshot    JSONB       NOT NULL,                  -- decision_snapshot (no PII)
  title       TEXT        NOT NULL,
  domain      TEXT        NOT NULL DEFAULT 'laptop-student-us',
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL                   -- default 30 days from creation
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token  ON ml_users.shared_links(token)    WHERE NOT revoked;
CREATE INDEX IF NOT EXISTS idx_shared_links_user   ON ml_users.shared_links(user_id, created_at DESC);
