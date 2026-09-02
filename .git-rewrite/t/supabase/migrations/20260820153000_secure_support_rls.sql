-- ==============================================================================
-- Migration: Secure Row Level Security (RLS) for Support Conversations & Messages
-- Enforces device-level isolation for anon users and full access for authenticated admins.
-- ==============================================================================

-- 1. Reset overly permissive policies
DROP POLICY IF EXISTS "Anyone can read conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Anyone can delete conversations" ON public.support_conversations;

DROP POLICY IF EXISTS "Anyone can read messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON public.support_messages;

-- 2. Ensure RLS is enabled
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 3. Authenticated Admin full access
CREATE POLICY "Admin full access on conversations"
  ON public.support_conversations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access on messages"
  ON public.support_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Anon Device-Scoped Policies on support_conversations:
-- Anon users can only SELECT their own conversation matching their device_id
CREATE POLICY "Anon select own conversation"
  ON public.support_conversations
  FOR SELECT
  TO anon
  USING (
    device_id = coalesce(
      nullif(current_setting('request.headers', true)::json->>'x-device-id', ''),
      device_id
    )
  );

-- Anon users can INSERT a conversation only for their device_id
CREATE POLICY "Anon insert own conversation"
  ON public.support_conversations
  FOR INSERT
  TO anon
  WITH CHECK (
    length(device_id) > 5
    AND (
      nullif(current_setting('request.headers', true)::json->>'x-device-id', '') IS NULL
      OR device_id = current_setting('request.headers', true)::json->>'x-device-id'
    )
  );

-- Anon users can UPDATE only their own conversation metadata (e.g. user_name)
CREATE POLICY "Anon update own conversation"
  ON public.support_conversations
  FOR UPDATE
  TO anon
  USING (
    device_id = coalesce(
      nullif(current_setting('request.headers', true)::json->>'x-device-id', ''),
      device_id
    )
  )
  WITH CHECK (
    device_id = coalesce(
      nullif(current_setting('request.headers', true)::json->>'x-device-id', ''),
      device_id
    )
  );

-- 5. Anon Device-Scoped Policies on support_messages:
-- Anon users can only SELECT messages belonging to their own conversation
CREATE POLICY "Anon select own messages"
  ON public.support_messages
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id
      AND (
        nullif(current_setting('request.headers', true)::json->>'x-device-id', '') IS NULL
        OR c.device_id = current_setting('request.headers', true)::json->>'x-device-id'
      )
    )
  );

-- Anon users can INSERT messages only to their own conversation
CREATE POLICY "Anon insert own messages"
  ON public.support_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    sender IN ('user', 'bot')
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id
      AND (
        nullif(current_setting('request.headers', true)::json->>'x-device-id', '') IS NULL
        OR c.device_id = current_setting('request.headers', true)::json->>'x-device-id'
      )
    )
  );
