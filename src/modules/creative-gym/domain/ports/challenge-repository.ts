/**
 * Port: challenge catalog access.
 * Location: src/modules/creative-gym/domain/ports/challenge-repository.ts
 */

import type { ChallengeFilter, ChallengeTemplate } from "../types";

export interface ChallengeRepository {
  list(filters?: ChallengeFilter): Promise<ChallengeTemplate[]>;
  getById(id: string): Promise<ChallengeTemplate | null>;
  getDailyChallenge(userId: string): Promise<ChallengeTemplate | null>;
}
