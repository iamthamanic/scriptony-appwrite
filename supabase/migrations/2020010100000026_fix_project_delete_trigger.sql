-- =====================================================
-- 📝 MIGRATION 027: Fix Project DELETE Trigger
-- 📅 Created: 2025-11-06
-- 🎯 Purpose: Prevent FK constraint error when deleting projects
-- =====================================================
--
-- PROBLEM:
-- The projects_audit trigger fires AFTER DELETE and tries to insert
-- an activity_log with the deleted project's ID as project_id.
-- But the project no longer exists → FK constraint violation!
--
-- SOLUTION:
-- Skip activity log creation on DELETE for projects.
-- The CASCADE rule on activity_logs.project_id will delete all logs anyway.
--
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
    -- ⚠️ SKIP DELETE LOGGING!
    -- Reason: Project is being deleted, so project_id FK will fail.
    -- All activity_logs will be CASCADE deleted anyway.
    RETURN OLD;
  END IF;
  
  -- Build changes
  IF (TG_OP = 'UPDATE') THEN
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
  ELSE -- INSERT
    v_changes := jsonb_build_object(
      'title', NEW.title,
      'type', NEW.type
    );
  END IF;
  
  -- Insert log (only for CREATE/UPDATE)
  INSERT INTO activity_logs (
    user_id,
    project_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    NEW.id,  -- Use NEW only (no DELETE here)
    v_action,
    'Project',
    NEW.id,
    v_changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists from migration 026, no need to recreate
-- (But we're updating the function)

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 027 completed!';
  RAISE NOTICE 'Fixed: Project DELETE trigger now skips activity log creation';
  RAISE NOTICE 'Why: CASCADE deletion removes logs anyway + prevents FK error';
END $$;
