/**
 * Composition root: wire repositories and adapters for one user + mode.
 * Location: src/modules/creative-gym/application/wiring.ts
 */

import type { CreativeGymMode } from "../domain/types";
import type { CreativeGymDeps } from "./creative-gym-deps";
import { LocalStorageModeResolver } from "../adapters/integrated/local-storage-mode-resolver";
import { ScriptonyProjectBridge } from "../adapters/integrated/scriptony-project-bridge";
import { NullProjectBridge } from "../adapters/standalone/null-project-bridge";
import { LocalCapsuleBridge } from "../adapters/standalone/local-capsule-bridge";
import { InMemoryChallengeRepository } from "../infrastructure/repositories/in-memory-challenge-repository";
import { LocalArtifactRepository } from "../infrastructure/repositories/local-artifact-repository";
import { LocalSessionRepository } from "../infrastructure/repositories/local-session-repository";
import { LocalSkillProfileRepository } from "../infrastructure/repositories/local-skill-profile-repository";
import { HeuristicRecommendationPort } from "../infrastructure/providers/heuristic-recommendation-port";
import { StubCreativeAssistPort } from "../infrastructure/providers/stub-creative-assist-port";

export function createCreativeGymDeps(
  userId: string,
  mode: CreativeGymMode,
): CreativeGymDeps {
  return {
    userId,
    challenges: new InMemoryChallengeRepository(),
    sessions: new LocalSessionRepository(userId),
    artifacts: new LocalArtifactRepository(userId),
    skills: new LocalSkillProfileRepository(userId),
    recommendations: new HeuristicRecommendationPort(),
    projectBridge:
      mode === "integrated"
        ? new ScriptonyProjectBridge()
        : new NullProjectBridge(),
    capsuleBridge: new LocalCapsuleBridge(),
    assist: new StubCreativeAssistPort(),
  };
}

export async function resolveCreativeGymMode(): Promise<CreativeGymMode> {
  return new LocalStorageModeResolver().getMode();
}

export { LocalStorageModeResolver };
