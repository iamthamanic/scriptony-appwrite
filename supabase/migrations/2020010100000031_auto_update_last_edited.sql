-- =====================================================
-- 🕐 AUTO UPDATE last_edited ON PROJECTS
-- 📅 Created: 2025-11-10
-- 🎯 Purpose: Automatically update last_edited timestamp on any project change
-- =====================================================
--
-- PROBLEM:
-- When a user edits a project (logline, title, etc.), the last_edited
-- timestamp is NOT automatically updated. This causes the "Zuletzt bearbeitet"
-- badge to show outdated information.
--
-- SOLUTION:
-- Create a BEFORE UPDATE trigger that automatically sets last_edited = NOW()
-- whenever ANY column in the projects table is updated.
-- =====================================================

-- Function to update last_edited timestamp
CREATE OR REPLACE FUNCTION update_projects_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  -- Always update last_edited to current timestamp on UPDATE
  NEW.last_edited = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS projects_auto_update_last_edited ON projects;
CREATE TRIGGER projects_auto_update_last_edited
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_last_edited();

-- Add comment for documentation
COMMENT ON FUNCTION update_projects_last_edited() IS 'Automatically updates last_edited timestamp on any project update';

-- =====================================================
-- ✅ VERIFICATION
-- =====================================================
--
-- Test this works:
-- 1. Update a project: UPDATE projects SET logline = 'Test' WHERE id = 'xxx';
-- 2. Check last_edited: SELECT id, title, last_edited FROM projects WHERE id = 'xxx';
-- 3. The last_edited should now be the current timestamp!
--
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 032 completed! last_edited will now auto-update on project changes.';
END $$;
