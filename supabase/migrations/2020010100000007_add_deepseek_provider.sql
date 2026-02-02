-- =====================================================================
-- Migration 007: Add DeepSeek Provider Support
-- =====================================================================
-- 
-- Adds deepseek_api_key column to user_ai_settings table
-- and updates the active_provider check constraint
--
-- Date: 2025-10-15
-- =====================================================================

-- Add deepseek_api_key column
ALTER TABLE user_ai_settings
ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT;

-- Drop old check constraint
ALTER TABLE user_ai_settings
DROP CONSTRAINT IF EXISTS user_ai_settings_active_provider_check;

-- Add new check constraint with deepseek
ALTER TABLE user_ai_settings
ADD CONSTRAINT user_ai_settings_active_provider_check 
CHECK (active_provider IN ('openai', 'anthropic', 'google', 'openrouter', 'deepseek'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_deepseek_key 
ON user_ai_settings(deepseek_api_key) 
WHERE deepseek_api_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_ai_settings.deepseek_api_key IS 'DeepSeek API key (OpenAI-compatible)';
