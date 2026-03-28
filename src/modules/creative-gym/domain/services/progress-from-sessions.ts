/**
 * Skill profile updates when a session completes (deterministic, testable).
 * Location: src/modules/creative-gym/domain/services/progress-from-sessions.ts
 */

import type { SkillFocus, SkillProfile } from "../types";

const MAX_DIM = 100;

function clamp(n: number): number {
  return Math.min(MAX_DIM, Math.max(0, Math.round(n * 10) / 10));
}

export function bumpSkillForFocuses(
  profile: SkillProfile,
  focuses: SkillFocus[],
  amount: number
): SkillProfile {
  const next = { ...profile };
  const a = amount;
  for (const f of focuses) {
    switch (f) {
      case "originality":
        next.originality = clamp(next.originality + a);
        break;
      case "conflict":
        next.conflict = clamp(next.conflict + a);
        break;
      case "perspective":
        next.perspective = clamp(next.perspective + a);
        break;
      case "compression":
        next.compression = clamp(next.compression + a);
        break;
      case "dialogue_tension":
        next.dialogueTension = clamp(next.dialogueTension + a);
        break;
      case "scene_flow":
        next.sceneFlow = clamp(next.sceneFlow + a);
        break;
      case "structure":
        next.structure = clamp(next.structure + a);
        break;
      case "finishing":
        next.finishing = clamp(next.finishing + a);
        break;
      case "media_translation":
        next.mediaTranslation = clamp(next.mediaTranslation + a);
        break;
      default:
        break;
    }
  }
  return next;
}

/** Call when a session is marked completed with review + template skill focuses */
export function mergeCompletedSession(
  profile: SkillProfile,
  focuses: SkillFocus[],
  usefulness: 1 | 2 | 3 | 4 | 5,
  transferReady: boolean
): SkillProfile {
  const amount = (usefulness / 5) * 1.8;
  let next = bumpSkillForFocuses(profile, focuses, amount * 0.12);
  next = {
    ...next,
    sessionsCompleted: (next.sessionsCompleted ?? 0) + 1,
  };
  if (transferReady) {
    next.mediaTranslation = clamp(next.mediaTranslation + 0.35);
  }
  return next;
}
