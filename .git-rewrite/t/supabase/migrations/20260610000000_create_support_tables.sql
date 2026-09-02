-- Create support_conversations table
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

-- Allow public access for support_conversations
CREATE POLICY "Allow public read from support_conversations" ON support_conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert to support_conversations" ON support_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to support_conversations" ON support_conversations FOR UPDATE USING (true) WITH CHECK (true);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Allow public access for support_messages
CREATE POLICY "Allow public read from support_messages" ON support_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert to support_messages" ON support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to support_messages" ON support_messages FOR UPDATE USING (true) WITH CHECK (true);
