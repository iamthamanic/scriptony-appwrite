-- =====================================================
-- KOMBINIERTE MIGRATION: 008 + 009
-- =====================================================
-- Führt beide Migrationen in der richtigen Reihenfolge aus:
-- 1. Migration 008: Acts & Shots
-- 2. Migration 009: Sequences
-- =====================================================

-- =====================================================
-- MIGRATION 008: ACTS & SHOTS SYSTEM
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS acts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Act Info
  act_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  
  -- Visual/UI
  color TEXT DEFAULT '#00CCC0',
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(project_id, act_number)
);

CREATE INDEX IF NOT EXISTS idx_acts_project ON acts(project_id);
CREATE INDEX IF NOT EXISTS idx_acts_order ON acts(project_id, order_index);

COMMENT ON TABLE acts IS 'Acts in einem Film (z.B. 3-Akt-Struktur)';

-- =====================================================
-- SHOTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  
  -- Shot Info
  shot_number TEXT NOT NULL,
  description TEXT,
  
  -- Camera
  camera_angle TEXT,
  camera_movement TEXT,
  lens TEXT,
  
  -- Timing
  duration TEXT,
  
  -- Visual
  composition TEXT,
  lighting_notes TEXT,
  
  -- Audio
  sound_notes TEXT,
  
  -- Production
  storyboard_url TEXT,
  reference_image_url TEXT,
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_shots_order ON shots(scene_id, order_index);

COMMENT ON TABLE shots IS 'Einzelne Kameraeinstellungen innerhalb einer Szene';

-- =====================================================
-- UPDATE SCENES TABLE (Add act_id)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenes' AND column_name = 'act_id'
  ) THEN
    ALTER TABLE scenes ADD COLUMN act_id UUID REFERENCES acts(id) ON DELETE SET NULL;
    CREATE INDEX idx_scenes_act ON scenes(act_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenes' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE scenes ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (Acts)
-- =====================================================

ALTER TABLE acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view acts" ON acts;
CREATE POLICY "Users can view acts"
  ON acts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage acts" ON acts;
CREATE POLICY "Editors can manage acts"
  ON acts FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- =====================================================
-- ROW LEVEL SECURITY (Shots)
-- =====================================================

ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shots" ON shots;
CREATE POLICY "Users can view shots"
  ON shots FOR SELECT
  USING (
    scene_id IN (
      SELECT id FROM scenes 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage shots" ON shots;
CREATE POLICY "Editors can manage shots"
  ON shots FOR ALL
  USING (
    scene_id IN (
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
  );

-- =====================================================
-- TRIGGERS (Migration 008)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_acts_updated_at ON acts;
CREATE TRIGGER update_acts_updated_at BEFORE UPDATE ON acts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shots_updated_at ON shots;
CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON shots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REORDER FUNCTIONS (Migration 008)
-- =====================================================

CREATE OR REPLACE FUNCTION reorder_acts_in_project(
  p_project_id UUID,
  p_act_ids UUID[]
) RETURNS void AS $$
DECLARE
  act_id UUID;
  idx INTEGER := 0;
BEGIN
  FOREACH act_id IN ARRAY p_act_ids
  LOOP
    UPDATE acts 
    SET order_index = idx 
    WHERE id = act_id AND project_id = p_project_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reorder_shots_in_scene(
  p_scene_id UUID,
  p_shot_ids UUID[]
) RETURNS void AS $$
DECLARE
  shot_id UUID;
  idx INTEGER := 0;
BEGIN
  FOREACH shot_id IN ARRAY p_shot_ids
  LOOP
    UPDATE shots 
    SET order_index = idx 
    WHERE id = shot_id AND scene_id = p_scene_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION 009: SEQUENCES SYSTEM
-- =====================================================

-- =====================================================
-- SEQUENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  
  -- Sequence Info
  sequence_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  
  -- Visual/UI
  color TEXT DEFAULT '#98E5B4',
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(act_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_sequences_act ON sequences(act_id);
CREATE INDEX IF NOT EXISTS idx_sequences_order ON sequences(act_id, order_index);

COMMENT ON TABLE sequences IS 'Sequenzen innerhalb eines Acts';

-- =====================================================
-- UPDATE SCENES TABLE (Add sequence_id)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenes' AND column_name = 'sequence_id'
  ) THEN
    ALTER TABLE scenes ADD COLUMN sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL;
    CREATE INDEX idx_scenes_sequence ON scenes(sequence_id);
  END IF;
END $$;

COMMENT ON COLUMN scenes.sequence_id IS 'Zugehörige Sequenz (Act → Sequence → Scene)';

-- =====================================================
-- ROW LEVEL SECURITY (Sequences)
-- =====================================================

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sequences" ON sequences;
CREATE POLICY "Users can view sequences"
  ON sequences FOR SELECT
  USING (
    act_id IN (
      SELECT id FROM acts 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can manage sequences" ON sequences;
CREATE POLICY "Editors can manage sequences"
  ON sequences FOR ALL
  USING (
    act_id IN (
      SELECT id FROM acts 
      WHERE project_id IN (
        SELECT id FROM projects 
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid() 
          AND role IN ('owner', 'admin', 'editor')
        )
      )
    )
  );

-- =====================================================
-- TRIGGERS (Migration 009)
-- =====================================================

DROP TRIGGER IF EXISTS update_sequences_updated_at ON sequences;
CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REORDER FUNCTIONS (Migration 009)
-- =====================================================

CREATE OR REPLACE FUNCTION reorder_sequences_in_act(
  p_act_id UUID,
  p_sequence_ids UUID[]
) RETURNS void AS $$
DECLARE
  sequence_id UUID;
  idx INTEGER := 0;
BEGIN
  FOREACH sequence_id IN ARRAY p_sequence_ids
  LOOP
    UPDATE sequences 
    SET order_index = idx 
    WHERE id = sequence_id AND act_id = p_act_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reorder_scenes_in_sequence(
  p_sequence_id UUID,
  p_scene_ids UUID[]
) RETURNS void AS $$
DECLARE
  scene_id UUID;
  idx INTEGER := 0;
BEGIN
  FOREACH scene_id IN ARRAY p_scene_ids
  LOOP
    UPDATE scenes 
    SET order_index = idx, sequence_id = p_sequence_id
    WHERE id = scene_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA MIGRATION HELPER (Optional)
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_scenes_to_sequences() RETURNS void AS $$
DECLARE
  act_record RECORD;
  new_sequence_id UUID;
BEGIN
  FOR act_record IN 
    SELECT DISTINCT act_id 
    FROM scenes 
    WHERE act_id IS NOT NULL 
    AND sequence_id IS NULL
  LOOP
    INSERT INTO sequences (
      act_id, 
      sequence_number, 
      title, 
      description,
      color,
      order_index
    ) VALUES (
      act_record.act_id,
      1,
      'Main Sequence',
      'Auto-migrated sequence from existing scenes',
      '#98E5B4',
      0
    )
    RETURNING id INTO new_sequence_id;
    
    UPDATE scenes 
    SET sequence_id = new_sequence_id
    WHERE act_id = act_record.act_id
    AND sequence_id IS NULL;
    
    RAISE NOTICE 'Created sequence % for act %', new_sequence_id, act_record.act_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE! 🎉
-- =====================================================

-- Migration 008 + 009 erfolgreich ausgeführt!
-- Du hast jetzt:
-- ✅ Acts Tabelle
-- ✅ Shots Tabelle  
-- ✅ Sequences Tabelle
-- ✅ Scenes mit act_id und sequence_id
-- ✅ RLS Policies
-- ✅ Reorder Functions
-- ✅ Triggers
