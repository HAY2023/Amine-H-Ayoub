-- Create table for storing upload records
CREATE TABLE IF NOT EXISTS upload_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('audio', 'image', 'surah')),
  surah_number INTEGER,
  surah_name TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_upload_records_type ON upload_records(type);
CREATE INDEX idx_upload_records_surah ON upload_records(surah_number);
CREATE INDEX idx_upload_records_created ON upload_records(created_at DESC);

-- Enable RLS
ALTER TABLE upload_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all read" ON upload_records FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON upload_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON upload_records FOR UPDATE USING (true) WITH CHECK (true);
