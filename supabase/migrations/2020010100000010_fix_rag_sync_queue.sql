-- =====================================================
-- FIX: Add organization_id to rag_sync_queue
-- =====================================================
-- This migration adds the missing organization_id column
-- to the rag_sync_queue table if it doesn't exist yet.
-- =====================================================

BEGIN;

-- Add organization_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_sync_queue' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE rag_sync_queue 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added organization_id column to rag_sync_queue';
  ELSE
    RAISE NOTICE 'organization_id column already exists in rag_sync_queue';
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_rag_sync_queue_org 
  ON rag_sync_queue(organization_id);

-- Update existing rows to have a valid organization_id (if any exist without it)
-- This is safe because we just added the column
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get the first organization (fallback for existing rows)
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    UPDATE rag_sync_queue 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    RAISE NOTICE 'Updated existing rag_sync_queue rows with default organization_id';
  END IF;
END $$;

-- Now make it NOT NULL (after we've populated existing rows)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rag_sync_queue' 
    AND column_name = 'organization_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE rag_sync_queue 
    ALTER COLUMN organization_id SET NOT NULL;
    
    RAISE NOTICE 'Set organization_id to NOT NULL';
  END IF;
END $$;

COMMIT;
