ALTER TABLE ml_growth.leads
  ADD CONSTRAINT uq_lead_email_domain_type UNIQUE (email, domain_id, lead_type);
