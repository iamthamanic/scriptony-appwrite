/**
 * 🎬 TEMPLATE ENGINE - REGISTRY V2
 *
 * Zentrale Registry für alle Project Templates.
 * Neue Templates hinzufügen = Nur hier ein Entry hinzufügen!
 *
 * KEIN Backend Deploy nötig! ✅
 */

import type {
  TemplateDefinition,
  TemplateRegistry as ITemplateRegistry,
  ProjectType,
  LevelConfig,
} from "./types";

// =============================================================================
// FILM TEMPLATES
// =============================================================================

export const FILM_3ACT: TemplateDefinition = {
  id: "film-3act",
  type: "film",
  name: "3-Akt-Struktur",
  description:
    "Klassische Hollywood-Struktur (Setup, Confrontation, Resolution)",

  levels: {
    level_1: { name: "Act", namePlural: "Acts", icon: "🎬", color: "#6E59A5" },
    level_2: {
      name: "Sequence",
      namePlural: "Sequences",
      icon: "📽️",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Scene",
      namePlural: "Scenes",
      icon: "🎥",
      color: "#A89CC8",
    },
    level_4: {
      name: "Shot",
      namePlural: "Shots",
      icon: "📸",
      color: "#C5BDD8",
    },
  },

  features: {
    hasCinematography: true,
    hasDialogue: true,
    hasAudio: true,
    hasCharacters: true,
    hasLocations: true,
    hasDuration: true,
  },

  defaultStructure: {
    level_1_count: 3,
    level_2_per_parent: 3,
    level_3_per_parent: 4,
    level_4_per_parent: 5,
  },

  metadataSchema: {
    level_3: {
      timeOfDay: {
        type: "enum",
        label: "Time of Day",
        values: [
          "day",
          "night",
          "dawn",
          "dusk",
          "morning",
          "afternoon",
          "evening",
        ],
      },
      location: { type: "string", label: "Location" },
      interior: { type: "boolean", label: "Interior", default: false },
    },
    level_4: {
      cameraAngle: {
        type: "enum",
        label: "Camera Angle",
        values: [
          "eye-level",
          "high-angle",
          "low-angle",
          "birds-eye",
          "dutch-angle",
          "over-shoulder",
        ],
      },
      cameraMovement: {
        type: "enum",
        label: "Camera Movement",
        values: [
          "static",
          "pan",
          "tilt",
          "dolly",
          "tracking",
          "handheld",
          "crane",
          "steadicam",
        ],
      },
      framing: {
        type: "enum",
        label: "Framing",
        values: ["ecu", "cu", "mcu", "ms", "ws", "ews", "2-shot", "group"],
      },
      lens: { type: "string", label: "Lens (mm)" },
      duration: { type: "number", label: "Duration (seconds)", min: 0 },
    },
  },

  uiConfig: {
    defaultView: "timeline",
    showNumbers: true,
    enableReorder: true,
  },
};

export const FILM_HEROES_JOURNEY: TemplateDefinition = {
  id: "film-heroes-journey",
  type: "film",
  name: "Heldenreise (Hero's Journey)",
  description: "Joseph Campbell's 12 Stages Monomyth",

  levels: {
    level_1: {
      name: "Stage",
      namePlural: "Stages",
      icon: "🗺️",
      color: "#6E59A5",
    },
    level_2: {
      name: "Phase",
      namePlural: "Phases",
      icon: "⚡",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Scene",
      namePlural: "Scenes",
      icon: "🎥",
      color: "#A89CC8",
    },
    level_4: {
      name: "Shot",
      namePlural: "Shots",
      icon: "📸",
      color: "#C5BDD8",
    },
  },

  features: {
    hasCinematography: true,
    hasDialogue: true,
    hasAudio: true,
    hasCharacters: true,
    hasLocations: true,
    hasDuration: true,
  },

  defaultStructure: {
    level_1_count: 12,
    level_2_per_parent: 2,
    level_3_per_parent: 3,
    level_4_per_parent: 5,
  },

  predefinedNodes: {
    level_1: [
      {
        number: 1,
        title: "Ordinary World",
        description: "Hero's normal life before adventure",
      },
      {
        number: 2,
        title: "Call to Adventure",
        description: "Hero faces a challenge or quest",
      },
      {
        number: 3,
        title: "Refusal of the Call",
        description: "Hero hesitates or refuses the call",
      },
      {
        number: 4,
        title: "Meeting the Mentor",
        description: "Hero meets wise guide or mentor",
      },
      {
        number: 5,
        title: "Crossing the Threshold",
        description: "Hero commits to the adventure",
      },
      {
        number: 6,
        title: "Tests, Allies, Enemies",
        description: "Hero learns rules of special world",
      },
      {
        number: 7,
        title: "Approach to Inmost Cave",
        description: "Hero approaches the central ordeal",
      },
      {
        number: 8,
        title: "Ordeal",
        description: "Hero faces greatest fear/challenge",
      },
      {
        number: 9,
        title: "Reward (Seizing the Sword)",
        description: "Hero takes possession of treasure",
      },
      {
        number: 10,
        title: "The Road Back",
        description: "Hero begins journey back to ordinary world",
      },
      {
        number: 11,
        title: "Resurrection",
        description: "Hero faces final test using all learned",
      },
      {
        number: 12,
        title: "Return with the Elixir",
        description: "Hero returns home transformed",
      },
    ],
  },

  metadataSchema: {
    level_1: {
      archetype: {
        type: "enum",
        label: "Stage Archetype",
        values: ["departure", "initiation", "return"],
      },
    },
    level_3: FILM_3ACT.metadataSchema!.level_3,
    level_4: FILM_3ACT.metadataSchema!.level_4,
  },

  uiConfig: {
    defaultView: "outline",
    showNumbers: true,
    enableReorder: false,
  },
};

export const FILM_SAVE_THE_CAT: TemplateDefinition = {
  id: "film-save-the-cat",
  type: "film",
  name: "Save the Cat (Blake Snyder)",
  description: "15 Beat Sheet - Genre-specific structure",

  levels: {
    level_1: {
      name: "Beat",
      namePlural: "Beats",
      icon: "🎵",
      color: "#6E59A5",
    },
    level_2: {
      name: "Sequence",
      namePlural: "Sequences",
      icon: "📽️",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Scene",
      namePlural: "Scenes",
      icon: "🎥",
      color: "#A89CC8",
    },
    level_4: {
      name: "Shot",
      namePlural: "Shots",
      icon: "📸",
      color: "#C5BDD8",
    },
  },

  features: FILM_3ACT.features,

  defaultStructure: {
    level_1_count: 15,
    level_2_per_parent: 2,
    level_3_per_parent: 3,
    level_4_per_parent: 5,
  },

  predefinedNodes: {
    level_1: [
      {
        number: 1,
        title: "Opening Image",
        description: "First impression of story",
      },
      {
        number: 2,
        title: "Theme Stated",
        description: "Core theme/lesson mentioned",
      },
      {
        number: 3,
        title: "Set-Up",
        description: "Introduce characters and world",
      },
      { number: 4, title: "Catalyst", description: "Inciting incident" },
      { number: 5, title: "Debate", description: "Hero hesitates" },
      { number: 6, title: "Break into Two", description: "Hero enters Act 2" },
      { number: 7, title: "B Story", description: "Subplot/love story begins" },
      { number: 8, title: "Fun and Games", description: "Promise of premise" },
      { number: 9, title: "Midpoint", description: "False victory or defeat" },
      {
        number: 10,
        title: "Bad Guys Close In",
        description: "Things get worse",
      },
      { number: 11, title: "All Is Lost", description: "Lowest point" },
      {
        number: 12,
        title: "Dark Night of the Soul",
        description: "Hero reflects",
      },
      { number: 13, title: "Break into Three", description: "Solution found" },
      { number: 14, title: "Finale", description: "Climax and resolution" },
      {
        number: 15,
        title: "Final Image",
        description: "Opposite of opening image",
      },
    ],
  },

  metadataSchema: {
    level_3: FILM_3ACT.metadataSchema!.level_3,
    level_4: FILM_3ACT.metadataSchema!.level_4,
  },

  uiConfig: {
    defaultView: "outline",
    showNumbers: true,
    enableReorder: false,
  },
};

// =============================================================================
// SERIES TEMPLATES
// =============================================================================

export const SERIES_TRADITIONAL: TemplateDefinition = {
  id: "series-traditional",
  type: "series",
  name: "Traditionelle TV-Serie",
  description: "Staffeln mit Episoden - klassische TV-Struktur",

  levels: {
    level_1: {
      name: "Season",
      namePlural: "Seasons",
      icon: "📺",
      color: "#6E59A5",
    },
    level_2: {
      name: "Episode",
      namePlural: "Episodes",
      icon: "🎞️",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Scene",
      namePlural: "Scenes",
      icon: "🎥",
      color: "#A89CC8",
    },
    level_4: {
      name: "Shot",
      namePlural: "Shots",
      icon: "📸",
      color: "#C5BDD8",
    },
  },

  features: FILM_3ACT.features,

  defaultStructure: {
    level_1_count: 1,
    level_2_per_parent: 10,
    level_3_per_parent: 15,
    level_4_per_parent: 5,
  },

  metadataSchema: {
    level_1: {
      seasonNumber: { type: "number", label: "Season Number", min: 1 },
      year: { type: "number", label: "Year" },
    },
    level_2: {
      episodeNumber: { type: "string", label: "Episode (e.g., S01E01)" },
      airDate: { type: "date", label: "Air Date" },
      runtime: { type: "number", label: "Runtime (minutes)", min: 0 },
      writer: { type: "string", label: "Writer" },
      director: { type: "string", label: "Director" },
    },
    level_3: FILM_3ACT.metadataSchema!.level_3,
    level_4: FILM_3ACT.metadataSchema!.level_4,
  },

  uiConfig: {
    defaultView: "list",
    showNumbers: true,
    enableReorder: true,
  },
};

// =============================================================================
// BOOK TEMPLATES
// =============================================================================

export const BOOK_NOVEL: TemplateDefinition = {
  id: "book-novel",
  type: "book",
  name: "Roman (3 Teile)",
  description: "Klassische Roman-Struktur mit drei Teilen",

  levels: {
    level_1: {
      name: "Part",
      namePlural: "Parts",
      icon: "📚",
      color: "#6E59A5",
    },
    level_2: {
      name: "Chapter",
      namePlural: "Chapters",
      icon: "📖",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Section",
      namePlural: "Sections",
      icon: "📄",
      color: "#A89CC8",
    },
  },

  features: {
    hasCinematography: false,
    hasDialogue: true,
    hasAudio: false,
    hasCharacters: true,
    hasLocations: true,
    hasDuration: false,
  },

  defaultStructure: {
    level_1_count: 3,
    level_2_per_parent: 8,
    level_3_per_parent: 5,
  },

  metadataSchema: {
    level_2: {
      wordCount: { type: "number", label: "Word Count", min: 0 },
      pov: {
        type: "enum",
        label: "Point of View",
        values: [
          "first-person",
          "third-person-limited",
          "third-person-omniscient",
          "second-person",
        ],
      },
      narrator: { type: "string", label: "Narrator" },
    },
    level_3: {
      wordCount: { type: "number", label: "Word Count", min: 0 },
      content: { type: "richtext", label: "Content" },
      summary: { type: "string", label: "Summary" },
    },
  },

  uiConfig: {
    defaultView: "outline",
    showNumbers: true,
    enableReorder: true,
  },
};

// =============================================================================
// THEATER TEMPLATES
// =============================================================================

export const THEATER_CLASSIC: TemplateDefinition = {
  id: "theater-classic",
  type: "theater",
  name: "Klassisches Theaterstück",
  description: "5-Akt-Struktur nach Freytag",

  levels: {
    level_1: { name: "Act", namePlural: "Acts", icon: "🎭", color: "#6E59A5" },
    level_2: {
      name: "Scene",
      namePlural: "Scenes",
      icon: "🎬",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Beat",
      namePlural: "Beats",
      icon: "💬",
      color: "#A89CC8",
    },
  },

  features: {
    hasCinematography: false,
    hasDialogue: true,
    hasAudio: true,
    hasCharacters: true,
    hasLocations: true,
    hasDuration: true,
  },

  defaultStructure: {
    level_1_count: 5,
    level_2_per_parent: 3,
    level_3_per_parent: 8,
  },

  predefinedNodes: {
    level_1: [
      {
        number: 1,
        title: "Exposition",
        description: "Einführung in Figuren und Situation",
      },
      { number: 2, title: "Rising Action", description: "Steigende Spannung" },
      { number: 3, title: "Climax", description: "Höhepunkt der Handlung" },
      { number: 4, title: "Falling Action", description: "Fallende Handlung" },
      { number: 5, title: "Dénouement", description: "Auflösung" },
    ],
  },

  metadataSchema: {
    level_2: {
      setting: { type: "string", label: "Setting/Location" },
      charactersPresent: {
        type: "array",
        label: "Characters Present",
        itemType: "string",
      },
      stageDirections: { type: "richtext", label: "Stage Directions" },
    },
    level_3: {
      dialogue: { type: "richtext", label: "Dialogue" },
      character: { type: "string", label: "Speaking Character" },
      action: { type: "string", label: "Action/Business" },
      emotion: { type: "string", label: "Emotion/Subtext" },
    },
  },

  uiConfig: {
    defaultView: "outline",
    showNumbers: true,
    enableReorder: true,
  },
};

// =============================================================================
// GAME TEMPLATES
// =============================================================================

export const GAME_NARRATIVE: TemplateDefinition = {
  id: "game-narrative",
  type: "game",
  name: "Story-Driven Game",
  description: "Narrative Game Structure mit Levels und Cutscenes",

  levels: {
    level_1: {
      name: "Chapter",
      namePlural: "Chapters",
      icon: "🎮",
      color: "#6E59A5",
    },
    level_2: {
      name: "Level",
      namePlural: "Levels",
      icon: "🗺️",
      color: "#8B7BB8",
    },
    level_3: {
      name: "Mission",
      namePlural: "Missions",
      icon: "⚔️",
      color: "#A89CC8",
    },
    level_4: {
      name: "Cutscene",
      namePlural: "Cutscenes",
      icon: "🎬",
      color: "#C5BDD8",
    },
  },

  features: {
    hasCinematography: true, // For cutscenes
    hasDialogue: true,
    hasAudio: true,
    hasCharacters: true,
    hasLocations: true,
    hasDuration: true,
  },

  defaultStructure: {
    level_1_count: 3,
    level_2_per_parent: 4,
    level_3_per_parent: 5,
    level_4_per_parent: 2,
  },

  metadataSchema: {
    level_2: {
      difficulty: {
        type: "enum",
        label: "Difficulty",
        values: ["tutorial", "easy", "medium", "hard", "expert"],
      },
      estimatedPlaytime: {
        type: "number",
        label: "Est. Playtime (minutes)",
        min: 0,
      },
      environment: { type: "string", label: "Environment" },
    },
    level_3: {
      objective: { type: "string", label: "Primary Objective" },
      secondaryObjectives: {
        type: "array",
        label: "Secondary Objectives",
        itemType: "string",
      },
      rewards: { type: "array", label: "Rewards", itemType: "string" },
      enemyTypes: { type: "array", label: "Enemy Types", itemType: "string" },
    },
    level_4: {
      type: {
        type: "enum",
        label: "Cutscene Type",
        values: ["intro", "outro", "narrative", "cinematic", "gameplay"],
      },
      skippable: { type: "boolean", label: "Skippable", default: true },
      ...FILM_3ACT.metadataSchema!.level_4, // Cinematography metadata
    },
  },

  uiConfig: {
    defaultView: "kanban",
    showNumbers: true,
    enableReorder: true,
  },
};

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

const ALL_TEMPLATES: TemplateDefinition[] = [
  // Film
  FILM_3ACT,
  FILM_HEROES_JOURNEY,
  FILM_SAVE_THE_CAT,

  // Series
  SERIES_TRADITIONAL,

  // Book
  BOOK_NOVEL,

  // Theater
  THEATER_CLASSIC,

  // Game
  GAME_NARRATIVE,
];

export const TemplateRegistry: ITemplateRegistry = {
  getAll(): TemplateDefinition[] {
    return ALL_TEMPLATES;
  },

  getByType(type: ProjectType): TemplateDefinition[] {
    return ALL_TEMPLATES.filter((t) => t.type === type);
  },

  get(templateId: string): TemplateDefinition | undefined {
    return ALL_TEMPLATES.find((t) => t.id === templateId);
  },

  has(templateId: string): boolean {
    return ALL_TEMPLATES.some((t) => t.id === templateId);
  },

  getLevelConfig(
    templateId: string,
    level: 1 | 2 | 3 | 4,
  ): LevelConfig | undefined {
    const template = this.get(templateId);
    if (!template) return undefined;

    const levelKey = `level_${level}` as
      | "level_1"
      | "level_2"
      | "level_3"
      | "level_4";
    return template.levels[levelKey];
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export { ALL_TEMPLATES as TEMPLATES };
export default TemplateRegistry;
