-- =====================================================
-- 📝 MIGRATION 022: Fix Activity Logs Triggers
-- 📅 Created: 2025-11-02
-- 🎯 Purpose: Fix triggers to work with timeline_nodes schema
-- =====================================================
--
-- PROBLEM: The triggers in migration 021 reference columns that don't exist:
-- - timeline_nodes.duration (should be metadata.duration)
-- - timeline_nodes.camera_angle (should be metadata.cameraAngle)
-- - timeline_nodes.framing (should be metadata.framing)
-- - timeline_nodes.user_id (does not exist, RLS uses auth.uid())
--
-- SOLUTION: Update trigger functions to use metadata JSONB correctly
-- =====================================================

-- Drop and recreate the timeline_nodes trigger function
DROP FUNCTION IF EXISTS log_timeline_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_timeline_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      auth.uid(),
      'timeline_node', 
      NEW.id, 
      'created', 
      jsonb_build_object(
        'title', NEW.title, 
        'level', NEW.level,
        'node_type', CASE 
          WHEN NEW.level = 1 THEN 'Act'
          WHEN NEW.level = 2 THEN 'Sequence'
          WHEN NEW.level = 3 THEN 'Scene'
          WHEN NEW.level = 4 THEN 'Shot'
          ELSE 'Node'
        END
      )
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if meaningful fields changed
    IF OLD.title != NEW.title OR 
       (OLD.metadata->>'duration')::INTEGER IS DISTINCT FROM (NEW.metadata->>'duration')::INTEGER OR 
       OLD.metadata->>'cameraAngle' IS DISTINCT FROM NEW.metadata->>'cameraAngle' OR 
       OLD.metadata->>'framing' IS DISTINCT FROM NEW.metadata->>'framing' THEN
      
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.project_id, 
        auth.uid(),
        'timeline_node', 
        NEW.id, 
        'updated', 
        jsonb_build_object(
          'title', CASE WHEN OLD.title != NEW.title 
            THEN jsonb_build_object('old', OLD.title, 'new', NEW.title) 
            ELSE NULL END,
          'duration', CASE WHEN (OLD.metadata->>'duration')::INTEGER IS DISTINCT FROM (NEW.metadata->>'duration')::INTEGER 
            THEN jsonb_build_object('old', OLD.metadata->>'duration', 'new', NEW.metadata->>'duration') 
            ELSE NULL END,
          'cameraAngle', CASE WHEN OLD.metadata->>'cameraAngle' IS DISTINCT FROM NEW.metadata->>'cameraAngle' 
            THEN jsonb_build_object('old', OLD.metadata->>'cameraAngle', 'new', NEW.metadata->>'cameraAngle') 
            ELSE NULL END,
          'framing', CASE WHEN OLD.metadata->>'framing' IS DISTINCT FROM NEW.metadata->>'framing' 
            THEN jsonb_build_object('old', OLD.metadata->>'framing', 'new', NEW.metadata->>'framing') 
            ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.project_id, 
      auth.uid(),
      'timeline_node', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title, 'level', OLD.level)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS timeline_nodes_audit ON timeline_nodes;
CREATE TRIGGER timeline_nodes_audit
AFTER INSERT OR UPDATE OR DELETE ON timeline_nodes
FOR EACH ROW EXECUTE FUNCTION log_timeline_changes();

-- =====================================================
-- Fix Characters trigger (remove user_id references)
-- =====================================================

DROP FUNCTION IF EXISTS log_character_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_character_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      auth.uid(),
      'character', 
      NEW.id, 
      'created', 
      jsonb_build_object('name', NEW.name, 'role', NEW.role)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name != NEW.name OR OLD.role != NEW.role OR OLD.description != NEW.description THEN
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.project_id, 
        auth.uid(),
        'character', 
        NEW.id, 
        'updated', 
        jsonb_build_object(
          'name', CASE WHEN OLD.name != NEW.name THEN jsonb_build_object('old', OLD.name, 'new', NEW.name) ELSE NULL END,
          'role', CASE WHEN OLD.role != NEW.role THEN jsonb_build_object('old', OLD.role, 'new', NEW.role) ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.project_id, 
      auth.uid(),
      'character', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('name', OLD.name, 'role', OLD.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS characters_audit ON characters;
CREATE TRIGGER characters_audit
AFTER INSERT OR UPDATE OR DELETE ON characters
FOR EACH ROW EXECUTE FUNCTION log_character_changes();

-- =====================================================
-- Fix Projects trigger (remove user_id references)
-- =====================================================

DROP FUNCTION IF EXISTS log_project_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.id, 
      auth.uid(),
      'project', 
      NEW.id, 
      'created', 
      jsonb_build_object('title', NEW.title, 'type', NEW.type)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title != NEW.title OR 
       OLD.time_lock IS DISTINCT FROM NEW.time_lock OR 
       OLD.max_duration_seconds IS DISTINCT FROM NEW.max_duration_seconds THEN
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.id, 
        auth.uid(),
        'project', 
        NEW.id, 
        'updated', 
        jsonb_build_object(
          'title', CASE WHEN OLD.title != NEW.title 
            THEN jsonb_build_object('old', OLD.title, 'new', NEW.title) 
            ELSE NULL END,
          'time_lock', CASE WHEN OLD.time_lock IS DISTINCT FROM NEW.time_lock 
            THEN jsonb_build_object('old', OLD.time_lock, 'new', NEW.time_lock) 
            ELSE NULL END,
          'max_duration', CASE WHEN OLD.max_duration_seconds IS DISTINCT FROM NEW.max_duration_seconds 
            THEN jsonb_build_object('old', OLD.max_duration_seconds, 'new', NEW.max_duration_seconds) 
            ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.id, 
      auth.uid(),
      'project', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS projects_audit ON projects;
CREATE TRIGGER projects_audit
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- =====================================================
-- DONE!
-- =====================================================

COMMENT ON FUNCTION log_timeline_changes() IS 'Fixed to work with timeline_nodes.metadata JSONB structure';
COMMENT ON FUNCTION log_character_changes() IS 'Fixed to use auth.uid() instead of user_id column';
COMMENT ON FUNCTION log_project_changes() IS 'Fixed to use auth.uid() instead of user_id column';
