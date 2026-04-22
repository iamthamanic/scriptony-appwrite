/**
 * Centralized tooltips for project fields (DRY - Single Source of Truth)
 *
 * Use this hook to get consistent tooltip content across:
 * - Create Project Dialog
 * - Project Information (Edit)
 * - Any future forms using these fields
 *
 * Location: src/hooks/useProjectTooltips.ts
 */

export type ProjectTooltipField =
  | "projectType"
  | "narrativeStructure"
  | "beatTemplate"
  | "linkedWorld"
  | "logline"
  | "duration"
  | "durationBook"
  | "inspirations"
  | "premise"
  | "theme"
  | "hook"
  | "note";

interface TooltipConfig {
  label: string;
  content: string;
}

const TOOLTIP_CONTENT: Record<ProjectTooltipField, TooltipConfig> = {
  projectType: {
    label: "Project Type",
    content:
      "Projektformat bestimmt verfügbare Features: Film (Shots), Buch (Kapitel), Hörspiel (Audio-Beats), Theater (Szenen), Dokumentation (Clips).",
  },
  narrativeStructure: {
    label: "Narrative Structure",
    content:
      "Genre-Einstufung bestimmt Tempo, Beat-Dichte und dramaturgische Empfehlungen. Beeinflusst automatisch die Timeline-Berechnungen.",
  },
  beatTemplate: {
    label: "Story Beat Template",
    content:
      "Strukturelles Framework für deine Geschichte (z.B. Save the Cat, Hero's Journey, 3-Act-Structure). Bestimmt die empfohlene Anzahl und Reihenfolge der Story Beats.",
  },
  linkedWorld: {
    label: "Welt verknüpfen",
    content:
      "Verbinde dieses Projekt mit einer bestehenden Welt aus deinem Worldbuilding. Charaktere, Orte und Lore werden automatisch synchronisiert.",
  },
  logline: {
    label: "Logline",
    content:
      "Ein Satz (max. 50 Wörter), der die zentrale Konflikt-Idee deines Projekts zusammenfasst. Orientiert sich am 'Wer will was, was steht im Weg'-Prinzip.",
  },
  duration: {
    label: "Dauer",
    content:
      "Ziel-Länge des fertigen Werks. Wird für Timeline-Berechnungen verwendet (z.B. Shot-Dauer bei Filmen oder Lesedauer bei Hörbüchern).",
  },
  durationBook: {
    label: "Zielumfang",
    content:
      "Zielumfang in Seiten. Wird zur Berechnung der Lesedauer und Kapitelstruktur verwendet.",
  },
  inspirations: {
    label: "Inspirations",
    content:
      "Bilder, Musik, Texte oder andere Medien, die dich bei diesem Projekt inspiriert haben. Werden nicht öffentlich geteilt.",
  },
  premise: {
    label: "Prämisse",
    content:
      "Setup + Hauptfigur + Ziel + Konflikt. Beispiel: 'Eine Therapeutin für Götter muss den Olymp renovieren, bevor die Stromrechnung fällig ist.'",
  },
  theme: {
    label: "Thema",
    content:
      "Worum geht's 'eigentlich'? Aussage/Frage oder Spannungsfeld. Beispiele: 'Verantwortung vs. Macht', 'Heilung braucht Wahrheit'",
  },
  hook: {
    label: "Hook",
    content:
      "Das 'Was?': Ungewöhnliche Kombination, ticking clock oder paradoxe Situation. Beispiel: 'Ein Vampir, der Blut hassst – und als Sanitäter arbeitet.'",
  },
  note: {
    label: "Notiz",
    content:
      "Freie Gedanken, Ideen oder Erinnerungen. Alles, das du sonst nirgends unterbringen kannst.",
  },
};

/**
 * Get tooltip content for a specific project field
 *
 * @example
 * const { getTooltip } = useProjectTooltips();
 * const tooltip = getTooltip('projectType');
 * // Returns: { label: "Project Type", content: "Projektformat bestimmt..." }
 */
export function useProjectTooltips() {
  const getTooltip = (field: ProjectTooltipField): TooltipConfig => {
    return TOOLTIP_CONTENT[field];
  };

  const getContent = (field: ProjectTooltipField): string => {
    return TOOLTIP_CONTENT[field]?.content || "";
  };

  const getLabel = (field: ProjectTooltipField): string => {
    return TOOLTIP_CONTENT[field]?.label || "";
  };

  return {
    getTooltip,
    getContent,
    getLabel,
    /** All tooltips for iteration if needed */
    tooltips: TOOLTIP_CONTENT,
  };
}

/**
 * Type guard to check if a field has a tooltip
 */
export function hasTooltip(field: string): field is ProjectTooltipField {
  return field in TOOLTIP_CONTENT;
}
