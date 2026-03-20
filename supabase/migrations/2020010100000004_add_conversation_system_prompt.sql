-- =====================================================
-- ADD SYSTEM PROMPT TO CONVERSATIONS
-- =====================================================
-- Table is ai_conversations (was chat_conversations before 0002).
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE ai_conversations
      ADD COLUMN system_prompt TEXT;

    COMMENT ON COLUMN ai_conversations.system_prompt IS 'Per-conversation system prompt. NULL = use global default from ai_chat_settings';
  END IF;
END $$;
