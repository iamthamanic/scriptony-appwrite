/**
 * 🎬 STORY BEATS SYSTEM
 * 
 * Beat-Tracking für narrative Struktur (Save the Cat, Hero's Journey, etc.)
 * - Beats haben Start/End Container (Timeline Nodes)
 * - Percentage-based Positionierung (0-100%)
 * - Template-Zuordnung (STC, HJ, Custom, etc.)
 */

-- =====================================================
-- TABLE: story_beats
-- =====================================================

CREATE TABLE IF NOT EXISTS public.story_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Beat Metadata
  label TEXT NOT NULL,                   -- "Opening Image", "Catalyst", "Break into Two", etc.
  template_abbr TEXT,                    -- "STC", "HJ", "CUSTOM", etc.
  description TEXT,                      -- Optional ausführliche Beschreibung
  
  -- Position (Container-based)
  from_container_id TEXT NOT NULL,       -- Timeline Node ID (Start)
  to_container_id TEXT NOT NULL,         -- Timeline Node ID (End)
  
  -- Position (Percentage-based, 0-100)
  pct_from NUMERIC(5,2) DEFAULT 0 CHECK (pct_from >= 0 AND pct_from <= 100),
  pct_to NUMERIC(5,2) DEFAULT 0 CHECK (pct_to >= 0 AND pct_to <= 100),
  
  -- Color (optional, für Custom Templates)
  color TEXT,                            -- Hex color, z.B. "#6E59A5"
  
  -- Metadata
  notes TEXT,                            -- Notizen zum Beat
  order_index INTEGER DEFAULT 0,         -- Reihenfolge innerhalb des Templates
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_story_beats_project_id ON public.story_beats(project_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_user_id ON public.story_beats(user_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_template ON public.story_beats(template_abbr);
CREATE INDEX IF NOT EXISTS idx_story_beats_order ON public.story_beats(project_id, order_index);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.story_beats ENABLE ROW LEVEL SECURITY;

-- Users can view beats from projects they own
CREATE POLICY "Users can view their story beats"
  ON public.story_beats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = story_beats.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can insert beats into their own projects
CREATE POLICY "Users can create story beats"
  ON public.story_beats
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can update their own beats
CREATE POLICY "Users can update their story beats"
  ON public.story_beats
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = story_beats.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can delete their own beats
CREATE POLICY "Users can delete their story beats"
  ON public.story_beats
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = story_beats.project_id
      AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_story_beats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER story_beats_updated_at
  BEFORE UPDATE ON public.story_beats
  FOR EACH ROW
  EXECUTE FUNCTION update_story_beats_updated_at();

-- =====================================================
-- ACTIVITY LOGS TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION log_story_beats_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
  v_action TEXT;
  v_details JSONB;
BEGIN
  -- Determine project_id and user_id
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_user_id := OLD.user_id;
  ELSE
    v_project_id := NEW.project_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'beat_created';
    v_details := jsonb_build_object(
      'beat_id', NEW.id,
      'label', NEW.label,
      'template_abbr', NEW.template_abbr,
      'from_container_id', NEW.from_container_id,
      'to_container_id', NEW.to_container_id,
      'pct_from', NEW.pct_from,
      'pct_to', NEW.pct_to
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'beat_updated';
    v_details := jsonb_build_object(
      'beat_id', NEW.id,
      'label', NEW.label,
      'template_abbr', NEW.template_abbr,
      'changes', jsonb_build_object(
        'label', CASE WHEN OLD.label IS DISTINCT FROM NEW.label THEN jsonb_build_object('old', OLD.label, 'new', NEW.label) ELSE NULL END,
        'from_container_id', CASE WHEN OLD.from_container_id IS DISTINCT FROM NEW.from_container_id THEN jsonb_build_object('old', OLD.from_container_id, 'new', NEW.from_container_id) ELSE NULL END,
        'to_container_id', CASE WHEN OLD.to_container_id IS DISTINCT FROM NEW.to_container_id THEN jsonb_build_object('old', OLD.to_container_id, 'new', NEW.to_container_id) ELSE NULL END,
        'pct_from', CASE WHEN OLD.pct_from IS DISTINCT FROM NEW.pct_from THEN jsonb_build_object('old', OLD.pct_from, 'new', NEW.pct_from) ELSE NULL END,
        'pct_to', CASE WHEN OLD.pct_to IS DISTINCT FROM NEW.pct_to THEN jsonb_build_object('old', OLD.pct_to, 'new', NEW.pct_to) ELSE NULL END
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'beat_deleted';
    v_details := jsonb_build_object(
      'beat_id', OLD.id,
      'label', OLD.label,
      'template_abbr', OLD.template_abbr
    );
  END IF;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    details
  ) VALUES (
    v_project_id,
    v_user_id,
    'StoryBeat',
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_details
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER story_beats_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.story_beats
  FOR EACH ROW
  EXECUTE FUNCTION log_story_beats_activity();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.story_beats IS 'Story beats for narrative structure tracking (Save the Cat, Hero''s Journey, etc.)';
COMMENT ON COLUMN public.story_beats.label IS 'Beat name (e.g., "Opening Image", "Catalyst")';
COMMENT ON COLUMN public.story_beats.template_abbr IS 'Template abbreviation (e.g., "STC", "HJ")';
COMMENT ON COLUMN public.story_beats.from_container_id IS 'Timeline node ID where beat starts';
COMMENT ON COLUMN public.story_beats.to_container_id IS 'Timeline node ID where beat ends';
COMMENT ON COLUMN public.story_beats.pct_from IS 'Start position as percentage (0-100)';
COMMENT ON COLUMN public.story_beats.pct_to IS 'End position as percentage (0-100)';