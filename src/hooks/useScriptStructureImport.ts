/**
 * useScriptStructureImport — thin React adapter over script-import pipeline (preview = parse once, persist reuses parsed segments).
 * Location: src/hooks/useScriptStructureImport.ts
 */

import { useCallback, useMemo, useState } from "react";
import {
  extractAndParseScriptFile,
  normalizeScriptProjectKind,
  type ImportParseOutcome,
  type ImportParseResult,
  type ScriptProjectKind,
} from "../lib/script-import";

export function useScriptStructureImport(projectType?: string) {
  const kind: ScriptProjectKind = useMemo(
    () => normalizeScriptProjectKind(projectType),
    [projectType],
  );

  const [parsed, setParsed] = useState<ImportParseResult | null>(null);

  const analyzeFile = useCallback(
    async (file: File): Promise<ImportParseOutcome> => {
      const outcome = await extractAndParseScriptFile(file, kind);
      if (outcome.ok) {
        setParsed(outcome);
      } else {
        setParsed(null);
      }
      return outcome;
    },
    [kind],
  );

  const discardParsed = useCallback(() => setParsed(null), []);

  return { kind, parsed, analyzeFile, discardParsed };
}
