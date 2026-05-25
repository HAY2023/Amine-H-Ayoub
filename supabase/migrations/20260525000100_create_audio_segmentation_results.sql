-- Create audio_segmentation_results table
CREATE TABLE IF NOT EXISTS audio_segmentation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL CHECK (surah_number >= 1 AND surah_number <= 114),
  storage_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  segments JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audio_results_session ON audio_segmentation_results(session_id);
CREATE INDEX idx_audio_results_surah ON audio_segmentation_results(surah_number);
CREATE INDEX idx_audio_results_status ON audio_segmentation_results(status);
CREATE INDEX idx_audio_results_created ON audio_segmentation_results(created_at DESC);

-- Enable RLS (make public for now, can restrict later)
ALTER TABLE audio_segmentation_results ENABLE ROW LEVEL SECURITY;

-- Create policy: anyone can read and create
CREATE POLICY "Allow public read" ON audio_segmentation_results
  FOR SELECT USING (true);

CREATE POLICY "Allow public create" ON audio_segmentation_results
  FOR INSERT WITH CHECK (true);

-- Add foreign key to ayah_timings (optional, for linking)
-- This allows storing segmentation result reference in timings
ALTER TABLE ayah_timings ADD COLUMN IF NOT EXISTS segmentation_result_id UUID REFERENCES audio_segmentation_results(id) ON DELETE SET NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_audio_results_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audio_results_update_trigger
BEFORE UPDATE ON audio_segmentation_results
FOR EACH ROW
EXECUTE FUNCTION update_audio_results_timestamp();
