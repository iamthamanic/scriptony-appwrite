-- Migration 016: Add audio trimming fields
-- Adds start_time and end_time to shot_audio table for audio trimming functionality

ALTER TABLE shot_audio 
ADD COLUMN IF NOT EXISTS start_time INTEGER,
ADD COLUMN IF NOT EXISTS end_time INTEGER;

COMMENT ON COLUMN shot_audio.start_time IS 'Start time in seconds for audio trimming';
COMMENT ON COLUMN shot_audio.end_time IS 'End time in seconds for audio trimming';
