-- ============================================================================
-- MIGRATION 024: PROJECT INSPIRATIONS
-- ============================================================================
-- Created: 2025-11-04
-- Purpose: Visual reference/inspiration system for projects
-- 
-- Features:
-- - Store visual references (film screenshots, concept art, etc.)
-- - Rich metadata (title, description, source)
-- - Tagging system for organization
-- - Order management
-- - RLS for user isolation
--
-- Use Cases:
-- - Film/Series screenshot references
-- - Color palette inspiration
-- - Shot composition examples
-- - Lighting references
-- - Production design inspiration
-- ============================================================================

-- ============================================================================
-- TABLE: project_inspirations
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_inspirations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Image
  image_url TEXT NOT NULL,
  
  -- Metadata
  title TEXT,
  description TEXT,
  source TEXT, -- e.g. "Blade Runner 2049", "Mad Max: Fury Road"
  tags TEXT[] DEFAULT '{}', -- e.g. ["color-grading", "composition", "lighting"]
  
  -- Order
  order_index INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast project-based queries
CREATE INDEX IF NOT EXISTS idx_project_inspirations_project_id 
  ON project_inspirations(project_id);

-- Fast user-based queries
CREATE INDEX IF NOT EXISTS idx_project_inspirations_user_id 
  ON project_inspirations(user_id);

-- Composite index for project + user queries (most common)
CREATE INDEX IF NOT EXISTS idx_project_inspirations_project_user 
  ON project_inspirations(project_id, user_id);

-- Order index for sorting
CREATE INDEX IF NOT EXISTS idx_project_inspirations_order 
  ON project_inspirations(project_id, order_index);

-- Tag search (GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_project_inspirations_tags 
  ON project_inspirations USING GIN(tags);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE project_inspirations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own project inspirations
CREATE POLICY "Users can view own project inspirations"
  ON project_inspirations
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own project inspirations
CREATE POLICY "Users can create own project inspirations"
  ON project_inspirations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own project inspirations
CREATE POLICY "Users can update own project inspirations"
  ON project_inspirations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own project inspirations
CREATE POLICY "Users can delete own project inspirations"
  ON project_inspirations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_inspirations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_inspirations_updated_at
  BEFORE UPDATE ON project_inspirations
  FOR EACH ROW
  EXECUTE FUNCTION update_project_inspirations_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_inspirations IS 'Visual reference/inspiration images for projects';
COMMENT ON COLUMN project_inspirations.id IS 'Unique inspiration ID';
COMMENT ON COLUMN project_inspirations.project_id IS 'Reference to parent project';
COMMENT ON COLUMN project_inspirations.user_id IS 'Owner of this inspiration';
COMMENT ON COLUMN project_inspirations.image_url IS 'URL to inspiration image';
COMMENT ON COLUMN project_inspirations.title IS 'Optional title/caption';
COMMENT ON COLUMN project_inspirations.description IS 'Optional description/notes';
COMMENT ON COLUMN project_inspirations.source IS 'Optional source (e.g. film name)';
COMMENT ON COLUMN project_inspirations.tags IS 'Optional tags for organization';
COMMENT ON COLUMN project_inspirations.order_index IS 'Display order within project';
COMMENT ON COLUMN project_inspirations.created_at IS 'Creation timestamp';
COMMENT ON COLUMN project_inspirations.updated_at IS 'Last update timestamp';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 024: project_inspirations table created successfully';
  RAISE NOTICE '   - Table: project_inspirations';
  RAISE NOTICE '   - Indexes: 5 (project, user, composite, order, tags)';
  RAISE NOTICE '   - RLS Policies: 4 (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '   - Triggers: 1 (auto-update updated_at)';
END $$;
