/**
 * Composes extract → parse → (optional) persist. Framework-agnostic; UI calls these only.
 */

import type { ImportedTimelineData, ImportParseOutcome, ScriptProjectKind } from './types';
import { extractPlainTextForImport } from './extract-text';
import { parseScriptSource } from './registry';
import { persistImportedSegments } from './persist';
import { normalizeScriptProjectKind } from './kind';

/** File → plain text → segments (one round-trip; reuse for preview + persist). */
export async function extractAndParseScriptFile(
  file: File,
  kind: ScriptProjectKind
): Promise<ImportParseOutcome> {
  const text = await extractPlainTextForImport(file);
  return parseScriptSource(kind, text);
}

/** Full import: extract + parse + API persist + reload timeline. */
export async function importScriptFileToProject(
  projectId: string,
  projectType: string | undefined,
  file: File,
  token: string
): Promise<ImportedTimelineData> {
  const kind = normalizeScriptProjectKind(projectType);
  const outcome = await extractAndParseScriptFile(file, kind);
  if (!outcome.ok) {
    throw new Error(outcome.error);
  }
  return persistImportedSegments(projectId, kind, outcome.segments, token);
}

/** User-facing confirm copy (keeps UI dumb). */
export function importStructureConfirmMessage(
  kind: ScriptProjectKind,
  segmentCount: number
): string {
  if (kind === 'book') {
    return `${segmentCount} Kapitel/Abschnitt(e) erkannt. Unter Akt I werden Sequenzen angelegt. Fortfahren?`;
  }
  return `${segmentCount} Szene(n) erkannt. Verteilung auf die drei Akte (je eine Import-Sequenz pro Akt mit Szenen). Fortfahren?`;
}
