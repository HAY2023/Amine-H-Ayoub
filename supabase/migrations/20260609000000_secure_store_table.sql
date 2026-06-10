-- ==========================================
-- SECURE 'store' TABLE RLS MIGRATION
-- ==========================================

-- 1. Create table if it doesn't exist (just in case it was only created manually in UI)
CREATE TABLE IF NOT EXISTS store (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- 2. ENFORCE RLS ON THE TABLE
-- This fixes the 'rls_disabled_in_public' warning for the store table.
ALTER TABLE store ENABLE ROW LEVEL SECURITY;

-- 3. EXPLICITLY DEFINE POLICIES
-- The application uses the store table as a global public cache from the client-side.
-- We must explicitly allow read and write operations for the public (anon) role, 
-- otherwise the client application will get 401/403 unauthorized errors.

-- Drop any existing policies just in case
DROP POLICY IF EXISTS "Allow public read from store" ON store;
DROP POLICY IF EXISTS "Allow public insert to store" ON store;
DROP POLICY IF EXISTS "Allow public update to store" ON store;

-- Create explicit policies
CREATE POLICY "Allow public read from store" ON store FOR SELECT USING (true);
CREATE POLICY "Allow public insert to store" ON store FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to store" ON store FOR UPDATE USING (true) WITH CHECK (true);
