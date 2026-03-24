/**
 * Script import — public surface for apps: kinds, extractors, parse registry, pipeline, persist.
 */

export type {
  ScriptProjectKind,
  ImportSegment,
  ImportParseResult,
  ImportParseError,
  ImportParseOutcome,
  ImportedTimelineData,
} from './types';

export { normalizeScriptProjectKind } from './kind';
export { parseScriptSource, getSegmentParser } from './registry';
export { readFileAsUtf8, SCRIPT_IMPORT_ACCEPT } from './file';
export { extractPlainTextForImport } from './extract-text';
export { persistImportedSegments } from './persist';
export {
  extractAndParseScriptFile,
  importScriptFileToProject,
  importStructureConfirmMessage,
} from './pipeline';
