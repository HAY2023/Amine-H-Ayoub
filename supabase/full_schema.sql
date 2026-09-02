-- ==============================================================================
-- QURAN-AMINE H AYOUB - COMPLETE DATABASE SCHEMA & POLICIES SETUP
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: store (Global Key-Value cache for bookmarks, timings, calibration, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.store (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read from store" ON public.store;
DROP POLICY IF EXISTS "Allow public insert to store" ON public.store;
DROP POLICY IF EXISTS "Allow public update to store" ON public.store;

CREATE POLICY "Allow public read from store" ON public.store FOR SELECT USING (true);
CREATE POLICY "Allow public insert to store" ON public.store FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to store" ON public.store FOR UPDATE USING (true) WITH CHECK (true);


-- ==============================================================================
-- TABLE 2: app_analytics (App Open & Active User Statistics)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_analytics (
  day TEXT PRIMARY KEY,
  app_opens INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read app_analytics" ON public.app_analytics;
DROP POLICY IF EXISTS "Allow public insert app_analytics" ON public.app_analytics;
DROP POLICY IF EXISTS "Allow public update app_analytics" ON public.app_analytics;

CREATE POLICY "Allow public read app_analytics" ON public.app_analytics FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_analytics" ON public.app_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_analytics" ON public.app_analytics FOR UPDATE USING (true) WITH CHECK (true);


-- ==============================================================================
-- TABLE 3: support_conversations (Support Chat Conversations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'مستخدم التطبيق',
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_conv_device ON public.support_conversations(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_conv_device_unique
  ON public.support_conversations(device_id);
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read from support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow public insert to support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow public update to support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow device read from support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow device insert to support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow device update to support_conversations" ON public.support_conversations;

CREATE POLICY "Allow device read from support_conversations" ON public.support_conversations FOR SELECT USING (
  device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
);
CREATE POLICY "Allow device insert to support_conversations" ON public.support_conversations FOR INSERT WITH CHECK (
  device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
);
CREATE POLICY "Allow device update to support_conversations" ON public.support_conversations FOR UPDATE USING (
  device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
) WITH CHECK (
  device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
);


-- ==============================================================================
-- TABLE 4: support_messages (Support Chat Messages)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_msgs_conv ON public.support_messages(conversation_id);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read from support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow public insert to support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow public update to support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow device read from support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow device insert from support_messages" ON public.support_messages;

CREATE POLICY "Allow device read from support_messages" ON public.support_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = support_messages.conversation_id
      AND c.device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
  )
);
CREATE POLICY "Allow device insert from support_messages" ON public.support_messages FOR INSERT WITH CHECK (
  sender = 'user' AND EXISTS (
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = support_messages.conversation_id
      AND c.device_id = COALESCE(current_setting('request.headers', true)::json->>'x-device-id', '')
  )
);


-- ==============================================================================
-- TABLE 5: ayah_coordinates (Mushaf Ayah Boundary Coordinates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ayah_coordinates (
  page_src TEXT PRIMARY KEY,
  boxes JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ayah_coordinates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read ayah_coordinates" ON public.ayah_coordinates;
DROP POLICY IF EXISTS "Allow public write ayah_coordinates" ON public.ayah_coordinates;

CREATE POLICY "Allow public read ayah_coordinates" ON public.ayah_coordinates FOR SELECT USING (true);
CREATE POLICY "Allow public write ayah_coordinates" ON public.ayah_coordinates FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- TABLE 6: audio_segmentation_results (Audio Processing & Segmentation Cache)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audio_segmentation_results (
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

CREATE INDEX IF NOT EXISTS idx_audio_results_surah ON public.audio_segmentation_results(surah_number);
ALTER TABLE public.audio_segmentation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read audio_segmentation_results" ON public.audio_segmentation_results;
DROP POLICY IF EXISTS "Allow public insert audio_segmentation_results" ON public.audio_segmentation_results;

CREATE POLICY "Allow public read audio_segmentation_results" ON public.audio_segmentation_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert audio_segmentation_results" ON public.audio_segmentation_results FOR INSERT WITH CHECK (true);


-- ==============================================================================
-- TABLE 7: upload_records (Upload Log Records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.upload_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  surah_number INTEGER,
  surah_name TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.upload_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read upload_records" ON public.upload_records;
DROP POLICY IF EXISTS "Allow all insert upload_records" ON public.upload_records;

CREATE POLICY "Allow all read upload_records" ON public.upload_records FOR SELECT USING (true);
CREATE POLICY "Allow all insert upload_records" ON public.upload_records FOR INSERT WITH CHECK (true);


-- ==============================================================================
-- TABLE 8: announcements (App Announcements & Notices)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read announcements" ON public.announcements;
CREATE POLICY "Allow public read announcements" ON public.announcements FOR SELECT USING (true);


-- ==============================================================================
-- STORAGE BUCKET: quran-audio (Audio files & Support attachments)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quran-audio', 'quran-audio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public select from quran-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert to quran-audio" ON storage.objects;

CREATE POLICY "Allow public select from quran-audio" ON storage.objects FOR SELECT USING (bucket_id = 'quran-audio');
CREATE POLICY "Allow public insert to quran-audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quran-audio');


-- ==============================================================================
-- REALTIME PUBLICATION (Enable instant chat message delivery)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
