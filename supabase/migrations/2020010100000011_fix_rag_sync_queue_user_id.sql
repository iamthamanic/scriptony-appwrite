-- =====================================================
-- FIX: Remove user_id constraint from rag_sync_queue
-- =====================================================
-- The rag_sync_queue table was created with user_id NOT NULL
-- but the triggers only insert organization_id.
-- This migration makes user_id nullable (or removes it).
-- =====================================================

BEGIN;

-- Option 1: Make user_id nullable (safer - keeps data)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_sync_queue' 
    AND column_name = 'user_id'
  ) THEN
    -- Make user_id nullable
    ALTER TABLE rag_sync_queue 
    ALTER COLUMN user_id DROP NOT NULL;
    
    RAISE NOTICE 'Made user_id nullable in rag_sync_queue';
  ELSE
    RAISE NOTICE 'user_id column does not exist in rag_sync_queue';
  END IF;
END $$;

-- Create index on user_id if it exists (for performance)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_sync_queue' 
    AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rag_sync_queue_user_id 
      ON rag_sync_queue(user_id);
    
    RAISE NOTICE 'Created index on user_id';
  END IF;
END $$;

COMMIT;
