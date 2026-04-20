/**
 * Maps project `narrative_structure` (UI / DB) to `initialize-project` payloads.
 * Returns null for custom, empty, or unsupported values — no silent fallbacks to unrelated templates.
 */

import type { InitializeProjectRequest } from "./api/timeline-api-v2";
import {
  FILM_HEROES_JOURNEY,
  FILM_SAVE_THE_CAT,
  THEATER_CLASSIC,
} from "./templates/registry-v2";

export type NarrativeInitBody = Omit<InitializeProjectRequest, "projectId">;

const FILM_THREE_ACT: NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] = [
  {
    number: 1,
    title: "Akt I - Einführung",
    description: "Setup: Protagonist, Welt, Konflikt werden eingeführt",
  },
  {
    number: 2,
    title: "Akt II - Konfrontation",
    description: "Konfrontation: Protagonist kämpft gegen Hindernisse",
  },
  {
    number: 3,
    title: "Akt III - Auflösung",
    description: "Resolution: Konflikt wird gelöst, Ende der Geschichte",
  },
];

const FILM_FOUR_ACT: NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] = [
  {
    number: 1,
    title: "Akt I - Setup",
    description: "Einführung: Figuren, Welt, Störung",
  },
  {
    number: 2,
    title: "Akt IIa - Konfrontation (1)",
    description: "Erste Hälfte der Konfrontation",
  },
  {
    number: 3,
    title: "Akt IIb - Konfrontation (2)",
    description: "Zweite Hälfte der Konfrontation",
  },
  {
    number: 4,
    title: "Akt III - Auflösung",
    description: "Finale und Auflösung",
  },
];

const BOOK_THREE_PART: NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] = [
  { number: 1, title: "Teil I", description: "Erster Hauptteil" },
  { number: 2, title: "Teil II", description: "Zweiter Hauptteil" },
  { number: 3, title: "Teil III", description: "Dritter Hauptteil" },
];

function theaterFiveActLevel1(): NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] {
  return THEATER_CLASSIC.predefinedNodes!.level_1!.map((n) => ({
    number: n.number,
    title: n.title,
    description: n.description,
  }));
}

function heroesJourneyLevel1(): NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] {
  return FILM_HEROES_JOURNEY.predefinedNodes!.level_1!.map((n) => ({
    number: n.number,
    title: n.title,
    description: n.description,
  }));
}

function saveTheCatLevel1(): NonNullable<
  NarrativeInitBody["predefinedNodes"]
>["level_1"] {
  return FILM_SAVE_THE_CAT.predefinedNodes!.level_1!.map((n) => ({
    number: n.number,
    title: n.title,
    description: n.description,
  }));
}

/**
 * Payload for `initializeProject` (without `projectId`). Null = no automatic timeline init.
 */
export function narrativeStructureToInitializeProjectPayload(
  narrativeStructure: string | null | undefined,
): NarrativeInitBody | null {
  const raw = narrativeStructure?.trim();
  if (!raw) return null;

  const key = raw.startsWith("custom:") ? "custom" : raw;

  if (key === "custom") return null;

  const filmThree: NarrativeInitBody = {
    templateId: "film-3-act",
    structure: { level_1_count: 3 },
    predefinedNodes: { level_1: FILM_THREE_ACT },
  };

  const filmFour: NarrativeInitBody = {
    templateId: "film-4-act",
    structure: { level_1_count: 4 },
    predefinedNodes: { level_1: FILM_FOUR_ACT },
  };

  const filmFive: NarrativeInitBody = {
    templateId: "film-5-act",
    structure: { level_1_count: 5 },
    predefinedNodes: { level_1: theaterFiveActLevel1() },
  };

  const bookThreePart: NarrativeInitBody = {
    templateId: "book-novel",
    structure: { level_1_count: 3 },
    predefinedNodes: { level_1: BOOK_THREE_PART },
  };

  const heroJourney: NarrativeInitBody = {
    templateId: "film-heroes-journey",
    structure: { level_1_count: 12 },
    predefinedNodes: { level_1: heroesJourneyLevel1() },
  };

  const saveTheCat: NarrativeInitBody = {
    templateId: "film-save-the-cat",
    structure: { level_1_count: 15 },
    predefinedNodes: { level_1: saveTheCatLevel1() },
  };

  switch (key) {
    case "3-act":
    case "30min-3-act":
      return filmThree;
    case "4-act":
    case "60min-4-act":
      return filmFour;
    case "5-act":
      return filmFive;
    case "8-sequences":
    case "kishotenketsu":
    case "non-linear":
    case "podcast-25-35min":
      return null;
    case "3-part":
      return bookThreePart;
    case "hero-journey":
      return heroJourney;
    case "save-the-cat":
      return saveTheCat;
    default:
      return null;
  }
}

export type NarrativeInitUiHint =
  | { kind: "ready"; shortLabel: string }
  | { kind: "need_structure" }
  | { kind: "custom_structure" }
  | { kind: "unsupported" };

/**
 * Labels for the “create timeline structure” control (FilmDropdown empty state).
 */
export function narrativeStructureInitUiHint(
  narrativeStructure: string | null | undefined,
): NarrativeInitUiHint {
  const raw = narrativeStructure?.trim();
  if (!raw) return { kind: "need_structure" };
  if (raw.startsWith("custom:")) return { kind: "custom_structure" };

  const payload = narrativeStructureToInitializeProjectPayload(raw);
  if (!payload) return { kind: "unsupported" };

  const n = payload.structure.level_1_count;
  const tid = payload.templateId;
  if (tid === "film-heroes-journey")
    return { kind: "ready", shortLabel: "Heldenreise anlegen" };
  if (tid === "film-save-the-cat")
    return { kind: "ready", shortLabel: "Save-the-Cat-Raster anlegen" };
  if (tid === "book-novel")
    return { kind: "ready", shortLabel: "3-Teile-Struktur anlegen" };
  if (tid === "film-4-act")
    return { kind: "ready", shortLabel: "4-Akt-Struktur anlegen" };
  if (tid === "film-5-act")
    return { kind: "ready", shortLabel: "5-Akt-Struktur anlegen" };
  return { kind: "ready", shortLabel: `Akt-Struktur anlegen (${n} Akte)` };
}
