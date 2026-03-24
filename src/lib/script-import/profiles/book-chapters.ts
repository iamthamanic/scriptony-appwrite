/**
 * Heuristic chapter split for prose / markdown (DE/EN).
 * Swap implementations via registry without changing callers.
 */

import type { ImportParseOutcome, ImportSegment } from '../types';

const CHAPTER_LINE =
  /^(?:Kapitel|Kap\.|Teil|Part|Chapter|CHAPTER)\s*[\dIVXLC]+[.:)\s-]?\s*(.*)$/i;
/** Standalone front/back matter (German novel layout). */
const PROLOG_EPILOG_LINE =
  /^(?:(?:Literarischer|Literary)\s+)?(Prolog|Epilog)(?:\s*[-–—:]\s*(.+))?$/i;
/** Case-file marker on its own line (e.g. // Fallakte 001). */
const FALLAKTE_LINE = /^(?:\/\/\s*)?Fallakte\s+[\dIVXLC]+(?:[.:)\s-].*)?$/i;
const MD_HEADING = /^(#{1,3})\s+(.+)$/;

export function parseBookChapters(source: string): ImportParseOutcome {
  const text = source.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const segments: ImportSegment[] = [];

  let currentTitle = '';
  let currentBody: string[] = [];

  const flush = () => {
    const title = currentTitle.trim() || 'Kapitel';
    const body = currentBody.join('\n').trim();
    if (title || body) {
      segments.push({ title: title || 'Kapitel', body });
    }
    currentBody = [];
  };

  for (const line of lines) {
    const t = line.trim();
    let matched = false;

    if (CHAPTER_LINE.test(t)) {
      flush();
      currentTitle = t;
      matched = true;
    } else if (PROLOG_EPILOG_LINE.test(t)) {
      flush();
      currentTitle = t;
      matched = true;
    } else if (FALLAKTE_LINE.test(t)) {
      flush();
      currentTitle = t;
      matched = true;
    } else {
      const md = t.match(MD_HEADING);
      if (md && md[1].length <= 3) {
        flush();
        currentTitle = md[2].trim();
        matched = true;
      }
    }

    if (!matched) {
      currentBody.push(line);
    }
  }
  flush();

  if (segments.length === 0) {
    const body = text.trim();
    if (!body) {
      return { ok: false, error: 'Datei ist leer.' };
    }
    return {
      ok: true,
      segments: [{ title: 'Manuskript', body }],
      warnings: ['Keine Kapitel-Markierungen erkannt — gesamter Text als ein Block.'],
    };
  }

  return { ok: true, segments, warnings: [] };
}
