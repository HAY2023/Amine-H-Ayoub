-- ==============================================================================
-- MASTER DATABASE INITIALIZATION & MIGRATION SCRIPT
-- Project: Quran Kids App ("حاج أيوب أمين") & Admin Dashboard
-- Supabase Project: cjrwtzcgtiqsbrqplouy.supabase.co
-- ==============================================================================

-- 1. CREATE 'store' TABLE (Key-Value Store for Timings, Coordinates, Bookmarks)
CREATE TABLE IF NOT EXISTS public.store (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on store table
ALTER TABLE public.store ENABLE ROW LEVEL SECURITY;

-- Clean & recreate store policies
DROP POLICY IF EXISTS "Allow public read from store" ON public.store;
DROP POLICY IF EXISTS "Allow public insert to store" ON public.store;
DROP POLICY IF EXISTS "Allow public update to store" ON public.store;

CREATE POLICY "Allow public read from store" ON public.store FOR SELECT USING (true);
CREATE POLICY "Allow public insert to store" ON public.store FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to store" ON public.store FOR UPDATE USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. CREATE 'support_conversations' & 'support_messages' (Technical Support)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'مستخدم التطبيق',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'bot')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on support tables
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Clean any old policies
DROP POLICY IF EXISTS "Admin full access on conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Admin full access on messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anon select own conversation" ON public.support_conversations;
DROP POLICY IF EXISTS "Anon insert own conversation" ON public.support_conversations;
DROP POLICY IF EXISTS "Anon update own conversation" ON public.support_conversations;
DROP POLICY IF EXISTS "Anon select own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anon insert own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow public read from support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow public insert to support_conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Allow public read from support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow public insert to support_messages" ON public.support_messages;

-- Public/Anon access policies for conversations
CREATE POLICY "Anon select own conversation"
  ON public.support_conversations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon insert own conversation"
  ON public.support_conversations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon update own conversation"
  ON public.support_conversations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Public/Anon access policies for messages
CREATE POLICY "Anon select own messages"
  ON public.support_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon insert own messages"
  ON public.support_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Enable Realtime replication for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
