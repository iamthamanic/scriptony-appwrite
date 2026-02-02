-- ============================================================================
-- 🎬 MIGRATE SHOTS TO TIMELINE NODES
-- ============================================================================
-- 
-- Problem: shots.scene_id references old "scenes" table
-- Solution: 
--   1. Delete orphaned shots (scenes not in timeline_nodes)
--   2. Change foreign key to reference timeline_nodes
--
-- ============================================================================

-- Step 1: Check if old scenes table exists and log info
DO $$
DECLARE
  orphaned_shots INTEGER;
  scenes_table_exists BOOLEAN;
BEGIN
  -- Check if old scenes table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'scenes'
  ) INTO scenes_table_exists;
  
  IF scenes_table_exists THEN
    RAISE NOTICE '⚠️  Old "scenes" table still exists!';
    
    -- Count orphaned shots
    SELECT COUNT(*) INTO orphaned_shots
    FROM shots
    WHERE scene_id NOT IN (SELECT id FROM timeline_nodes WHERE level = 3);
    
    RAISE NOTICE '⚠️  Found % orphaned shots (referencing old scenes)', orphaned_shots;
  END IF;
END $$;

-- Step 2: Delete orphaned shots that reference non-existent timeline_nodes
DELETE FROM shots
WHERE scene_id NOT IN (
  SELECT id FROM timeline_nodes WHERE level = 3
);

-- Step 3: Drop old foreign key constraint
ALTER TABLE shots 
DROP CONSTRAINT IF EXISTS shots_scene_id_fkey;

-- Step 4: Add new foreign key to timeline_nodes
ALTER TABLE shots 
ADD CONSTRAINT shots_scene_id_fkey 
  FOREIGN KEY (scene_id) 
  REFERENCES timeline_nodes(id) 
  ON DELETE CASCADE;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_shots_scene_id 
  ON shots(scene_id);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Update shot_audio policies to use timeline_nodes instead of scenes
DROP POLICY IF EXISTS "Users can view shot audio" ON shot_audio;
CREATE POLICY "Users can view shot audio"
  ON shot_audio FOR SELECT
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM timeline_nodes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage shot audio" ON shot_audio;
CREATE POLICY "Editors can manage shot audio"
  ON shot_audio FOR ALL
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM timeline_nodes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
          )
        )
      )
    )
  );

-- Update shot_characters policies to use timeline_nodes instead of scenes
DROP POLICY IF EXISTS "Users can view shot characters" ON shot_characters;
CREATE POLICY "Users can view shot characters"
  ON shot_characters FOR SELECT
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM timeline_nodes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage shot characters" ON shot_characters;
CREATE POLICY "Editors can manage shot characters"
  ON shot_characters FOR ALL
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM timeline_nodes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
          )
        )
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT shots_scene_id_fkey ON shots 
  IS 'Foreign key to timeline_nodes (scenes are now stored in timeline_nodes)';

-- ============================================================================
-- OPTIONAL: Drop old scenes table if it exists
-- ============================================================================
-- UNCOMMENT THIS IF YOU WANT TO DROP THE OLD SCENES TABLE:
-- DROP TABLE IF EXISTS scenes CASCADE;

-- ============================================================================
-- DONE!
-- ============================================================================

DO $$
DECLARE
  remaining_shots INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_shots FROM shots;
  
  RAISE NOTICE '✅ Migration 015 completed successfully!';
  RAISE NOTICE 'Deleted: All orphaned shots';
  RAISE NOTICE 'Updated: shots.scene_id now references timeline_nodes';
  RAISE NOTICE 'Updated: All shot-related RLS policies';
  RAISE NOTICE 'Remaining shots: %', remaining_shots;
END $$;
