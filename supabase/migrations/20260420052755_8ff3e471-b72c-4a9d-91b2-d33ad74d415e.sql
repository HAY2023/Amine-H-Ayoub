-- Create public bucket for Quran audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('quran-audio', 'quran-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for everyone
CREATE POLICY "Public can read quran audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'quran-audio');