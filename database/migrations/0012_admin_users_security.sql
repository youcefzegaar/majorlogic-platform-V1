-- Migration 0012: Enhance admin_users table with security columns
ALTER TABLE ml_commercial.admin_users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Add a check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_failed_attempts'
    AND conrelid = 'ml_commercial.admin_users'::regclass
  ) THEN
    ALTER TABLE ml_commercial.admin_users
      ADD CONSTRAINT chk_failed_attempts CHECK (failed_login_attempts >= 0);
  END IF;
END $$;
