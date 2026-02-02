-- Migration 017: Add Audio Fade Fields
-- Adds fade_in and fade_out to shot_audio table for FL Studio-style fade functionality

ALTER TABLE shot_audio 
ADD COLUMN IF NOT EXISTS fade_in REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fade_out REAL DEFAULT 0;

-- Add comments
COMMENT ON COLUMN shot_audio.fade_in IS 'Fade in duration in seconds (supports decimals)';
COMMENT ON COLUMN shot_audio.fade_out IS 'Fade out duration in seconds (supports decimals)';
