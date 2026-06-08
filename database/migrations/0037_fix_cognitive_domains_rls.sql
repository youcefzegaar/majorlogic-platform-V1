-- Migration 0037: Fix cognitive_domains RLS — drop overly-permissive write policy
--
-- Problem (0018): "Allow authenticated admins to manage domains" used
-- auth.role() = 'authenticated', meaning ANY logged-in Supabase user could
-- INSERT/UPDATE/DELETE cognitive_domains rows. Admin operations in this project
-- go through ml_commercial.admin_users (separate table, JWT-based) and the
-- backend service_role key, which bypasses RLS entirely.
--
-- Fix: drop the write-all-authenticated policy. SELECT remains open for
-- is_active domains (public catalog reads). All mutations are service_role only.

DROP POLICY IF EXISTS "Allow authenticated admins to manage domains"
  ON public.cognitive_domains;
