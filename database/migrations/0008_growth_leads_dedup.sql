DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_lead_email_domain_type'
  ) THEN
    ALTER TABLE ml_growth.leads
      ADD CONSTRAINT uq_lead_email_domain_type UNIQUE (email, domain_id, lead_type);
  END IF;
END$$;
