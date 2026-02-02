-- =====================================================
-- ADD SYSTEM PROMPT TO CONVERSATIONS
-- =====================================================
-- Adds per-conversation system prompt support
-- NULL = use global system prompt from user_ai_settings
-- =====================================================

-- Add system_prompt column to chat_conversations if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_conversations' 
    AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE chat_conversations 
    ADD COLUMN system_prompt TEXT;
    
    COMMENT ON COLUMN chat_conversations.system_prompt IS 'Per-conversation system prompt. NULL = use global default from user_ai_settings';
  END IF;
END $$;
