/**
 * 🔐 MIGRATION 025: Add user_id to tables for Activity Logs
 * 
 * ✅ PROPER SOLUTION: Real User Attribution
 * 📅 Created: 2025-11-05
 * 
 * PROBLEM:
 * - Database Triggers use auth.uid() which returns NULL in Edge Function context
 * - Edge Functions use SUPABASE_SERVICE_ROLE_KEY, not user tokens
 * - Result: Activity logs fail with "user_id NOT NULL constraint violation"
 * 
 * SOLUTION:
 * 1. Add user_id column to timeline_nodes, characters, projects
 * 2. Make activity_logs.user_id NULLABLE (fallback for system actions)
 * 3. Update Edge Functions to set user_id when creating/updating
 * 4. Update Triggers to use NEW.user_id instead of auth.uid()
 * 
 * BENEFITS:
 * - ✅ Real user attribution in activity logs
 * - ✅ Multi-user ready (für spätere Collaboration Features)
 * - ✅ System actions können NULL user_id haben
 * - ✅ No more constraint violations
 */

-- =============================================================================
-- STEP 1: Make activity_logs.user_id NULLABLE (system actions fallback)
-- =============================================================================

ALTER TABLE activity_logs 
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN activity_logs.user_id IS 'User who performed the action. NULL for system actions.';

-- =============================================================================
-- STEP 2: Add user_id to timeline_nodes
-- =============================================================================

ALTER TABLE timeline_nodes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN timeline_nodes.user_id IS 'User who created/last modified this node';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_user_id ON timeline_nodes(user_id);

-- =============================================================================
-- STEP 3: Add user_id to characters
-- =============================================================================

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN characters.user_id IS 'User who created/last modified this character';

-- Create index
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);

-- =============================================================================
-- STEP 4: Add user_id to projects
-- =============================================================================

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN projects.user_id IS 'User who created/last modified this project';

-- Create index
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- =============================================================================
-- STEP 5: Update Activity Log Triggers to use NEW.user_id
-- =============================================================================

-- Timeline Nodes Trigger (FIXED to use NEW.user_id)
CREATE OR REPLACE FUNCTION log_timeline_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      NEW.user_id,  -- Use user_id from the record, not auth.uid()
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
    IF OLD.title != NEW.title OR 
       (OLD.metadata->>'duration')::INTEGER IS DISTINCT FROM (NEW.metadata->>'duration')::INTEGER OR 
       OLD.metadata->>'cameraAngle' IS DISTINCT FROM NEW.metadata->>'cameraAngle' OR 
       OLD.metadata->>'framing' IS DISTINCT FROM NEW.metadata->>'framing' THEN
      
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.project_id, 
        NEW.user_id,  -- Use user_id from the record
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
      OLD.user_id,  -- Use user_id from the deleted record
      'timeline_node', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title, 'level', OLD.level)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Characters Trigger (FIXED to use NEW.user_id)
CREATE OR REPLACE FUNCTION log_character_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      NEW.user_id,  -- Use user_id from the record
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
        NEW.user_id,  -- Use user_id from the record
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
      OLD.user_id,  -- Use user_id from the deleted record
      'character', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('name', OLD.name, 'role', OLD.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Projects Trigger (FIXED to use NEW.user_id)
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.id, 
      NEW.user_id,  -- Use user_id from the record
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
        NEW.user_id,  -- Use user_id from the record
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
      OLD.user_id,  -- Use user_id from the deleted record
      'project', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Triggers
DROP TRIGGER IF EXISTS timeline_nodes_audit ON timeline_nodes;
CREATE TRIGGER timeline_nodes_audit
AFTER INSERT OR UPDATE OR DELETE ON timeline_nodes
FOR EACH ROW EXECUTE FUNCTION log_timeline_changes();

DROP TRIGGER IF EXISTS characters_audit ON characters;
CREATE TRIGGER characters_audit
AFTER INSERT OR UPDATE OR DELETE ON characters
FOR EACH ROW EXECUTE FUNCTION log_character_changes();

DROP TRIGGER IF EXISTS projects_audit ON projects;
CREATE TRIGGER projects_audit
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 
  'Migration 025 complete! Tables now have user_id columns for proper Activity Logs attribution.' as status,
  'Next step: Update Edge Functions to set user_id when creating/updating records.' as next_action;
