-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Multi-modal metadata
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice', 'system')) DEFAULT 'text',
  audio_url TEXT,
  audio_duration_ms INTEGER,
  
  -- Bookmarking
  is_bookmarked BOOLEAN DEFAULT false,
  bookmark_note TEXT,
  bookmark_tags TEXT[],
  
  -- Additional metadata
  asset TEXT,
  sources JSONB,
  timestamp TIMESTAMPTZ DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, timestamp);
CREATE INDEX idx_messages_bookmarked ON chat_messages(user_id, is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX idx_messages_user ON chat_messages(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages RLS policies
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation timestamp when message added
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Migrate existing saved_responses to new structure
INSERT INTO conversations (user_id, title, created_at)
SELECT DISTINCT 
  user_id, 
  'Saved Q&A Sessions', 
  MIN(created_at)
FROM saved_responses
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT DO NOTHING;

-- Migrate saved_responses as bookmarked messages (questions)
WITH user_convos AS (
  SELECT DISTINCT ON (sr.user_id)
    sr.user_id,
    c.id as conversation_id
  FROM saved_responses sr
  JOIN conversations c ON c.user_id = sr.user_id
  WHERE c.title = 'Saved Q&A Sessions'
)
INSERT INTO chat_messages (conversation_id, user_id, role, content, message_type, timestamp, is_bookmarked, asset)
SELECT 
  uc.conversation_id,
  sr.user_id,
  'user',
  sr.question,
  'text',
  sr.created_at,
  false,
  sr.asset
FROM saved_responses sr
JOIN user_convos uc ON uc.user_id = sr.user_id;

-- Insert assistant responses as bookmarked
WITH user_convos AS (
  SELECT DISTINCT ON (sr.user_id)
    sr.user_id,
    c.id as conversation_id
  FROM saved_responses sr
  JOIN conversations c ON c.user_id = sr.user_id
  WHERE c.title = 'Saved Q&A Sessions'
)
INSERT INTO chat_messages (conversation_id, user_id, role, content, message_type, timestamp, is_bookmarked, asset)
SELECT 
  uc.conversation_id,
  sr.user_id,
  'assistant',
  sr.answer,
  'text',
  sr.created_at + INTERVAL '1 second',
  true,
  sr.asset
FROM saved_responses sr
JOIN user_convos uc ON uc.user_id = sr.user_id;