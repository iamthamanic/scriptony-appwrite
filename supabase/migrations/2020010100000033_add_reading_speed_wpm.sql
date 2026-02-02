-- =====================================================
-- Migration: Add reading_speed_wpm to projects table
-- Version: 035
-- 📅 Created: 2025-11-22
-- 🎯 Purpose: Enable dynamic reading speed configuration per project
-- =====================================================

-- Add reading_speed_wpm column with default value
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS reading_speed_wpm INTEGER DEFAULT 230;

-- Add comment for documentation
COMMENT ON COLUMN projects.reading_speed_wpm IS 'Reading speed in words per minute for book projects (default: 230 WPM). Used for timeline duration calculations and playback speed.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_reading_speed 
  ON projects(reading_speed_wpm) 
  WHERE reading_speed_wpm IS NOT NULL;

-- Update existing NULL values to default
UPDATE projects 
SET reading_speed_wpm = 230 
WHERE reading_speed_wpm IS NULL;
