-- =====================================================
-- 📝 MIGRATION 023: EMERGENCY - Disable Activity Logs Triggers
-- 📅 Created: 2025-11-03
-- 🎯 Purpose: Temporarily disable broken triggers that block node creation
-- =====================================================
--
-- PROBLEM: The activity_logs triggers from migration 021 are breaking
-- because they reference NEW.user_id which doesn't exist in timeline_nodes.
--
-- SOLUTION: Drop the broken triggers immediately to unblock the app.
-- They will be recreated correctly when migration 021 + 022 are run.
-- =====================================================

-- Drop all activity logs triggers
DROP TRIGGER IF EXISTS timeline_nodes_audit ON timeline_nodes;
DROP TRIGGER IF EXISTS characters_audit ON characters;
DROP TRIGGER IF EXISTS projects_audit ON projects;

-- Drop all activity log functions
DROP FUNCTION IF EXISTS log_timeline_changes() CASCADE;
DROP FUNCTION IF EXISTS log_character_changes() CASCADE;
DROP FUNCTION IF EXISTS log_project_changes() CASCADE;

-- =====================================================
-- IMPORTANT: After running this migration:
-- 1. Activity logging is temporarily disabled
-- 2. You need to run migrations 021 + 022 to re-enable it
-- 3. The app will work normally without activity logs
-- =====================================================

COMMENT ON TABLE timeline_nodes IS 'Activity logging temporarily disabled - see migration 023';
