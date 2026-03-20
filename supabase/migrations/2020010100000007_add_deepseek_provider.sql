-- =====================================================================
-- Migration 007: Add DeepSeek Provider Support
-- =====================================================================
-- Table is ai_chat_settings (renamed from user_ai_settings in 0002).
-- =====================================================================

ALTER TABLE ai_chat_settings ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT;

ALTER TABLE ai_chat_settings DROP CONSTRAINT IF EXISTS ai_chat_settings_active_provider_check;

ALTER TABLE ai_chat_settings
  ADD CONSTRAINT ai_chat_settings_active_provider_check
  CHECK (active_provider IN ('openai', 'anthropic', 'google', 'openrouter', 'deepseek'));

CREATE INDEX IF NOT EXISTS idx_ai_chat_settings_deepseek_key
  ON ai_chat_settings(deepseek_api_key)
  WHERE deepseek_api_key IS NOT NULL;

COMMENT ON COLUMN ai_chat_settings.deepseek_api_key IS 'DeepSeek API key (OpenAI-compatible)';
