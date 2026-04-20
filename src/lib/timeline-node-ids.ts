/**
 * Optimistic UI nodes (FilmDropdown etc.) use ids like `temp-act-*` / `temp-scene-*`.
 * Those must never be sent to Timeline/Nodes API until replaced by persisted ids.
 */

export function isPersistedTimelineNodeId(
  id: string | undefined | null,
): boolean {
  if (id == null || typeof id !== "string" || id.length === 0) return false;
  return !id.startsWith("temp-");
}
