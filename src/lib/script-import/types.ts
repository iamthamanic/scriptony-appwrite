/**
 * Script import — shared types (project: src/lib/script-import).
 * Keeps parsers and persistence decoupled from React.
 */

import type { Act, Scene, Sequence, Shot } from '../types';

/** Same shape as FilmDropdown TimelineData; kept here to avoid lib → components imports. */
export interface ImportedTimelineData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
}

export type ScriptProjectKind = 'film' | 'series' | 'book' | 'audio';

/** One logical block after parsing (scene slug, chapter, or audio cue block). */
export interface ImportSegment {
  title: string;
  body: string;
}

export interface ImportParseResult {
  ok: true;
  segments: ImportSegment[];
  warnings: string[];
}

export interface ImportParseError {
  ok: false;
  error: string;
}

export type ImportParseOutcome = ImportParseResult | ImportParseError;
