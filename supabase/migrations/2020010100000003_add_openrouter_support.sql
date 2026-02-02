-- =====================================================
-- ADD OPENROUTER SUPPORT - Migration
-- =====================================================
-- Fügt OpenRouter Support zu existierenden AI Settings hinzu
-- =====================================================

-- Add openrouter_api_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_ai_settings' 
    AND column_name = 'openrouter_api_key'
  ) THEN
    ALTER TABLE user_ai_settings ADD COLUMN openrouter_api_key TEXT;
  END IF;
END $$;

-- Update active_provider check constraint to include openrouter
ALTER TABLE user_ai_settings 
  DROP CONSTRAINT IF EXISTS user_ai_settings_active_provider_check;

ALTER TABLE user_ai_settings 
  ADD CONSTRAINT user_ai_settings_active_provider_check 
  CHECK (active_provider IN ('openai', 'anthropic', 'google', 'openrouter'));

-- Update timestamp
UPDATE user_ai_settings SET updated_at = NOW() WHERE updated_at IS NULL;
