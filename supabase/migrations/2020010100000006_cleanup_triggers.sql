-- ==========================================
-- CLEANUP: Remove problematic triggers
-- ==========================================
-- Migration to remove auto-sync triggers that fail on tables without organization_id
-- Date: 2025-10-15

BEGIN;

-- Remove all auto-sync triggers (we handle RAG sync manually in tools)
DROP TRIGGER IF EXISTS scenes_rag_auto_sync ON scenes;
DROP TRIGGER IF EXISTS characters_rag_auto_sync ON characters;
DROP TRIGGER IF EXISTS projects_rag_auto_sync ON projects;
DROP TRIGGER IF EXISTS world_items_rag_auto_sync ON world_items;
DROP TRIGGER IF EXISTS episodes_rag_auto_sync ON episodes;

-- Remove trigger function (not needed anymore)
DROP FUNCTION IF EXISTS trigger_rag_sync();

-- Success!
COMMIT;
