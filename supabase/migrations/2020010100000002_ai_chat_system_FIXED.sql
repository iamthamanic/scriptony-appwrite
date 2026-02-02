-- =====================================================
-- AI CHAT SYSTEM - Database Schema (FIXED VERSION)
-- =====================================================
-- Table Namen korrigiert: ai_chat_settings statt user_ai_settings
-- =====================================================

-- =====================================================
-- 1. AI CHAT SETTINGS (FIXED TABLE NAME)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API Keys (verschlüsselt gespeichert)
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  google_api_key TEXT,
  openrouter_api_key TEXT,
  deepseek_api_key TEXT,
  
  -- Current Provider & Model
  active_provider TEXT CHECK (active_provider IN ('openai', 'anthropic', 'google', 'openrouter', 'deepseek')) DEFAULT 'openai',
  active_model TEXT DEFAULT 'gpt-4o',
  
  -- System Prompt
  system_prompt TEXT DEFAULT 'Du bist ein hilfreicher Assistent für Drehbuchautoren. Du hilfst bei der Story-Entwicklung, Charakterentwicklung und Worldbuilding.',
  
  -- Settings
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 2000,
  use_rag BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE ai_chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI settings"
  ON ai_chat_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
  ON ai_chat_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON ai_chat_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_ai_chat_settings_user_id ON ai_chat_settings(user_id);

-- =====================================================
-- 2. AI CONVERSATIONS (FIXED TABLE NAME)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL DEFAULT 'Neue Unterhaltung',
  
  -- Per-conversation system prompt (NULL = use global default)
  system_prompt TEXT,
  
  -- Metadata
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);

-- =====================================================
-- 3. AI CHAT MESSAGES (FIXED TABLE NAME)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  -- Message Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  model TEXT,
  provider TEXT,
  tokens_used INTEGER,
  tool_calls JSONB, -- Store AI tool calls for MCP integration
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own messages"
  ON ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_chat_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own messages"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON ai_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_chat_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ai_chat_messages_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);

-- =====================================================
-- 4. RAG KNOWLEDGE BASE
-- =====================================================

CREATE TABLE IF NOT EXISTS rag_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('projects', 'characters', 'scenes', 'worlds', 'episodes')),
  
  -- Reference
  reference_id UUID, -- ID of the referenced entity
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rag_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization knowledge"
  ON rag_knowledge FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = rag_knowledge.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization knowledge"
  ON rag_knowledge FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = rag_knowledge.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_rag_knowledge_org_id ON rag_knowledge(organization_id);
CREATE INDEX idx_rag_knowledge_content_type ON rag_knowledge(content_type);
CREATE INDEX idx_rag_knowledge_reference_id ON rag_knowledge(reference_id);

-- Full-text search index
CREATE INDEX idx_rag_knowledge_content_search ON rag_knowledge USING gin(to_tsvector('german', content));

-- =====================================================
-- 5. RAG SYNC QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS rag_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
  data JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_rag_sync_queue_processed ON rag_sync_queue(processed, created_at);

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Triggers
CREATE TRIGGER update_ai_chat_settings_updated_at
  BEFORE UPDATE ON ai_chat_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rag_knowledge_updated_at
  BEFORE UPDATE ON rag_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNCTION: Update Conversation Stats
-- =====================================================

CREATE OR REPLACE FUNCTION update_ai_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET 
    message_count = (SELECT COUNT(*) FROM ai_chat_messages WHERE conversation_id = NEW.conversation_id),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating conversation stats when message is added
CREATE TRIGGER update_ai_conversation_on_message
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_stats();

-- =====================================================
-- COMPLETE ✅
-- =====================================================

-- Grant permissions
GRANT ALL ON ai_chat_settings TO authenticated;
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON rag_knowledge TO authenticated;
GRANT ALL ON rag_sync_queue TO authenticated;
