/**
 * Challenge catalog from seed data (read-only).
 * Location: src/modules/creative-gym/infrastructure/repositories/in-memory-challenge-repository.ts
 */

import type { ChallengeRepository } from "../../domain/ports/challenge-repository";
import type { ChallengeFilter, ChallengeTemplate } from "../../domain/types";
import { filterChallenges } from "../../domain/services/challenge-filter";
import { CHALLENGE_SEEDS } from "../seeds/challenge-seeds";

export class InMemoryChallengeRepository implements ChallengeRepository {
  private readonly all: ChallengeTemplate[];

  constructor(seeds: ChallengeTemplate[] = CHALLENGE_SEEDS) {
    this.all = seeds;
  }

  async list(filters?: ChallengeFilter): Promise<ChallengeTemplate[]> {
    return filterChallenges(this.all, filters);
  }

  async getById(id: string): Promise<ChallengeTemplate | null> {
    return this.all.find((c) => c.id === id) ?? null;
  }

  /** Deterministic daily pick from user id + UTC date */
  async getDailyChallenge(userId: string): Promise<ChallengeTemplate | null> {
    if (this.all.length === 0) return null;
    const day = new Date().toISOString().slice(0, 10);
    let h = 0;
    const s = `${userId}|${day}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const idx = h % this.all.length;
    return this.all[idx] ?? null;
  }
}
