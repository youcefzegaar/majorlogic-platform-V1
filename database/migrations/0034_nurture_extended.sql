-- M-report R.4: extend nurture sequence to include day 30 (delayed regret check)
-- Widens the CHECK constraint on nurture_emails.sequence_day.

ALTER TABLE ml_growth.nurture_emails
  DROP CONSTRAINT IF EXISTS nurture_emails_sequence_day_check;

ALTER TABLE ml_growth.nurture_emails
  ADD CONSTRAINT nurture_emails_sequence_day_check
  CHECK (sequence_day IN (1, 3, 7, 30));
