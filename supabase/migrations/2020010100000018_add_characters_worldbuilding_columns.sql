/**
 * 🔧 Migration 019: Add Worldbuilding Columns to Characters
 * 
 * PROBLEM: Characters table fehlen die Spalten für Worldbuilding-Integration:
 * - world_id (für Worldbuilding-Characters)
 * - organization_id (für Multi-Tenant)
 * - image_url (statt avatar_url)
 * - backstory, personality, color (zusätzliche Felder)
 * 
 * Diese Migration macht die Characters-Tabelle kompatibel mit beiden Systemen:
 * - Timeline Characters (mit project_id)
 * - Worldbuilding Characters (mit world_id + organization_id)
 */

-- Add missing columns for Worldbuilding integration
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS world_id UUID REFERENCES worlds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS backstory TEXT,
  ADD COLUMN IF NOT EXISTS personality TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_characters_world ON characters(world_id);
CREATE INDEX IF NOT EXISTS idx_characters_org ON characters(organization_id);

-- Make project_id nullable (because Worldbuilding characters might not have a project)
ALTER TABLE characters
  ALTER COLUMN project_id DROP NOT NULL;

-- Migrate existing avatar_url to image_url (if not already set)
UPDATE characters
SET image_url = avatar_url
WHERE image_url IS NULL AND avatar_url IS NOT NULL;

-- Add check constraint: Character must have either project_id OR (world_id AND organization_id)
ALTER TABLE characters
  ADD CONSTRAINT characters_project_or_world_check 
  CHECK (
    (project_id IS NOT NULL) OR 
    (world_id IS NOT NULL AND organization_id IS NOT NULL)
  );

COMMENT ON COLUMN characters.world_id IS 'For Worldbuilding characters - links to a world';
COMMENT ON COLUMN characters.organization_id IS 'For Worldbuilding characters - links to organization';
COMMENT ON COLUMN characters.image_url IS 'Character image URL (replaces avatar_url for consistency)';
COMMENT ON COLUMN characters.backstory IS 'Character backstory (Worldbuilding)';
COMMENT ON COLUMN characters.personality IS 'Character personality (Worldbuilding)';
COMMENT ON COLUMN characters.color IS 'Character color for UI (hex code)';
