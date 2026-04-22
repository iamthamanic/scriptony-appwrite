-- Hörspiel Audio Production Schema
-- Zusätzliche Tabellen für scriptony-audio-story Function

-- ============================================
-- SCENE_AUDIO_TRACKS
-- Audio-Tracks pro Szene (Dialog, Musik, SFX, Atmo)
-- ============================================
CREATE TABLE scene_audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Track Typ
    type VARCHAR(20) NOT NULL CHECK (type IN ('dialog', 'narrator', 'music', 'sfx', 'atmo')),
    
    -- Content (für Dialog: der Text, für Musik: Beschreibung/Label)
    content TEXT,
    
    -- Charakter-Referenz (für Dialog-Tracks)
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    
    -- Audio Datei (Appwrite Storage)
    audio_file_id VARCHAR(255),
    audio_file_url TEXT,
    
    -- Waveform Daten für Visualisierung
    waveform_data JSONB,
    audio_duration FLOAT,
    
    -- Timing
    start_time FLOAT NOT NULL DEFAULT 0, -- Offset in der Szene (Sekunden)
    duration FLOAT NOT NULL DEFAULT 0,
    fade_in FLOAT DEFAULT 0,
    fade_out FLOAT DEFAULT 0,
    
    -- TTS spezifisch
    tts_voice_id VARCHAR(100),
    tts_settings JSONB, -- { emotion, stability, style, speed }
    tts_audio_generated BOOLEAN DEFAULT FALSE,
    
    -- Metadaten
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scene_audio_tracks_scene ON scene_audio_tracks(scene_id);
CREATE INDEX idx_scene_audio_tracks_project ON scene_audio_tracks(project_id);
CREATE INDEX idx_scene_audio_tracks_character ON scene_audio_tracks(character_id);
CREATE INDEX idx_scene_audio_tracks_type ON scene_audio_tracks(type);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scene_audio_tracks_updated_at 
    BEFORE UPDATE ON scene_audio_tracks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIO_SESSIONS
-- Recording Sessions für Multi-User Recording
-- ============================================
CREATE TABLE audio_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Session Status
    status VARCHAR(20) NOT NULL DEFAULT 'preparing' 
        CHECK (status IN ('preparing', 'ready', 'recording', 'paused', 'completed', 'cancelled')),
    
    -- Aufnahme
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    recording_url TEXT, -- Appwrite Storage URL
    recording_duration FLOAT, -- Sekunden
    
    -- Metadaten
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_sessions_scene ON audio_sessions(scene_id);
CREATE INDEX idx_audio_sessions_project ON audio_sessions(project_id);
CREATE INDEX idx_audio_sessions_status ON audio_sessions(status);

CREATE TRIGGER update_audio_sessions_updated_at 
    BEFORE UPDATE ON audio_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIO_SESSION_PARTICIPANTS
-- Teilnehmer einer Recording Session
-- ============================================
CREATE TABLE audio_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES audio_sessions(id) ON DELETE CASCADE,
    
    -- Teilnehmer kann Charakter oder externer Sprecher sein
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Für registrierte Sprecher
    
    -- Externer Sprecher (nicht im System)
    external_speaker_name VARCHAR(255),
    external_speaker_email VARCHAR(255),
    
    -- Rolle in der Session
    role VARCHAR(20) NOT NULL DEFAULT 'speaker' 
        CHECK (role IN ('speaker', 'director', 'technician', 'observer')),
    
    -- WebRTC/Connection Info (für spätere Integration)
    connection_id VARCHAR(255),
    
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_session_participants_session ON audio_session_participants(session_id);

-- ============================================
-- CHARACTER_VOICE_ASSIGNMENTS
-- Voice Casting: Welcher Sprecher/TTS für welchen Charakter
-- ============================================
CREATE TABLE character_voice_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    
    -- Voice Actor Typ
    voice_actor_type VARCHAR(20) NOT NULL CHECK (voice_actor_type IN ('human', 'tts')),
    
    -- Für Human Voice Actor
    voice_actor_name VARCHAR(255),
    voice_actor_contact TEXT,
    voice_actor_notes TEXT,
    
    -- Für TTS
    tts_provider VARCHAR(50), -- 'openai', 'elevenlabs', 'google'
    tts_voice_id VARCHAR(100),
    tts_voice_preset JSONB, -- { voice, model, settings }
    
    -- Beispiel-Audios
    sample_audio_url TEXT,
    sample_text TEXT,
    
    -- Metadaten
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique Constraint: Ein Charakter pro Projekt nur ein Voice Assignment
    UNIQUE(project_id, character_id)
);

CREATE INDEX idx_character_voice_assignments_project ON character_voice_assignments(project_id);
CREATE INDEX idx_character_voice_assignments_character ON character_voice_assignments(character_id);

CREATE TRIGGER update_character_voice_assignments_updated_at 
    BEFORE UPDATE ON character_voice_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HASURA TRACKING (optional, falls Hasura verwendet wird)
-- ============================================
-- Diese Tabellen sollten in Hasura als "tracked" markiert werden
-- mit entsprechenden Permissions für die user Rolle.
-- Siehe dazu: hasura-metadata/...