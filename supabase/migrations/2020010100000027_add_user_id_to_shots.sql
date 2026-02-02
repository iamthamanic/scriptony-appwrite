/**
 * 🔐 MIGRATION 028: Add user_id to shots table
 * 
 * ✅ FIX: Complete the user_id rollout from Migration 025
 * 📅 Created: 2025-11-07
 * 
 * PROBLEM:
 * - Migration 025 added user_id to timeline_nodes, characters, projects
 * - BUT forgot to add user_id to shots table!
 * - Result: "user_id column does not exist" error when creating shots
 * 
 * SOLUTION:
 * 1. Add user_id column to shots table
 * 2. Create index for performance
 * 3. Add trigger for activity logging (if needed)
 */

-- =============================================================================
-- STEP 1: Add user_id to shots table
-- =============================================================================

ALTER TABLE shots 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN shots.user_id IS 'User who created/last modified this shot';

-- =============================================================================
-- STEP 2: Create index for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_shots_user_id ON shots(user_id);

-- =============================================================================
-- STEP 3: Force Schema Cache Refresh
-- =============================================================================

-- Analyze the table to update statistics
ANALYZE shots;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- =============================================================================
-- VERIFICATION: Check that user_id column exists
-- =============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shots' AND column_name = 'user_id';

-- Expected Output:
-- shots | user_id | uuid | YES

-- =============================================================================
-- ✅ DONE!
-- =============================================================================
