-- =====================================================
-- 📝 MIGRATION 026: Re-Enable Activity Logs (CORRECT SCHEMA)
-- 📅 Created: 2025-11-05
-- 🎯 Purpose: Re-enable activity logs with correct schema understanding
-- =====================================================
--
-- SCHEMA FACTS:
-- ✅ timeline_nodes has NO user_id (uses RLS with auth.uid())
-- ✅ shots has user_id column (added in migration 025)
-- ✅ characters has user_id column (added in migration 025)
-- ✅ projects has NO user_id (uses RLS)
--
-- STRATEGY:
-- - For tables WITH user_id: Use NEW.user_id
-- - For tables WITHOUT user_id: Use auth.uid()
-- =====================================================

-- =====================================================
-- 1. TIMELINE NODES TRIGGER (NO user_id column)
-- =====================================================

CREATE OR REPLACE FUNCTION log_timeline_node_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_entity_type VARCHAR(50);
  v_changes JSONB;
BEGIN
  -- Get user from RLS auth context
  v_user_id := auth.uid();
  
  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
  END IF;
  
  -- Determine entity type from level
  v_entity_type := CASE 
    WHEN COALESCE(NEW.level, OLD.level) = 1 THEN 'Act'
    WHEN COALESCE(NEW.level, OLD.level) = 2 THEN 'Sequence'
    WHEN COALESCE(NEW.level, OLD.level) = 3 THEN 'Scene'
    ELSE 'Node'
  END;
  
  -- Build changes object
  IF (TG_OP = 'DELETE') THEN
    v_changes := jsonb_build_object(
      'title', OLD.title,
      'level', OLD.level
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object(
        'title', OLD.title,
        'description', OLD.description
      ),
      'new', jsonb_build_object(
        'title', NEW.title,
        'description', NEW.description
      )
    );
  ELSE
    v_changes := jsonb_build_object(
      'title', NEW.title,
      'level', NEW.level
    );
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_logs (
    user_id,
    project_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    COALESCE(NEW.project_id, OLD.project_id),
    v_action,
    v_entity_type,
    COALESCE(NEW.id, OLD.id),
    v_changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS timeline_nodes_audit ON timeline_nodes;
CREATE TRIGGER timeline_nodes_audit
  AFTER INSERT OR UPDATE OR DELETE ON timeline_nodes
  FOR EACH ROW
  EXECUTE FUNCTION log_timeline_node_changes();

-- =====================================================
-- 2. SHOTS TRIGGER (HAS user_id column)
-- =====================================================

CREATE OR REPLACE FUNCTION log_shot_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
  v_project_id UUID;
BEGIN
  -- Get user_id from column (added in migration 025)
  v_user_id := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  
  -- Determine action
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
  END IF;
  
  -- Get project_id from shot
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Build changes
  IF (TG_OP = 'DELETE') THEN
    v_changes := jsonb_build_object(
      'shot_number', OLD.shot_number,
      'description', OLD.description
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object(
        'shot_number', OLD.shot_number,
        'description', OLD.description,
        'camera_angle', OLD.camera_angle
      ),
      'new', jsonb_build_object(
        'shot_number', NEW.shot_number,
        'description', NEW.description,
        'camera_angle', NEW.camera_angle
      )
    );
  ELSE
    v_changes := jsonb_build_object(
      'shot_number', NEW.shot_number,
      'description', NEW.description
    );
  END IF;
  
  -- Insert log
  INSERT INTO activity_logs (
    user_id,
    project_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    v_project_id,
    v_action,
    'Shot',
    COALESCE(NEW.id, OLD.id),
    v_changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS shots_audit ON shots;
CREATE TRIGGER shots_audit
  AFTER INSERT OR UPDATE OR DELETE ON shots
  FOR EACH ROW
  EXECUTE FUNCTION log_shot_changes();

-- =====================================================
-- 3. CHARACTERS TRIGGER (HAS user_id column)
-- =====================================================

CREATE OR REPLACE FUNCTION log_character_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
  v_project_id UUID;
BEGIN
  -- Get user_id from column (added in migration 025)
  v_user_id := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  
  -- Determine action
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
  END IF;
  
  -- Get project_id
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Build changes
  IF (TG_OP = 'DELETE') THEN
    v_changes := jsonb_build_object(
      'name', OLD.name,
      'description', OLD.description
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object(
        'name', OLD.name,
        'description', OLD.description
      ),
      'new', jsonb_build_object(
        'name', NEW.name,
        'description', NEW.description
      )
    );
  ELSE
    v_changes := jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description
    );
  END IF;
  
  -- Insert log
  INSERT INTO activity_logs (
    user_id,
    project_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    v_project_id,
    v_action,
    'Character',
    COALESCE(NEW.id, OLD.id),
    v_changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS characters_audit ON characters;
CREATE TRIGGER characters_audit
  AFTER INSERT OR UPDATE OR DELETE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION log_character_changes();

-- =====================================================
-- 4. PROJECTS TRIGGER (NO user_id column)
-- =====================================================

CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action VARCHAR(10);
  v_changes JSONB;
BEGIN
  -- Get user from RLS auth context
  v_user_id := auth.uid();
  
  -- Determine action
  IF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
  END IF;
  
  -- Build changes
  IF (TG_OP = 'DELETE') THEN
    v_changes := jsonb_build_object(
      'title', OLD.title,
      'type', OLD.type
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changes := jsonb_build_object(
      'old', jsonb_build_object(
        'title', OLD.title,
        'genre', OLD.genre
      ),
      'new', jsonb_build_object(
        'title', NEW.title,
        'genre', NEW.genre
      )
    );
  ELSE
    v_changes := jsonb_build_object(
      'title', NEW.title,
      'type', NEW.type
    );
  END IF;
  
  -- Insert log
  INSERT INTO activity_logs (
    user_id,
    project_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    COALESCE(NEW.id, OLD.id),
    v_action,
    'Project',
    COALESCE(NEW.id, OLD.id),
    v_changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS projects_audit ON projects;
CREATE TRIGGER projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_changes();

-- =====================================================
-- DONE!
-- =====================================================

COMMENT ON FUNCTION log_timeline_node_changes() IS 'Activity log trigger for timeline_nodes (uses auth.uid())';
COMMENT ON FUNCTION log_shot_changes() IS 'Activity log trigger for shots (uses user_id column)';
COMMENT ON FUNCTION log_character_changes() IS 'Activity log trigger for characters (uses user_id column)';
COMMENT ON FUNCTION log_project_changes() IS 'Activity log trigger for projects (uses auth.uid())';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 026 completed!';
  RAISE NOTICE 'Re-enabled activity logs with correct schema:';
  RAISE NOTICE '  - timeline_nodes: uses auth.uid()';
  RAISE NOTICE '  - shots: uses user_id column';
  RAISE NOTICE '  - characters: uses user_id column';
  RAISE NOTICE '  - projects: uses auth.uid()';
END $$;
