DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'framing'
  ) THEN
    ALTER TABLE shots ADD COLUMN framing TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'dialog'
  ) THEN
    ALTER TABLE shots ADD COLUMN dialog TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'notes'
  ) THEN
    ALTER TABLE shots ADD COLUMN notes TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'shotlength_minutes'
  ) THEN
    ALTER TABLE shots ADD COLUMN shotlength_minutes INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'shotlength_seconds'
  ) THEN
    ALTER TABLE shots ADD COLUMN shotlength_seconds INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shots' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE shots ADD COLUMN image_url TEXT;
  END IF;
END $$;

COMMENT ON COLUMN shots.framing IS 'Bildausschnitt (ECU, CU, MCU, MS, WS, EWS, etc.)';
COMMENT ON COLUMN shots.dialog IS 'Dialog-Text mit @-Character-Mentions';
COMMENT ON COLUMN shots.notes IS 'Notizen zum Shot (z.B. "Establish, Blickachsen festlegen")';
COMMENT ON COLUMN shots.shotlength_minutes IS 'Länge des Shots in Minuten';
COMMENT ON COLUMN shots.shotlength_seconds IS 'Länge des Shots in Sekunden';
COMMENT ON COLUMN shots.image_url IS 'Preview-Bild für den Shot (Supabase Storage URL)';

CREATE TABLE IF NOT EXISTS shot_audio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('music', 'sfx')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  label TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shot_audio_shot ON shot_audio(shot_id);
CREATE INDEX IF NOT EXISTS idx_shot_audio_type ON shot_audio(shot_id, type);

COMMENT ON TABLE shot_audio IS 'Audio-Dateien für Shots (Musik und SFX)';
COMMENT ON COLUMN shot_audio.type IS 'Audio-Typ: "music" oder "sfx"';
COMMENT ON COLUMN shot_audio.label IS 'User-definiertes Label (z.B. "Raum-Atmo")';

CREATE TABLE IF NOT EXISTS shot_characters (
  shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shot_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_shot_characters_shot ON shot_characters(shot_id);
CREATE INDEX IF NOT EXISTS idx_shot_characters_character ON shot_characters(character_id);

COMMENT ON TABLE shot_characters IS 'Many-to-Many: Characters die in einem Shot vorkommen';

ALTER TABLE shot_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shot audio" ON shot_audio;
CREATE POLICY "Users can view shot audio"
  ON shot_audio FOR SELECT
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM scenes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage shot audio" ON shot_audio;
CREATE POLICY "Editors can manage shot audio"
  ON shot_audio FOR ALL
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM scenes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can view shot characters" ON shot_characters;
CREATE POLICY "Users can view shot characters"
  ON shot_characters FOR SELECT
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM scenes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage shot characters" ON shot_characters;
CREATE POLICY "Editors can manage shot characters"
  ON shot_characters FOR ALL
  USING (
    shot_id IN (
      SELECT id FROM shots
      WHERE scene_id IN (
        SELECT id FROM scenes 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
          )
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION get_shot_characters(p_shot_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.avatar_url,
    sc.added_at
  FROM characters c
  INNER JOIN shot_characters sc ON c.id = sc.character_id
  WHERE sc.shot_id = p_shot_id
  ORDER BY sc.added_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_shot_characters IS 'Gibt alle Characters eines Shots mit Details zurück';

CREATE OR REPLACE FUNCTION add_character_to_shot(
  p_shot_id UUID,
  p_character_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO shot_characters (shot_id, character_id)
  VALUES (p_shot_id, p_character_id)
  ON CONFLICT (shot_id, character_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_character_to_shot IS 'Fügt einen Character zu einem Shot hinzu (idempotent)';

CREATE OR REPLACE FUNCTION remove_character_from_shot(
  p_shot_id UUID,
  p_character_id UUID
) RETURNS void AS $$
BEGIN
  DELETE FROM shot_characters 
  WHERE shot_id = p_shot_id 
  AND character_id = p_character_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_character_from_shot IS 'Entfernt einen Character von einem Shot';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 completed successfully!';
  RAISE NOTICE 'Added fields: framing, dialog, notes, shotlength_minutes, shotlength_seconds, image_url';
  RAISE NOTICE 'Created tables: shot_audio, shot_characters';
  RAISE NOTICE 'Created functions: get_shot_characters, add_character_to_shot, remove_character_from_shot';
END $$;
