-- ============================================================================
-- 🎬 ADD NARRATIVE STRUCTURE & BEAT TEMPLATE TO PROJECTS
-- ============================================================================
-- Migration: 029
-- Description: Add narrative_structure and beat_template columns to projects
-- Author: Scriptony System
-- Date: 2025-11-08
-- ============================================================================

-- Add new columns to projects table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS narrative_structure TEXT,
  ADD COLUMN IF NOT EXISTS beat_template TEXT;

-- Add comments for documentation
COMMENT ON COLUMN projects.narrative_structure IS 'Selected narrative structure (e.g., "3-act", "4-act", "heroes-journey", "custom:CustomName")';
COMMENT ON COLUMN projects.beat_template IS 'Selected story beat template (e.g., "save-the-cat", "lite-7", "heroes-journey")';

-- Add indexes for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_projects_narrative_structure 
  ON projects(narrative_structure) 
  WHERE narrative_structure IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_beat_template 
  ON projects(beat_template) 
  WHERE beat_template IS NOT NULL;

-- ============================================================================
-- ✅ MIGRATION COMPLETE
-- ============================================================================
-- The projects table now supports:
-- - narrative_structure: Flexible text field for any narrative structure
-- - beat_template: Story beat template selection
-- - Both fields are optional (NULL allowed)
-- - Indexed for fast queries
-- ============================================================================
