/**
 * Injectable dependencies for Creative Gym use cases.
 * Location: src/modules/creative-gym/application/creative-gym-deps.ts
 */

import type { ArtifactRepository } from "../domain/ports/artifact-repository";
import type { CapsuleBridgePort } from "../domain/ports/capsule-bridge-port";
import type { ChallengeRepository } from "../domain/ports/challenge-repository";
import type { CreativeAssistPort } from "../domain/ports/creative-assist-port";
import type { ProjectBridgePort } from "../domain/ports/project-bridge-port";
import type { RecommendationPort } from "../domain/ports/recommendation-port";
import type { SessionRepository } from "../domain/ports/session-repository";
import type { SkillProfileRepository } from "../domain/ports/skill-profile-repository";

export interface CreativeGymDeps {
  userId: string;
  challenges: ChallengeRepository;
  sessions: SessionRepository;
  artifacts: ArtifactRepository;
  skills: SkillProfileRepository;
  recommendations: RecommendationPort;
  projectBridge: ProjectBridgePort;
  capsuleBridge: CapsuleBridgePort;
  assist: CreativeAssistPort;
}
