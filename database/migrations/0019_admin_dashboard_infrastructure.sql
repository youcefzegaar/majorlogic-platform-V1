-- Migration: 0019_admin_dashboard_infrastructure
-- Purpose: Complete Enterprise Infrastructure for the No-Code Admin Dashboard.
-- Adds support for A/B Testing, Cognitive Telemetry, Intent Management, and AI Personas.

BEGIN;

-- ==========================================
-- 1. AI Personas (Expert Roles)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expert_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.cognitive_domains(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,            -- e.g., 'Lifestyle Designer'
    system_prompt TEXT NOT NULL,           -- Custom instructions for this persona
    locale VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Granular Intent Management
-- ==========================================
-- Instead of keeping all intents in one massive JSON blob, this table
-- allows the Admin UI to have a dedicated "Intent Builder" page.
CREATE TABLE IF NOT EXISTS public.decision_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.cognitive_domains(id) ON DELETE CASCADE,
    intent_slug VARCHAR(255) NOT NULL,     -- e.g., 'creative_nomad'
    title JSONB NOT NULL,                  -- Localized titles { "en": "Creative Nomad", "ar": "رحالة مبدع" }
    future_projection JSONB,               -- Localized projections
    expert_persona_id UUID REFERENCES public.expert_personas(id) ON DELETE SET NULL,
    
    -- The specific gates and scores to inject for this intent
    overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain_id, intent_slug)
);

-- ==========================================
-- 3. A/B Testing & Versioning (Challenger vs Champion)
-- ==========================================
-- Allows admins to test a new domain config (e.g., modified weights)
-- against the current production version.
CREATE TABLE IF NOT EXISTS public.domain_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.cognitive_domains(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    champion_version VARCHAR(50) NOT NULL, -- Current active version
    challenger_version VARCHAR(50) NOT NULL, -- New version to test
    traffic_split INTEGER DEFAULT 50,      -- % of traffic to route to challenger (0-100)
    is_active BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. Cognitive Telemetry (Dashboard Analytics)
-- ==========================================
-- This feeds the Admin Dashboard charts!
-- Admins need to know: Are users getting good results? Are constraints too strict?
CREATE TABLE IF NOT EXISTS public.cognitive_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_run_id UUID NOT NULL UNIQUE,
    domain_id UUID REFERENCES public.cognitive_domains(id) ON DELETE SET NULL,
    intent_slug VARCHAR(255),
    
    -- Metrics
    confidence_score INTEGER,              -- e.g., 85
    confidence_level VARCHAR(50),          -- 'high', 'medium', 'low'
    integrity_score INTEGER,               -- 100 if perfect, lower if Recovery Engine activated
    
    -- Recovery Insights
    recovery_activated BOOLEAN DEFAULT false,
    relaxed_constraint VARCHAR(255),       -- Which constraint was dropped? (e.g., 'gate_weight')
    
    -- Performance
    execution_time_ms INTEGER,
    ai_generation_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Dashboard Performance
CREATE INDEX idx_telemetry_domain ON public.cognitive_telemetry(domain_id);
CREATE INDEX idx_telemetry_intent ON public.cognitive_telemetry(intent_slug);
CREATE INDEX idx_telemetry_recovery ON public.cognitive_telemetry(recovery_activated) WHERE recovery_activated = true;

-- Row Level Security
ALTER TABLE public.expert_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_telemetry ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin All Access" ON public.expert_personas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access" ON public.decision_intents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access" ON public.domain_ab_tests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin All Access" ON public.cognitive_telemetry FOR ALL USING (auth.role() = 'authenticated');

-- Public can ONLY insert telemetry (anonymously) and read active intents
CREATE POLICY "Public Insert Telemetry" ON public.cognitive_telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Intents" ON public.decision_intents FOR SELECT USING (is_active = true);

COMMIT;
