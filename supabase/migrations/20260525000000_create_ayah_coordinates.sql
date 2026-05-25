CREATE TABLE IF NOT EXISTS ayah_coordinates (
  page_src TEXT PRIMARY KEY,
  boxes JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ayah_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ayah coordinates"
ON ayah_coordinates FOR SELECT
USING (true);

CREATE POLICY "Public can insert/update ayah coordinates"
ON ayah_coordinates FOR ALL
USING (true)
WITH CHECK (true);
