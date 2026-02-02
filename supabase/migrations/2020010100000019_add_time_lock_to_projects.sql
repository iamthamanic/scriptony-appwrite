-- Migration: Add time_lock and max_duration_seconds to projects table
-- Phase 1: UI Support (Enforcement kommt in Phase 2)

-- Add time_lock boolean column (default: false)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS time_lock BOOLEAN NOT NULL DEFAULT false;

-- Add max_duration_seconds integer column for time budget tracking
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS max_duration_seconds INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN projects.time_lock IS 'When enabled, total shot durations cannot exceed max_duration_seconds';
COMMENT ON COLUMN projects.max_duration_seconds IS 'Maximum allowed total duration in seconds (used with time_lock)';

-- Index for performance (optional, für spätere Queries)
CREATE INDEX IF NOT EXISTS idx_projects_time_lock ON projects(time_lock) WHERE time_lock = true;
