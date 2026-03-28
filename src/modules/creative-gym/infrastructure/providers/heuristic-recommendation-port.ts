/**
 * Rule-based recommendations from skill profile + history (no AI).
 * Location: src/modules/creative-gym/infrastructure/providers/heuristic-recommendation-port.ts
 */

import type { RecommendationPort } from "../../domain/ports/recommendation-port";
import type { RecommendationInput, TrainingRecommendation } from "../../domain/types";
import { CHALLENGE_SEEDS } from "../seeds/challenge-seeds";

const FOCUS_KEYS = [
  "originality",
  "conflict",
  "perspective",
  "compression",
  "dialogueTension",
  "sceneFlow",
  "structure",
  "finishing",
  "mediaTranslation",
] as const;

export class HeuristicRecommendationPort implements RecommendationPort {
  async getRecommendations(input: RecommendationInput): Promise<TrainingRecommendation[]> {
    const profile = input.skillProfile;
    const recent = new Set(input.recentChallengeIds);

    let weakest: typeof FOCUS_KEYS[number] = "originality";
    let min = 999;
    if (profile) {
      for (const k of FOCUS_KEYS) {
        const v = profile[k];
        if (v < min) {
          min = v;
          weakest = k;
        }
      }
    }

    const pool = CHALLENGE_SEEDS.filter(
      (c) =>
        !recent.has(c.id) &&
        (c.skillFocus.some((s) => s === mapWeakestToSkillFocus(weakest)) || !profile)
    );

    const source = pool.length > 0 ? pool : CHALLENGE_SEEDS;
    return source.slice(0, 3).map((c, i) => ({
      id: `rec-${c.id}-${i}`,
      reason: profile
        ? `Stärkt ${mapWeakestToSkillFocus(weakest)} (aktuell niedrigste Dimension).`
        : "Einstieg über feste Trainings-Challenge.",
      challengeTemplateId: c.id,
      intent: c.defaultIntent,
      medium: c.supportedMedia[0],
    }));
  }
}

function mapWeakestToSkillFocus(
  w: (typeof FOCUS_KEYS)[number]
): import("../../domain/types").SkillFocus {
  const map: Record<(typeof FOCUS_KEYS)[number], import("../../domain/types").SkillFocus> = {
    originality: "originality",
    conflict: "conflict",
    perspective: "perspective",
    compression: "compression",
    dialogueTension: "dialogue_tension",
    sceneFlow: "scene_flow",
    structure: "structure",
    finishing: "finishing",
    mediaTranslation: "media_translation",
  };
  return map[w];
}
