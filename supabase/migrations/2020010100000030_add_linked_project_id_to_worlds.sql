-- =====================================================
-- Migration 031: Add linked_project_id to worlds
-- =====================================================
-- 
-- This migration adds a foreign key relationship from worlds 
-- to projects, allowing worlds to be linked to specific projects.
--
-- DEPLOY: Copy this SQL and run in Supabase Dashboard SQL Editor
-- =====================================================

-- Add linked_project_id column to worlds table
ALTER TABLE worlds 
ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_worlds_linked_project ON worlds(linked_project_id);

-- Add comment for documentation
COMMENT ON COLUMN worlds.linked_project_id IS 'Optional FK to projects table - allows linking a world to a specific project';
