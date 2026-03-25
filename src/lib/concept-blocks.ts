/**
 * Project concept blocks: lightweight, modular story bible units.
 */

export type ConceptLinkKind =
  | "world-item"
  | "beat-template"
  | "timeline-node"
  | "character"
  | "world"
  | "project";

export type ConceptBlockType =
  | "premise"
  | "hook"
  | "theme"
  | "format"
  | "structure"
  | "characters"
  | "worldRulesRef"
  | "finale"
  | "notes";

export interface ConceptBlockLink {
  kind: ConceptLinkKind;
  id: string;
  label?: string;
}

export interface ConceptBlock {
  id: string;
  type: ConceptBlockType;
  title: string;
  content: string;
  links: ConceptBlockLink[];
}

function makeId(type: ConceptBlockType): string {
  return `concept-${type}`;
}

export function createDefaultConceptBlocks(): ConceptBlock[] {
  const rows: Array<[ConceptBlockType, string]> = [
    ["premise", "Prämisse"],
    ["hook", "Kernhaken"],
    ["theme", "Thema"],
    ["format", "Format / Erzählvertrag"],
    ["structure", "Struktur"],
    ["characters", "Charakter-Maschine"],
    ["worldRulesRef", "Weltregeln / Referenzen"],
    ["finale", "Finale / Reveal"],
    ["notes", "Notizen"],
  ];
  return rows.map(([type, title]) => ({
    id: makeId(type),
    type,
    title,
    content: "",
    links: [],
  }));
}

function isConceptBlock(value: unknown): value is ConceptBlock {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.type === "string" &&
    typeof row.title === "string" &&
    typeof row.content === "string" &&
    Array.isArray(row.links)
  );
}

/**
 * Accept legacy/partial payloads and always return a complete block set.
 */
export function normalizeConceptBlocks(input: unknown): ConceptBlock[] {
  const base = createDefaultConceptBlocks();
  if (!Array.isArray(input)) return base;
  const valid = input.filter(isConceptBlock);
  if (valid.length === 0) return base;

  const byType = new Map(valid.map((b) => [b.type, b]));
  return base.map((b) => {
    const existing = byType.get(b.type);
    if (!existing) return b;
    return {
      ...b,
      id: existing.id || b.id,
      title: existing.title || b.title,
      content: existing.content || "",
      links: Array.isArray(existing.links) ? existing.links : [],
    };
  });
}
