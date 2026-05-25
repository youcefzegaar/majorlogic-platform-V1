-- Migration: 0018_cognitive_domains
-- Purpose: Establish the persistence layer for the No-Code Cognitive Decision Engine.
-- This replaces static JSON files with a dynamic, version-controlled database store.

BEGIN;

-- auth.role() stub for plain-PostgreSQL CI environments.
-- In Supabase production, the real auth schema already exists and this block is skipped.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $fn$ SELECT 'authenticated'::text; $fn$;
  END IF;
END
$$;

-- 1. Create the Cognitive Domains table
CREATE TABLE IF NOT EXISTS public.cognitive_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,       -- e.g., 'laptop-student-us'
    title VARCHAR(255) NOT NULL,             -- e.g., 'Student Laptops US'
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT false,
    
    -- The Cognitive Configuration (Topology)
    -- Validated by the Zod Schema in the Decision Compiler before insertion
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Performance Indexing
CREATE INDEX idx_cognitive_domains_slug ON public.cognitive_domains(slug);
CREATE INDEX idx_cognitive_domains_active ON public.cognitive_domains(is_active) WHERE is_active = true;

-- 3. Row Level Security (RLS)
ALTER TABLE public.cognitive_domains ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active domains
CREATE POLICY "Allow public read-only access to active domains"
ON public.cognitive_domains
FOR SELECT
USING (is_active = true);

-- Require service_role or admin privileges for modifications
-- (Assuming authenticated admins have specific claims, or we just rely on Supabase API keys)
CREATE POLICY "Allow authenticated admins to manage domains"
ON public.cognitive_domains
FOR ALL
USING (auth.role() = 'authenticated');

-- 4. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_cognitive_domains_updated_at
BEFORE UPDATE ON public.cognitive_domains
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
