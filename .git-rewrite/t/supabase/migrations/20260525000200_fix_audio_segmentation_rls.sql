-- Fix RLS policy for audio_segmentation_results
-- The insert policy needs to allow service role without additional checks

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read" ON audio_segmentation_results;
DROP POLICY IF EXISTS "Allow public create" ON audio_segmentation_results;

-- Create new policies that explicitly allow all operations
CREATE POLICY "Allow all read" ON audio_segmentation_results
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert" ON audio_segmentation_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update" ON audio_segmentation_results
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete" ON audio_segmentation_results
  FOR DELETE USING (true);

-- Verify RLS is enabled
ALTER TABLE audio_segmentation_results ENABLE ROW LEVEL SECURITY;

-- Also ensure ayah_timings has proper policies
DROP POLICY IF EXISTS "Public can read ayah timings" ON ayah_timings;
DROP POLICY IF EXISTS "Public can insert ayah timings" ON ayah_timings;

CREATE POLICY "Allow all read timings" ON ayah_timings
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert/update timings" ON ayah_timings
  FOR ALL USING (true) WITH CHECK (true);
