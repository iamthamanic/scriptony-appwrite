/**
 * Fountain-style scene heading detection (INT./EXT.).
 * Extend or swap this module without touching UI or persistence.
 */

import type { ImportParseOutcome, ImportSegment } from "../types";

const SCENE_HEADING =
  /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|I\/E\.?|EST\.?)\s+/i;

function pushSegment(out: ImportSegment[], title: string, body: string) {
  const t = title.trim();
  const b = body.trim();
  if (!t && !b) return;
  out.push({ title: t || "Szene", body: b });
}

export function parseFountainLikeScenes(source: string): ImportParseOutcome {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const segments: ImportSegment[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    pushSegment(segments, currentTitle, currentBody.join("\n"));
    currentBody = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && SCENE_HEADING.test(trimmed)) {
      flush();
      currentTitle = trimmed;
      continue;
    }
    currentBody.push(line);
  }
  flush();

  if (segments.length === 0) {
    const body = source.trim();
    if (!body) {
      return {
        ok: false,
        error:
          "Datei ist leer oder enthält keine Szenenüberschriften (INT./EXT.).",
      };
    }
    segments.push({ title: "Skript", body });
    return {
      ok: true,
      segments,
      warnings: [
        "Keine INT./EXT.-Überschriften gefunden — gesamter Text wurde als eine Szene angelegt.",
      ],
    };
  }

  return { ok: true, segments, warnings: [] };
}
