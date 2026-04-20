/**
 * Shared parsing for tool inputs (DRY between validation and execute).
 */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function readString(obj: unknown, key: string): string | undefined {
  if (!isPlainObject(obj)) return undefined;
  const v = obj[key];
  return nonEmptyString(v) ? v.trim() : undefined;
}

export interface ProjectIdResolutionContext {
  projectId?: string;
}

/** project_id from input body or runtime default (POST body project_id on host). */
export function resolveProjectId(
  input: unknown,
  ctx: ProjectIdResolutionContext,
): string | undefined {
  const fromInput = readString(input, "project_id");
  const fromCtx = ctx.projectId?.trim();
  return fromInput ?? (fromCtx && fromCtx.length > 0 ? fromCtx : undefined);
}
