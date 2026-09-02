-- ==========================================
-- SECURE ROW-LEVEL SECURITY (RLS) MIGRATION
-- ==========================================

-- 1. ENFORCE RLS ON ALL TABLES
-- This fixes the 'rls_disabled_in_public' warning
ALTER TABLE ayah_timings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_segmentation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayah_coordinates ENABLE ROW LEVEL SECURITY;


-- 2. REVOKE ALL INSECURE PUBLIC WRITE POLICIES
-- Drop insecure policies on ayah_timings
DROP POLICY IF EXISTS "Public can insert ayah timings" ON ayah_timings;
DROP POLICY IF EXISTS "Allow all insert/update timings" ON ayah_timings;

-- Drop insecure policies on audio_segmentation_results
DROP POLICY IF EXISTS "Allow public create" ON audio_segmentation_results;
DROP POLICY IF EXISTS "Allow all insert" ON audio_segmentation_results;
DROP POLICY IF EXISTS "Allow all update" ON audio_segmentation_results;
DROP POLICY IF EXISTS "Allow all delete" ON audio_segmentation_results;

-- Drop insecure policies on ayah_coordinates
DROP POLICY IF EXISTS "Public can insert/update ayah coordinates" ON ayah_coordinates;


-- 3. RE-ESTABLISH SAFE READ-ONLY POLICIES FOR PUBLIC
-- ayah_timings
DROP POLICY IF EXISTS "Public can read ayah timings" ON ayah_timings;
DROP POLICY IF EXISTS "Allow all read timings" ON ayah_timings;
CREATE POLICY "Allow public read timings" ON ayah_timings FOR SELECT USING (true);

-- audio_segmentation_results
DROP POLICY IF EXISTS "Allow public read" ON audio_segmentation_results;
DROP POLICY IF EXISTS "Allow all read" ON audio_segmentation_results;
CREATE POLICY "Allow public read audio_segmentation_results" ON audio_segmentation_results FOR SELECT USING (true);

-- ayah_coordinates
DROP POLICY IF EXISTS "Public can read ayah coordinates" ON ayah_coordinates;
CREATE POLICY "Allow public read ayah_coordinates" ON ayah_coordinates FOR SELECT USING (true);

-- NOTE ON WRITE ACCESS:
-- No INSERT/UPDATE/DELETE policies are created here. 
-- This securely blocks public (anonymous) writes. 
-- The backend Python service uses the `service_role` key, which bypasses RLS and can still write.
