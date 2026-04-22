/**
 * 🎬 TEMPLATE ENGINE - TYPE DEFINITIONS
 *
 * Generische Type Definitions für das Template System.
 * Erlaubt beliebige Project Types und Templates ohne Backend-Änderungen.
 */

// =============================================================================
// PROJECT TYPES
// =============================================================================

export type ProjectType =
  | "film"
  | "series"
  | "book"
  | "theater"
  | "game"
  | "podcast"
  | "audiobook"
  | "comic"
  | "custom";

// =============================================================================
// LEVEL CONFIGURATION
// =============================================================================

export interface LevelConfig {
  /** Singular name (e.g., 'Act', 'Season', 'Part') */
  name: string;

  /** Plural name (e.g., 'Acts', 'Seasons', 'Parts') */
  namePlural: string;

  /** Icon/Emoji for UI */
  icon: string;

  /** Default color (hex) */
  color?: string;

  /** Description */
  description?: string;
}

// =============================================================================
// METADATA SCHEMA
// =============================================================================

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "array"
  | "richtext"
  | "json";

export interface FieldSchema {
  type: FieldType;
  label?: string;
  required?: boolean;
  default?: any;

  // For enum type
  values?: string[];

  // For number type
  min?: number;
  max?: number;

  // For string type
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // For array type
  itemType?: FieldType;
}

// =============================================================================
// TEMPLATE DEFINITION
// =============================================================================

export interface TemplateDefinition {
  /** Unique template ID (e.g., 'film-3act', 'series-traditional') */
  id: string;

  /** Project type category */
  type: ProjectType;

  /** Display name */
  name: string;

  /** Description for template selection */
  description: string;

  /** Hierarchie-Levels (1-4) */
  levels: {
    level_1: LevelConfig;
    level_2?: LevelConfig;
    level_3?: LevelConfig;
    level_4?: LevelConfig;
  };

  /** Feature flags */
  features: {
    /** Has cinematography features (camera, shots, etc.) */
    hasCinematography: boolean;

    /** Has dialogue/script features */
    hasDialogue: boolean;

    /** Has audio features (music, SFX, etc.) */
    hasAudio: boolean;

    /** Has character assignment */
    hasCharacters: boolean;

    /** Has location/world features */
    hasLocations: boolean;

    /** Has timeline duration tracking */
    hasDuration: boolean;
  };

  /** Default structure when initializing */
  defaultStructure: {
    level_1_count: number;
    level_2_per_parent?: number;
    level_3_per_parent?: number;
    level_4_per_parent?: number;
  };

  /** Optional: Metadata schema for each level */
  metadataSchema?: {
    level_1?: Record<string, FieldSchema>;
    level_2?: Record<string, FieldSchema>;
    level_3?: Record<string, FieldSchema>;
    level_4?: Record<string, FieldSchema>;
  };

  /** Optional: Predefined nodes (e.g., 12 Hero's Journey stages) */
  predefinedNodes?: {
    level_1?: Array<{ number: number; title: string; description?: string }>;
    level_2?: Array<{ number: number; title: string; description?: string }>;
    level_3?: Array<{ number: number; title: string; description?: string }>;
    level_4?: Array<{ number: number; title: string; description?: string }>;
  };

  /** Optional: Template-specific UI config */
  uiConfig?: {
    /** Default view mode */
    defaultView?: "timeline" | "list" | "kanban" | "outline";

    /** Show level numbers */
    showNumbers?: boolean;

    /** Enable reordering */
    enableReorder?: boolean;

    /** Custom colors per level */
    levelColors?: {
      level_1?: string;
      level_2?: string;
      level_3?: string;
      level_4?: string;
    };
  };
}

// =============================================================================
// TIMELINE NODE (Database)
// =============================================================================

export interface TimelineNode {
  id: string;
  projectId: string;
  templateId: string;

  // Hierarchy
  level: 1 | 2 | 3 | 4;
  parentId: string | null;

  // Basic fields
  nodeNumber: number;
  title: string;
  description?: string;
  color?: string;
  orderIndex: number;

  // Template-specific data (JSONB in database)
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (populated by client)
  children?: TimelineNode[];
}

// =============================================================================
// API TYPES
// =============================================================================

export interface CreateNodeRequest {
  projectId: string;
  templateId: string;
  level: 1 | 2 | 3 | 4;
  parentId?: string;
  nodeNumber: number;
  title: string;
  description?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNodeRequest {
  nodeNumber?: number;
  title?: string;
  description?: string;
  color?: string;
  orderIndex?: number;
  metadata?: Record<string, any>;
}

export interface ReorderNodesRequest {
  nodeIds: string[];
}

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

export interface TemplateRegistry {
  /** Get all templates */
  getAll(): TemplateDefinition[];

  /** Get templates by type */
  getByType(type: ProjectType): TemplateDefinition[];

  /** Get single template */
  get(templateId: string): TemplateDefinition | undefined;

  /** Check if template exists */
  has(templateId: string): boolean;

  /** Get level config for template */
  getLevelConfig(
    templateId: string,
    level: 1 | 2 | 3 | 4,
  ): LevelConfig | undefined;
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

export interface GenericTimelineViewProps {
  projectId: string;
  templateId: string;
  template: TemplateDefinition;

  // Data
  nodes: TimelineNode[];

  // Callbacks
  onNodeCreate?: (parentId: string | null, level: number) => void;
  onNodeUpdate?: (nodeId: string, updates: UpdateNodeRequest) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeReorder?: (parentId: string | null, nodeIds: string[]) => void;

  // UI State
  expandedNodes?: Set<string>;
  selectedNodeId?: string;

  // Loading
  isLoading?: boolean;
}

export interface GenericContainerProps {
  node: TimelineNode;
  template: TemplateDefinition;
  level: 1 | 2 | 3 | 4;

  // Children
  children?: TimelineNode[];

  // State
  isExpanded: boolean;
  isSelected: boolean;

  // Callbacks
  onToggle: () => void;
  onSelect: () => void;
  onUpdate: (updates: UpdateNodeRequest) => void;
  onDelete: () => void;
  onCreate: () => void;
}
