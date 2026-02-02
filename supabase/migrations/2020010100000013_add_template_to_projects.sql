-- ============================================================================
-- 🎬 ADD TEMPLATE SUPPORT TO PROJECTS
-- ============================================================================

-- Add template_id column to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT 'film-3act';

-- Add index for template queries
CREATE INDEX IF NOT EXISTS idx_projects_template 
  ON projects(template_id);

-- Add comment
COMMENT ON COLUMN projects.template_id IS 'Template ID (e.g., film-3act, series-traditional, book-novel)';

-- ============================================================================
-- DONE!
-- ============================================================================
