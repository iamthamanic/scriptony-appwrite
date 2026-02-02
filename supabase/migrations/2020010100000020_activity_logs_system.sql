-- =====================================================
-- 📝 MIGRATION 021: Activity Logs System
-- 📅 Created: 2025-11-02
-- 🎯 Purpose: Complete audit trail for all project changes
-- =====================================================

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL, -- 'project', 'timeline_node', 'character', 'world'
  entity_id UUID,
  action TEXT NOT NULL,      -- 'created', 'updated', 'deleted', 'reordered'
  details JSONB,             -- { field: 'title', old: 'X', new: 'Y' }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read logs for their own projects
CREATE POLICY activity_logs_read_own ON activity_logs
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: System can insert logs (via service role)
CREATE POLICY activity_logs_insert_system ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to log timeline_nodes changes
CREATE OR REPLACE FUNCTION log_timeline_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      COALESCE(auth.uid(), NEW.user_id),
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
    IF OLD.title != NEW.title OR OLD.duration != NEW.duration OR 
       OLD.camera_angle != NEW.camera_angle OR OLD.framing != NEW.framing THEN
      
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.project_id, 
        COALESCE(auth.uid(), NEW.user_id),
        'timeline_node', 
        NEW.id, 
        'updated', 
        jsonb_build_object(
          'title', CASE WHEN OLD.title != NEW.title THEN jsonb_build_object('old', OLD.title, 'new', NEW.title) ELSE NULL END,
          'duration', CASE WHEN OLD.duration != NEW.duration THEN jsonb_build_object('old', OLD.duration, 'new', NEW.duration) ELSE NULL END,
          'camera_angle', CASE WHEN OLD.camera_angle != NEW.camera_angle THEN jsonb_build_object('old', OLD.camera_angle, 'new', NEW.camera_angle) ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.project_id, 
      COALESCE(auth.uid(), OLD.user_id),
      'timeline_node', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title, 'level', OLD.level)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log characters changes
CREATE OR REPLACE FUNCTION log_character_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.project_id, 
      COALESCE(auth.uid(), NEW.user_id),
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
        COALESCE(auth.uid(), NEW.user_id),
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
      COALESCE(auth.uid(), OLD.user_id),
      'character', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('name', OLD.name, 'role', OLD.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log projects changes
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.id, 
      COALESCE(auth.uid(), NEW.user_id),
      'project', 
      NEW.id, 
      'created', 
      jsonb_build_object('title', NEW.title, 'type', NEW.type)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title != NEW.title OR OLD.time_lock != NEW.time_lock OR OLD.max_duration_seconds != NEW.max_duration_seconds THEN
      INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
      VALUES (
        NEW.id, 
        COALESCE(auth.uid(), NEW.user_id),
        'project', 
        NEW.id, 
        'updated', 
        jsonb_build_object(
          'title', CASE WHEN OLD.title != NEW.title THEN jsonb_build_object('old', OLD.title, 'new', NEW.title) ELSE NULL END,
          'time_lock', CASE WHEN OLD.time_lock != NEW.time_lock THEN jsonb_build_object('old', OLD.time_lock, 'new', NEW.time_lock) ELSE NULL END,
          'max_duration', CASE WHEN OLD.max_duration_seconds != NEW.max_duration_seconds THEN jsonb_build_object('old', OLD.max_duration_seconds, 'new', NEW.max_duration_seconds) ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (project_id, user_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.id, 
      COALESCE(auth.uid(), OLD.user_id),
      'project', 
      OLD.id, 
      'deleted', 
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ATTACH TRIGGERS
-- =====================================================

-- Timeline nodes trigger
DROP TRIGGER IF EXISTS timeline_nodes_audit ON timeline_nodes;
CREATE TRIGGER timeline_nodes_audit
AFTER INSERT OR UPDATE OR DELETE ON timeline_nodes
FOR EACH ROW EXECUTE FUNCTION log_timeline_changes();

-- Characters trigger
DROP TRIGGER IF EXISTS characters_audit ON characters;
CREATE TRIGGER characters_audit
AFTER INSERT OR UPDATE OR DELETE ON characters
FOR EACH ROW EXECUTE FUNCTION log_character_changes();

-- Projects trigger
DROP TRIGGER IF EXISTS projects_audit ON projects;
CREATE TRIGGER projects_audit
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE activity_logs IS 'Comprehensive audit trail for all project changes';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity: project, timeline_node, character, world';
COMMENT ON COLUMN activity_logs.action IS 'Action performed: created, updated, deleted, reordered';
COMMENT ON COLUMN activity_logs.details IS 'JSON details of what changed';
