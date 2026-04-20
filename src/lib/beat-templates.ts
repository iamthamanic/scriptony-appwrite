import type { BeatCardData } from "../components/BeatCard";

/**
 * 🎬 STORY BEAT TEMPLATES
 *
 * Vordefinierte Beat-Templates für verschiedene Erzählstrukturen:
 * - Lite-7: Minimales Template (7 Beats)
 * - Save the Cat: Blake Snyder's 15 Beats
 * - Hero's Journey: Joseph Campbell (12 Stages)
 * - Syd Field: Paradigm (3-Act)
 * - Seven Point: Dan Wells (7 Points)
 */

export interface BeatTemplate {
  id: string;
  name: string;
  abbr: string;
  description: string;
  beats: Omit<BeatCardData, "id">[];
}

// LITE-7: Minimales Template für schnelles Prototyping
export const LITE_7_TEMPLATE: BeatTemplate = {
  id: "lite-7",
  name: "Lite-7 (minimal)",
  abbr: "L7",
  description: "Minimales 7-Beat-Template für schnelles Story-Prototyping",
  beats: [
    {
      label: "Hook",
      templateAbbr: "L7",
      pctFrom: 0,
      pctTo: 14.29,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Inciting Incident",
      templateAbbr: "L7",
      pctFrom: 14.29,
      pctTo: 28.57,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Crisis / Point of No Return",
      templateAbbr: "L7",
      pctFrom: 28.57,
      pctTo: 42.86,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Midpoint",
      templateAbbr: "L7",
      pctFrom: 42.86,
      pctTo: 57.14,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "All is Lost",
      templateAbbr: "L7",
      pctFrom: 57.14,
      pctTo: 71.43,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Climax",
      templateAbbr: "L7",
      pctFrom: 71.43,
      pctTo: 85.71,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Resolution",
      templateAbbr: "L7",
      pctFrom: 85.71,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// SAVE THE CAT: Blake Snyder's 15 Beats
export const SAVE_THE_CAT_TEMPLATE: BeatTemplate = {
  id: "save-the-cat",
  name: "Save the Cat! (15 Beats)",
  abbr: "STC",
  description: "Blake Snyder's klassisches 15-Beat-Template",
  beats: [
    {
      label: "Opening Image",
      templateAbbr: "STC",
      pctFrom: 0,
      pctTo: 6.67,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Theme Stated",
      templateAbbr: "STC",
      pctFrom: 6.67,
      pctTo: 13.33,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Setup",
      templateAbbr: "STC",
      pctFrom: 13.33,
      pctTo: 20,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Catalyst",
      templateAbbr: "STC",
      pctFrom: 20,
      pctTo: 26.67,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Debate",
      templateAbbr: "STC",
      pctFrom: 26.67,
      pctTo: 33.33,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Break into Two",
      templateAbbr: "STC",
      pctFrom: 33.33,
      pctTo: 40,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "B Story",
      templateAbbr: "STC",
      pctFrom: 40,
      pctTo: 46.67,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Fun and Games",
      templateAbbr: "STC",
      pctFrom: 46.67,
      pctTo: 53.33,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Midpoint",
      templateAbbr: "STC",
      pctFrom: 53.33,
      pctTo: 60,
      color: "#6B5794",
      items: [],
    },
    {
      label: "Bad Guys Close In",
      templateAbbr: "STC",
      pctFrom: 60,
      pctTo: 66.67,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "All is Lost",
      templateAbbr: "STC",
      pctFrom: 66.67,
      pctTo: 73.33,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Dark Night of the Soul",
      templateAbbr: "STC",
      pctFrom: 73.33,
      pctTo: 80,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Break into Three",
      templateAbbr: "STC",
      pctFrom: 80,
      pctTo: 86.67,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Finale",
      templateAbbr: "STC",
      pctFrom: 86.67,
      pctTo: 93.33,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Final Image",
      templateAbbr: "STC",
      pctFrom: 93.33,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// HERO'S JOURNEY: Joseph Campbell (12 Stages)
export const HEROES_JOURNEY_TEMPLATE: BeatTemplate = {
  id: "heroes-journey",
  name: "Hero's Journey (12 Stages)",
  abbr: "HJ",
  description:
    "Joseph Campbell's Heldenreise (adaptiert von Christopher Vogler)",
  beats: [
    {
      label: "Ordinary World",
      templateAbbr: "HJ",
      pctFrom: 0,
      pctTo: 10,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Call to Adventure",
      templateAbbr: "HJ",
      pctFrom: 10,
      pctTo: 12,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Refusal of the Call",
      templateAbbr: "HJ",
      pctFrom: 12,
      pctTo: 15,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Meeting the Mentor",
      templateAbbr: "HJ",
      pctFrom: 15,
      pctTo: 20,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Crossing the Threshold",
      templateAbbr: "HJ",
      pctFrom: 20,
      pctTo: 25,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Tests, Allies, Enemies",
      templateAbbr: "HJ",
      pctFrom: 25,
      pctTo: 50,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Approach to Inmost Cave",
      templateAbbr: "HJ",
      pctFrom: 50,
      pctTo: 55,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Ordeal",
      templateAbbr: "HJ",
      pctFrom: 55,
      pctTo: 65,
      color: "#6B5794",
      items: [],
    },
    {
      label: "Reward",
      templateAbbr: "HJ",
      pctFrom: 65,
      pctTo: 75,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "The Road Back",
      templateAbbr: "HJ",
      pctFrom: 75,
      pctTo: 85,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Resurrection",
      templateAbbr: "HJ",
      pctFrom: 85,
      pctTo: 95,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Return with Elixir",
      templateAbbr: "HJ",
      pctFrom: 95,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// SYD FIELD: Paradigm (3-Act Structure)
export const SYD_FIELD_TEMPLATE: BeatTemplate = {
  id: "syd-field",
  name: "Syd Field / Paradigm",
  abbr: "FLD",
  description: "Klassische 3-Akt-Struktur nach Syd Field",
  beats: [
    {
      label: "Setup",
      templateAbbr: "FLD",
      pctFrom: 0,
      pctTo: 25,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Plot Point 1",
      templateAbbr: "FLD",
      pctFrom: 25,
      pctTo: 25,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Confrontation (Act 2A)",
      templateAbbr: "FLD",
      pctFrom: 25,
      pctTo: 50,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Midpoint",
      templateAbbr: "FLD",
      pctFrom: 50,
      pctTo: 50,
      color: "#6B5794",
      items: [],
    },
    {
      label: "Confrontation (Act 2B)",
      templateAbbr: "FLD",
      pctFrom: 50,
      pctTo: 75,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Plot Point 2",
      templateAbbr: "FLD",
      pctFrom: 75,
      pctTo: 75,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Resolution",
      templateAbbr: "FLD",
      pctFrom: 75,
      pctTo: 100,
      color: "#9B87C4",
      items: [],
    },
  ],
};

// SEVEN POINT STRUCTURE: Dan Wells
export const SEVEN_POINT_TEMPLATE: BeatTemplate = {
  id: "seven-point",
  name: "Seven-Point Structure",
  abbr: "7PT",
  description: "Dan Wells' 7-Punkt-Struktur",
  beats: [
    {
      label: "Hook",
      templateAbbr: "7PT",
      pctFrom: 0,
      pctTo: 1,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Plot Turn 1",
      templateAbbr: "7PT",
      pctFrom: 20,
      pctTo: 25,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Pinch Point 1",
      templateAbbr: "7PT",
      pctFrom: 37,
      pctTo: 37,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Midpoint",
      templateAbbr: "7PT",
      pctFrom: 50,
      pctTo: 50,
      color: "#6B5794",
      items: [],
    },
    {
      label: "Pinch Point 2",
      templateAbbr: "7PT",
      pctFrom: 62,
      pctTo: 62,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Plot Turn 2",
      templateAbbr: "7PT",
      pctFrom: 75,
      pctTo: 80,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Resolution",
      templateAbbr: "7PT",
      pctFrom: 95,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// 8-SEQUENCES: French 8-Sequence Structure
export const EIGHT_SEQUENCES_TEMPLATE: BeatTemplate = {
  id: "8-sequences",
  name: "8-Sequenzen",
  abbr: "8SEQ",
  description: "Französische 8-Sequenzen-Struktur",
  beats: [
    {
      label: "Sequence 1: Setup",
      templateAbbr: "8SEQ",
      pctFrom: 0,
      pctTo: 12.5,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Sequence 2: Predicament",
      templateAbbr: "8SEQ",
      pctFrom: 12.5,
      pctTo: 25,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Sequence 3: First Obstacle",
      templateAbbr: "8SEQ",
      pctFrom: 25,
      pctTo: 37.5,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Sequence 4: Complication",
      templateAbbr: "8SEQ",
      pctFrom: 37.5,
      pctTo: 50,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Sequence 5: Obstacle & Setback",
      templateAbbr: "8SEQ",
      pctFrom: 50,
      pctTo: 62.5,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Sequence 6: Second Obstacle",
      templateAbbr: "8SEQ",
      pctFrom: 62.5,
      pctTo: 75,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Sequence 7: Final Push",
      templateAbbr: "8SEQ",
      pctFrom: 75,
      pctTo: 87.5,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Sequence 8: Resolution",
      templateAbbr: "8SEQ",
      pctFrom: 87.5,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// STORY CIRCLE: Dan Harmon's Story Circle (8 Stages)
export const STORY_CIRCLE_TEMPLATE: BeatTemplate = {
  id: "story-circle",
  name: "Story Circle 8",
  abbr: "SC8",
  description: "Dan Harmon's Story Circle (8 Stages)",
  beats: [
    {
      label: "1. You (Comfort Zone)",
      templateAbbr: "SC8",
      pctFrom: 0,
      pctTo: 12.5,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "2. Need (Want)",
      templateAbbr: "SC8",
      pctFrom: 12.5,
      pctTo: 25,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "3. Go (Cross Threshold)",
      templateAbbr: "SC8",
      pctFrom: 25,
      pctTo: 37.5,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "4. Search (Adapt)",
      templateAbbr: "SC8",
      pctFrom: 37.5,
      pctTo: 50,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "5. Find (Get)",
      templateAbbr: "SC8",
      pctFrom: 50,
      pctTo: 62.5,
      color: "#6B5794",
      items: [],
    },
    {
      label: "6. Take (Pay Price)",
      templateAbbr: "SC8",
      pctFrom: 62.5,
      pctTo: 75,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "7. Return (Bring Back)",
      templateAbbr: "SC8",
      pctFrom: 75,
      pctTo: 87.5,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "8. Change (Transform)",
      templateAbbr: "SC8",
      pctFrom: 87.5,
      pctTo: 100,
      color: "#AB97D4",
      items: [],
    },
  ],
};

// SEASON-LITE-5: Macro Template for Season Structure
export const SEASON_LITE_5_TEMPLATE: BeatTemplate = {
  id: "season-lite-5",
  name: "Season-Lite-5 (Macro)",
  abbr: "SL5",
  description: "Macro-Template für Season-Structure (5 Beats)",
  beats: [
    {
      label: "Season Opening",
      templateAbbr: "SL5",
      pctFrom: 0,
      pctTo: 20,
      color: "#9B87C4",
      items: [],
    },
    {
      label: "Rising Stakes",
      templateAbbr: "SL5",
      pctFrom: 20,
      pctTo: 40,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Season Midpoint",
      templateAbbr: "SL5",
      pctFrom: 40,
      pctTo: 60,
      color: "#7B67A4",
      items: [],
    },
    {
      label: "Darkest Hour",
      templateAbbr: "SL5",
      pctFrom: 60,
      pctTo: 80,
      color: "#8B77B4",
      items: [],
    },
    {
      label: "Season Finale",
      templateAbbr: "SL5",
      pctFrom: 80,
      pctTo: 100,
      color: "#9B87C4",
      items: [],
    },
  ],
};

// Template Registry
export const BEAT_TEMPLATES: Record<string, BeatTemplate> = {
  "lite-7": LITE_7_TEMPLATE,
  "save-the-cat": SAVE_THE_CAT_TEMPLATE,
  "heroes-journey": HEROES_JOURNEY_TEMPLATE,
  "syd-field": SYD_FIELD_TEMPLATE,
  "seven-point": SEVEN_POINT_TEMPLATE,
  "8-sequences": EIGHT_SEQUENCES_TEMPLATE,
  "story-circle": STORY_CIRCLE_TEMPLATE,
  "season-lite-5": SEASON_LITE_5_TEMPLATE,
};

// Helper: Generate Beats with unique IDs
export function generateBeatsFromTemplate(
  template: BeatTemplate,
): BeatCardData[] {
  return template.beats.map((beat, index) => ({
    ...beat,
    id: `${template.id}-beat-${index + 1}`,
  }));
}

// Helper: Get all template options for Select
export function getAllTemplateOptions() {
  return Object.values(BEAT_TEMPLATES).map((template) => ({
    value: template.id,
    label: template.name,
    abbr: template.abbr,
  }));
}
