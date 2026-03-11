-- ============================================================================
-- MIGRATION 034: USER INTEGRATION TOKENS
-- ============================================================================
-- Purpose: Long-lived API tokens for external tools (e.g. ComfyUI/Blender)
--          so users can push images/videos to Scriptony without session login.
--
-- Usage: User creates a token in Scriptony (Settings → Integrationen), copies
--        it into the external tool; tool sends Authorization: Bearer <token>.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'External Tool',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token_hash)
);

CREATE INDEX IF NOT EXISTS idx_user_integration_tokens_user_id
  ON user_integration_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integration_tokens_token_hash
  ON user_integration_tokens(token_hash);

COMMENT ON TABLE user_integration_tokens IS 'Long-lived API tokens for external tools (Blender/ComfyUI etc.) to access Scriptony API with Bearer token.';
