-- =====================================================
-- ADD OPENROUTER SUPPORT - Migration
-- =====================================================
-- Table is ai_chat_settings (renamed from user_ai_settings in 0002).
-- Fresh installs from 0002 already include openrouter; this stays idempotent.
-- =====================================================

ALTER TABLE ai_chat_settings ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

ALTER TABLE ai_chat_settings DROP CONSTRAINT IF EXISTS ai_chat_settings_active_provider_check;

ALTER TABLE ai_chat_settings
  ADD CONSTRAINT ai_chat_settings_active_provider_check
  CHECK (active_provider IN ('openai', 'anthropic', 'google', 'openrouter', 'deepseek'));

UPDATE ai_chat_settings SET updated_at = NOW() WHERE updated_at IS NULL;
