-- Affiliate Settings Management
-- يُخزِّن أكواد الأفيليت لكل متجر ويتيح تعديلها من لوح القيادة

CREATE SCHEMA IF NOT EXISTS ml_commercial;

CREATE TABLE IF NOT EXISTS ml_commercial.affiliate_settings (
  id                  SERIAL PRIMARY KEY,
  seller              TEXT NOT NULL UNIQUE,           -- "Amazon", "Best Buy", "B&H"...
  seller_display_name TEXT,
  affiliate_tag       TEXT,                           -- الكود الفعلي: "majorlogic-20"
  affiliate_param_key TEXT DEFAULT 'tag',             -- اسم البارامتر في الرابط
  is_active           BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,                           -- ملاحظات للمدير
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed بالمتاجر الافتراضية
INSERT INTO ml_commercial.affiliate_settings
  (seller, seller_display_name, affiliate_tag, affiliate_param_key, is_active, notes)
VALUES
  ('Amazon',   'Amazon Associates',  'majorlogic-20', 'tag',     true,  'Main affiliate program. 4% commission on electronics.'),
  ('Best Buy',  'Best Buy Ads',      '',               'irclickid', true, 'Via CJ Affiliate or Impact. Enter your publisher ID.'),
  ('B&H',       'B&H Affiliate',     '',               'BI',       true,  'Via B&H affiliate portal. Commission ~2%.'),
  ('Newegg',    'Newegg Affiliate',  '',               'cm_mmc',   true,  'Via CJ Affiliate. Enter the full tag value.'),
  ('Framework', 'Framework Laptop',  '',               'ref',      true,  'Direct Framework affiliate. Enter your referral code.')
ON CONFLICT (seller) DO NOTHING;
