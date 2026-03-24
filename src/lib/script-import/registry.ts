/**
 * Maps project type → parse function (Open/Closed: add types by extending this map).
 */

import type { ScriptProjectKind, ImportParseOutcome } from './types';
import { parseFountainLikeScenes } from './profiles/fountain-scenes';
import { parseBookChapters } from './profiles/book-chapters';

export type SegmentParser = (source: string) => ImportParseOutcome;

const PARSERS: Record<ScriptProjectKind, SegmentParser> = {
  film: parseFountainLikeScenes,
  series: parseFountainLikeScenes,
  audio: parseFountainLikeScenes,
  book: parseBookChapters,
};

export function getSegmentParser(kind: string): SegmentParser | null {
  if (kind in PARSERS) {
    return PARSERS[kind as ScriptProjectKind];
  }
  return null;
}

const FILM_LIKE: ScriptProjectKind[] = ['film', 'series', 'audio'];

export function parseScriptSource(kind: string, source: string): ImportParseOutcome {
  const parser = getSegmentParser(kind);
  if (!parser) {
    return { ok: false, error: `Unbekannter Projekttyp: ${kind}` };
  }

  const k = kind as ScriptProjectKind;
  if (FILM_LIKE.includes(k)) {
    const fountain = parseFountainLikeScenes(source);
    if (
      fountain.ok &&
      fountain.segments.length === 1 &&
      fountain.warnings.length > 0
    ) {
      const book = parseBookChapters(source);
      if (book.ok && book.segments.length > 1) {
        return {
          ok: true,
          segments: book.segments,
          warnings: [
            'Keine INT./EXT.-Überschriften — Text wurde wie Kapitel/Abschnitte (Roman/Prosa) erkannt.',
            ...book.warnings,
          ],
        };
      }
    }
    return fountain;
  }

  return parser(source);
}
