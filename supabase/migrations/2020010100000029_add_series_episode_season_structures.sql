-- Migration: Add Episode Layout & Season Engine for Series
-- Created: 2025-11-08
-- Purpose: Separate episode and season narrative structures for TV series

-- Add new columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS episode_layout TEXT,
ADD COLUMN IF NOT EXISTS season_engine TEXT;

-- Add comments for documentation
COMMENT ON COLUMN projects.episode_layout IS 'Episode narrative structure (series only): sitcom-2-act, sitcom-4-act, network-5-act, streaming-3-act, streaming-4-act, anime-ab, sketch-segmented, kids-11min';
COMMENT ON COLUMN projects.season_engine IS 'Season-level narrative engine (series only): serial, motw, hybrid, anthology, seasonal-anthology, limited-series';

-- Create index for filtering by episode layout
CREATE INDEX IF NOT EXISTS idx_projects_episode_layout ON projects(episode_layout) WHERE episode_layout IS NOT NULL;

-- Create index for filtering by season engine
CREATE INDEX IF NOT EXISTS idx_projects_season_engine ON projects(season_engine) WHERE season_engine IS NOT NULL;

-- No migration of existing data needed since these are new optional fields
