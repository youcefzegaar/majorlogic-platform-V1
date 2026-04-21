-- Affiliate Click Tracking
-- يتتبع كل نقرة على رابط أفيليت مع معرفة المتجر والسعر وقت النقرة

CREATE TABLE IF NOT EXISTS ml_telemetry.affiliate_clicks (
  id              SERIAL PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  seller          TEXT NOT NULL,
  seller_type     TEXT,
  price_usd       NUMERIC(10,2),
  condition       TEXT,
  decision_run_id UUID,                    -- ربط بقرار المحرك الأصلي
  is_affiliate    BOOLEAN DEFAULT false,
  clicked_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aff_clicks_entity  ON ml_telemetry.affiliate_clicks (entity_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_seller  ON ml_telemetry.affiliate_clicks (seller);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_clicked ON ml_telemetry.affiliate_clicks (clicked_at DESC);
