-- 0015_external_acquisition_store.sql
-- تخزين نتائج جلب البيانات الآلية من المصادر الخارجية (Reddit, Amazon, etc.)

CREATE TABLE IF NOT EXISTS public.external_acquisition_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}' -- { productName, sources: ['reddit'] }
);

CREATE TABLE IF NOT EXISTS public.external_review_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.external_acquisition_runs(id),
    source_name TEXT NOT NULL, -- reddit, amazon, verge
    product_name TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    sentiment_score NUMERIC,
    extracted_signals JSONB DEFAULT '[]', -- ['thermal_throttling', 'fan_noise']
    acquired_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_obs_product ON public.external_review_observations(product_name);
CREATE INDEX IF NOT EXISTS idx_ext_obs_source ON public.external_review_observations(source_name);
