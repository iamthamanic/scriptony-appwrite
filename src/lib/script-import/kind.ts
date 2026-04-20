/**
 * Single place to map UI / API project.type → script-import profile key (DRY).
 */

import type { ScriptProjectKind } from "./types";

const KINDS = new Set<ScriptProjectKind>(["film", "series", "book", "audio"]);

export function normalizeScriptProjectKind(
  projectType: string | undefined,
): ScriptProjectKind {
  const k = (projectType ?? "film").toLowerCase();
  return (KINDS.has(k as ScriptProjectKind) ? k : "film") as ScriptProjectKind;
}
