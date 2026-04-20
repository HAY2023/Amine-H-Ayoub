-- Drop the broad SELECT policy. Public bucket already serves files via direct public URL,
-- so we don't need a SELECT policy on storage.objects (which would allow listing all files).
DROP POLICY IF EXISTS "Public can read quran audio" ON storage.objects;