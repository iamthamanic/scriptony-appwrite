/**
 * Builds a concise English image prompt from project context for cover generation.
 * Location: src/lib/cover-prompt.ts
 */

type WorldItem = {
  id: string;
  name: string;
  category: string;
  categoryType: string;
};
type Character = { name?: string; role?: string; description?: string };

export type CoverConceptExcerpt = {
  premise?: string;
  hook?: string;
  theme?: string;
};

/** User-selected look for the cover illustration (German UI, English in prompt). */
export type CoverVisualStyle = "realistic" | "comic" | "anime";

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function visualStyleInstruction(style: CoverVisualStyle): string {
  if (style === "comic") {
    return (
      "Visual style: **Comic / graphic novel** — bold ink outlines, clear blacks, halftone or flat color, " +
      "dynamic composition; not photorealistic."
    );
  }
  if (style === "anime") {
    return (
      "Visual style: **Anime / cel-shaded illustration** — clean line art, expressive character design where relevant, " +
      "graded vibrant colors; not Western photorealism."
    );
  }
  return (
    "Visual style: **Photorealistic** — believable materials and lighting, live-action / key-art photography feel, " +
    "no cartoon outlines unless scene-appropriate."
  );
}

/** Title must appear on the cover, centered (user request). */
function titleTypographyBlock(title: string): string {
  const t = clean(title);
  if (!t) {
    return (
      "Typography: Reserve the **exact horizontal and vertical center** of the cover for the main title. " +
      "If no title string is available, keep that center zone visually clean and symmetrical for later type."
    );
  }
  return (
    `Typography: **Render the title text exactly: "${t}"** as the **only readable lettering** on the cover. ` +
    "Place it at the **geometric center** of the image (vertical and horizontal midpoint), large, legible, " +
    "high contrast against the artwork. Match type treatment to the chosen visual style and medium. " +
    "No subtitle, no credits block, no tagline, no watermark, no extra words."
  );
}

/**
 * English art-direction line from project type (film vs book etc.).
 */
function posterStyleBrief(projectType: string): string {
  const t = projectType.toLowerCase().trim();
  if (t === "book") {
    return (
      "Art direction: commercial fiction book jacket — portrait trim, strong focal illustration that **frames the centered title**, " +
      "spine-safe side margins implied."
    );
  }
  if (t === "audiobook") {
    return (
      "Art direction: audiobook retail cover — bold central illustration, **title sits in the center**, " +
      "streaming-store thumbnail legibility."
    );
  }
  if (t === "film" || t === "short" || t === "webseries") {
    return (
      "Art direction: theatrical film key art — cinematic depth and lighting; **hero title centered** like a movie poster, " +
      "lower edge kept clear of clutter (no fake billing block)."
    );
  }
  if (t === "series") {
    return (
      "Art direction: TV / streaming series key art — iconic scene or cast silhouette; **series title centered**, " +
      "premium serialized look."
    );
  }
  if (t === "audio" || t === "podcast") {
    return (
      "Art direction: audiobook or Hörspiel (audio drama) cover — strong centered subject; **title centered**, " +
      "high contrast for small-player thumbnails."
    );
  }
  if (t === "theater" || t === "theatre") {
    return "Art direction: stage play poster — expressive staging; **play title centered**.";
  }
  if (t === "game") {
    return "Art direction: game key art — heroic readable silhouette; **title centered**.";
  }
  if (t === "comic") {
    return "Art direction: comic book cover — dynamic illustration; **title centered**, cover-style logo ok for the title only.";
  }
  return "Art direction: vertical entertainment cover — strong focal art; **title centered**.";
}

/** Explicit deliverable so the image model cannot drift to the wrong medium. */
function mandatoryFormatLine(projectType: string): string {
  const t = projectType.toLowerCase().trim();
  if (t === "film" || t === "short" || t === "webseries") {
    return (
      "Mandatory format: The artwork must read as a **theatrical film poster** (one-sheet / movie key art). " +
      "Do not present it as a book cover, series banner, or audiobook square."
    );
  }
  if (t === "series") {
    return (
      "Mandatory format: The artwork must read as a **TV or streaming series poster** (serialized show key art). " +
      "Do not present it as a book cover or standalone film one-sheet for a single movie."
    );
  }
  if (t === "book") {
    return (
      "Mandatory format: The artwork must read as a **book cover / printed jacket** (Buchcover). " +
      "Do not present it as a film poster, streaming header, or audiobook tile."
    );
  }
  if (t === "audio" || t === "audiobook" || t === "podcast") {
    return (
      "Mandatory format: The artwork must read as an **audiobook or Hörspiel / audio drama cover** " +
      "(audio release cover art). Do not present it as a theatrical film poster or print book jacket."
    );
  }
  return "";
}

export function buildProjectCoverPrompt(args: {
  project: Record<string, unknown>;
  worldbuildingItems: WorldItem[];
  characters: Character[];
  /** Use editor value when unsaved (e.g. editedType). Defaults to project.type. */
  projectType?: string;
  /** From concept blocks: premise, hook, theme. */
  concept?: CoverConceptExcerpt;
  /** Illustration look (user picks in cover modal). */
  visualStyle?: CoverVisualStyle;
  /** Optional Style Guide compact prompt (English) appended when „Für Cover verwenden“ is on. */
  styleGuideCompactPrompt?: string;
}): string {
  const { project, worldbuildingItems, characters, concept } = args;
  const visualStyle = args.visualStyle ?? "realistic";
  const styleGuideBlock = clean(args.styleGuideCompactPrompt);
  const title = clean(project.title);
  const logline = clean(project.logline);
  const type = clean(args.projectType ?? project.type);
  const genre = clean(project.genre);
  const structure = clean(project.narrative_structure);
  const beatTemplate = clean(project.beat_template);

  const premise = clean(concept?.premise);
  const hook = clean(concept?.hook);
  const theme = clean(concept?.theme);

  const wb = worldbuildingItems
    .slice(0, 8)
    .map(
      (i) =>
        `${clean(i.name)} (${clean(i.category) || clean(i.categoryType) || "world element"})`,
    )
    .filter(Boolean)
    .join(", ");

  const charLine = characters
    .slice(0, 6)
    .map((c) =>
      [clean(c.name), clean(c.role), clean(c.description)]
        .filter(Boolean)
        .join(" - "),
    )
    .filter(Boolean)
    .join("; ");

  const mandatory = mandatoryFormatLine(type || "other");

  return [
    posterStyleBrief(type || "other"),
    mandatory,
    visualStyleInstruction(visualStyle),
    titleTypographyBlock(title),
    "Format: portrait 2:3, 800x1200, geometric center reserved for the title as above, no watermark, no body copy.",
    type ? `Project type: ${type}.` : "",
    genre ? `Genre and mood: ${genre}.` : "",
    logline ? `Logline: ${logline}.` : "",
    premise ? `Premise: ${premise}.` : "",
    hook ? `Hook: ${hook}.` : "",
    theme ? `Thematic thread: ${theme}.` : "",
    structure ? `Narrative structure hint: ${structure}.` : "",
    beatTemplate ? `Beat template hint: ${beatTemplate}.` : "",
    wb ? `Worldbuilding anchors: ${wb}.` : "",
    charLine ? `Main characters (visual cues only): ${charLine}.` : "",
    styleGuideBlock
      ? `Project style guide (canonical — follow for look, palette, and constraints):\n${styleGuideBlock}`
      : "",
    "Use dramatic lighting, high detail, coherent color palette, and clear foreground/background separation.",
  ]
    .filter(Boolean)
    .join("\n");
}
