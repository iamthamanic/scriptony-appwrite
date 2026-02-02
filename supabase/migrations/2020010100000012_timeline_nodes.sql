-- ============================================================================
-- 🎬 TEMPLATE ENGINE - Timeline Nodes Table
-- ============================================================================
-- 
-- Generische Tabelle für ALLE Timeline-Hierarchien:
-- - Film: Acts → Sequences → Scenes → Shots
-- - Serie: Seasons → Episodes → Scenes → Shots
-- - Buch: Parts → Chapters → Sections
-- - Theater: Acts → Scenes → Beats
-- - Game: Chapters → Levels → Missions → Cutscenes
--
-- NEUE TEMPLATES = NUR Frontend Code, kein SQL!
--
-- ============================================================================

-- Timeline Nodes (Generisch für alle Templates)
CREATE TABLE IF NOT EXISTS timeline_nodes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES timeline_nodes(id) ON DELETE CASCADE,
  
  -- Template Info
  template_id TEXT NOT NULL,  -- 'film-3act', 'series-traditional', etc.
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3, 4)),
  
  -- Basic Fields (alle Templates)
  node_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,  -- Hex color for UI
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Template-specific data (JSONB für maximale Flexibilität)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_node_per_parent UNIQUE (project_id, parent_id, node_number),
  CONSTRAINT valid_parent_level CHECK (
    parent_id IS NULL AND level = 1 OR
    parent_id IS NOT NULL AND level > 1
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query by project (most common)
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_project 
  ON timeline_nodes(project_id);

-- Query by parent (for loading children)
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_parent 
  ON timeline_nodes(parent_id);

-- Query by template (for template-specific queries)
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_template 
  ON timeline_nodes(template_id);

-- Query by level (for filtering)
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_level 
  ON timeline_nodes(level);

-- Order nodes within parent
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_order 
  ON timeline_nodes(parent_id, order_index);

-- JSONB metadata queries (GIN index für alle metadata keys)
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_metadata 
  ON timeline_nodes USING GIN (metadata);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE timeline_nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view nodes from their organization's projects
CREATE POLICY timeline_nodes_select ON timeline_nodes
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert nodes into their organization's projects
CREATE POLICY timeline_nodes_insert ON timeline_nodes
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update nodes in their organization's projects
CREATE POLICY timeline_nodes_update ON timeline_nodes
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can delete nodes in their organization's projects
CREATE POLICY timeline_nodes_delete ON timeline_nodes
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_nodes_updated_at
  BEFORE UPDATE ON timeline_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_nodes_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get all descendants of a node (recursive)
CREATE OR REPLACE FUNCTION get_node_descendants(node_id UUID)
RETURNS TABLE (
  id UUID,
  level INTEGER,
  title TEXT,
  depth INTEGER
) AS $$
  WITH RECURSIVE descendants AS (
    -- Base case: direct children
    SELECT 
      n.id,
      n.level,
      n.title,
      1 as depth
    FROM timeline_nodes n
    WHERE n.parent_id = node_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT 
      n.id,
      n.level,
      n.title,
      d.depth + 1
    FROM timeline_nodes n
    INNER JOIN descendants d ON n.parent_id = d.id
  )
  SELECT * FROM descendants
  ORDER BY depth, level, id;
$$ LANGUAGE sql STABLE;

-- Get node path (from root to node)
CREATE OR REPLACE FUNCTION get_node_path(node_id UUID)
RETURNS TABLE (
  id UUID,
  level INTEGER,
  title TEXT,
  depth INTEGER
) AS $$
  WITH RECURSIVE path AS (
    -- Base case: the node itself
    SELECT 
      n.id,
      n.level,
      n.title,
      n.parent_id,
      0 as depth
    FROM timeline_nodes n
    WHERE n.id = node_id
    
    UNION ALL
    
    -- Recursive case: parent nodes
    SELECT 
      n.id,
      n.level,
      n.title,
      n.parent_id,
      p.depth + 1
    FROM timeline_nodes n
    INNER JOIN path p ON n.id = p.parent_id
  )
  SELECT id, level, title, depth FROM path
  ORDER BY depth DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- MIGRATION HELPER (Optional)
-- ============================================================================

-- Function to migrate from acts/sequences/scenes/shots to timeline_nodes
-- This can be run manually when ready to migrate existing data

CREATE OR REPLACE FUNCTION migrate_to_timeline_nodes()
RETURNS void AS $$
BEGIN
  -- Migrate Acts (Level 1)
  INSERT INTO timeline_nodes (
    id, project_id, template_id, level, parent_id, 
    node_number, title, description, color, order_index, created_at, updated_at
  )
  SELECT 
    id,
    project_id,
    'film-3act' as template_id,
    1 as level,
    NULL as parent_id,
    act_number as node_number,
    title,
    description,
    color,
    order_index,
    created_at,
    updated_at
  FROM acts
  ON CONFLICT (id) DO NOTHING;
  
  -- Migrate Sequences (Level 2)
  INSERT INTO timeline_nodes (
    id, project_id, template_id, level, parent_id,
    node_number, title, description, color, order_index, created_at, updated_at
  )
  SELECT 
    s.id,
    s.project_id,
    'film-3act' as template_id,
    2 as level,
    s.act_id as parent_id,
    s.sequence_number as node_number,
    s.title,
    s.description,
    s.color,
    s.order_index,
    s.created_at,
    s.updated_at
  FROM sequences s
  ON CONFLICT (id) DO NOTHING;
  
  -- Migrate Scenes (Level 3)
  INSERT INTO timeline_nodes (
    id, project_id, template_id, level, parent_id,
    node_number, title, description, color, order_index, 
    metadata, created_at, updated_at
  )
  SELECT 
    sc.id,
    sc.project_id,
    'film-3act' as template_id,
    3 as level,
    sc.sequence_id as parent_id,
    sc.scene_number as node_number,
    sc.title,
    sc.description,
    sc.color,
    sc.order_index,
    jsonb_build_object(
      'location', sc.location,
      'timeOfDay', sc.time_of_day,
      'interior', sc.interior
    ) as metadata,
    sc.created_at,
    sc.updated_at
  FROM scenes sc
  ON CONFLICT (id) DO NOTHING;
  
  -- Migrate Shots (Level 4)
  INSERT INTO timeline_nodes (
    id, project_id, template_id, level, parent_id,
    node_number, title, description, color, order_index,
    metadata, created_at, updated_at
  )
  SELECT 
    sh.id,
    sh.project_id,
    'film-3act' as template_id,
    4 as level,
    sh.scene_id as parent_id,
    CAST(sh.shot_number AS INTEGER) as node_number,
    COALESCE(sh.description, 'Shot ' || sh.shot_number) as title,
    sh.description,
    NULL as color,
    sh.order_index,
    jsonb_build_object(
      'cameraAngle', sh.camera_angle,
      'cameraMovement', sh.camera_movement,
      'framing', sh.framing,
      'lens', sh.lens,
      'duration', sh.shotlength_seconds,
      'imageUrl', sh.image_url,
      'dialog', sh.dialog,
      'notes', sh.notes
    ) as metadata,
    sh.created_at,
    sh.updated_at
  FROM shots sh
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Migration complete!';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE timeline_nodes IS 'Generische Timeline-Hierarchie für alle Project Templates';
COMMENT ON COLUMN timeline_nodes.template_id IS 'Template ID (e.g., film-3act, series-traditional)';
COMMENT ON COLUMN timeline_nodes.level IS 'Hierarchie-Level (1-4): 1=Act/Season/Part, 2=Sequence/Episode/Chapter, 3=Scene/Section/Beat, 4=Shot/Cutscene';
COMMENT ON COLUMN timeline_nodes.metadata IS 'Template-spezifische Daten als JSONB (flexible für jedes Template)';
COMMENT ON COLUMN timeline_nodes.order_index IS 'Sortierung innerhalb Parent (für Drag & Drop Reordering)';

-- ============================================================================
-- DONE!
-- ============================================================================

-- To migrate existing data, run:
-- SELECT migrate_to_timeline_nodes();
