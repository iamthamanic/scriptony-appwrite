/**
 * Pure challenge filtering for library / recommendations.
 * Location: src/modules/creative-gym/domain/services/challenge-filter.ts
 */

import type { ChallengeFilter, ChallengeTemplate } from "../types";

export function filterChallenges(
  templates: ChallengeTemplate[],
  filters?: ChallengeFilter,
): ChallengeTemplate[] {
  if (!filters) return templates;
  let list = templates;

  if (filters.intent) {
    const it = filters.intent;
    list = list.filter(
      (c) => c.defaultIntent === it || c.tags.includes(`intent:${it}`),
    );
  }
  if (filters.medium) {
    list = list.filter((c) => c.supportedMedia.includes(filters.medium!));
  }
  if (filters.maxDurationMin != null) {
    list = list.filter(
      (c) => c.recommendedDurationMin <= filters.maxDurationMin!,
    );
  }
  if (filters.minDurationMin != null) {
    list = list.filter(
      (c) => c.recommendedDurationMin >= filters.minDurationMin!,
    );
  }
  if (filters.difficulty) {
    list = list.filter((c) => c.difficulty === filters.difficulty);
  }
  if (filters.sessionMode) {
    list = list.filter(
      (c) =>
        c.defaultSessionMode === filters.sessionMode ||
        c.tags.includes(filters.sessionMode!),
    );
  }
  if (filters.skillFocus) {
    list = list.filter((c) => c.skillFocus.includes(filters.skillFocus!));
  }
  if (filters.problemType) {
    list = list.filter((c) => c.problemTypes.includes(filters.problemType!));
  }
  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.slug.includes(q),
    );
  }

  return list;
}
