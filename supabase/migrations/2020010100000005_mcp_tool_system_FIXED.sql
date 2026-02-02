-- ==========================================
-- MCP TOOL SYSTEM & RAG AUTO-SYNC
-- ==========================================
-- Migration for Universal Tool System with Auto-Sync RAG
-- Date: 2025-10-15
-- FIXED VERSION: Handles tables without organization_id

-- Start transaction for atomic migration
BEGIN;

-- ==================== RAG SYNC QUEUE ====================

-- Table for queuing RAG updates (processed by background worker)
CREATE TABLE IF NOT EXISTS rag_sync_queue (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  data JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_rag_sync_queue_processed 
  ON rag_sync_queue(processed, created_at);

CREATE INDEX IF NOT EXISTS idx_rag_sync_queue_org 
  ON rag_sync_queue(organization_id);

-- ==================== TOOL CALL HISTORY ====================

-- Store AI tool call history for debugging/analytics
CREATE TABLE IF NOT EXISTS tool_call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_call_history_conversation 
  ON tool_call_history(conversation_id);

CREATE INDEX IF NOT EXISTS idx_tool_call_history_tool 
  ON tool_call_history(tool_name, created_at);

-- ==================== COMMENTS ====================

COMMENT ON TABLE rag_sync_queue IS 'Queue for automatic RAG database synchronization after entity changes';
COMMENT ON TABLE tool_call_history IS 'History of AI tool calls for debugging and analytics';

COMMENT ON COLUMN rag_sync_queue.entity_type IS 'Type of entity: scenes, characters, projects, worlds, episodes';
COMMENT ON COLUMN rag_sync_queue.operation IS 'Database operation: INSERT, UPDATE, DELETE, UPSERT';
COMMENT ON COLUMN rag_sync_queue.data IS 'Full entity data (null for DELETE operations)';
COMMENT ON COLUMN rag_sync_queue.processed IS 'Whether this item has been processed by the sync worker';

-- ==================== RLS POLICIES ====================

-- RAG sync queue is internal, no user access needed
ALTER TABLE rag_sync_queue ENABLE ROW LEVEL SECURITY;

-- Tool call history - users can view their own conversation tools
ALTER TABLE tool_call_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view their own tool calls" ON tool_call_history;

CREATE POLICY "Users can view their own tool calls"
  ON tool_call_history
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE user_id = auth.uid()
    )
  );

-- ==================== COMMIT ====================

-- Migration complete!
-- Tables created: rag_sync_queue, tool_call_history
-- RLS policies configured
-- 
-- NOTE: Database triggers are NOT created here because:
-- - scenes, characters, episodes tables have NO organization_id column
-- - RAG sync will be handled by the tool system directly via manual inserts
-- - This avoids trigger errors and gives better control over sync timing

COMMIT;
