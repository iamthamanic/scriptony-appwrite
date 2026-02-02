-- Migration 018: Add Waveform Cache
-- Adds waveform_data column to shot_audio for server-side generated waveforms

ALTER TABLE shot_audio 
ADD COLUMN IF NOT EXISTS waveform_data JSONB,
ADD COLUMN IF NOT EXISTS waveform_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS audio_duration REAL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shot_audio_waveform_generated 
ON shot_audio(waveform_generated_at) 
WHERE waveform_data IS NOT NULL;

-- Add comments
COMMENT ON COLUMN shot_audio.waveform_data IS 'Cached waveform peaks data for fast rendering';
COMMENT ON COLUMN shot_audio.waveform_generated_at IS 'Timestamp when waveform was generated';
COMMENT ON COLUMN shot_audio.audio_duration IS 'Duration of audio file in seconds';
