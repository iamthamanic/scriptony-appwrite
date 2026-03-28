/**
 * Skill profile in localStorage.
 * Location: src/modules/creative-gym/infrastructure/repositories/local-skill-profile-repository.ts
 */

import type { SkillProfileRepository } from "../../domain/ports/skill-profile-repository";
import type { SkillProfile } from "../../domain/types";
import { readJson, storageKey, writeJson } from "../storage/local-json-storage";

function defaultProfile(userId: string): SkillProfile {
  return {
    userId,
    originality: 12,
    conflict: 12,
    perspective: 12,
    compression: 12,
    dialogueTension: 12,
    sceneFlow: 12,
    structure: 12,
    finishing: 12,
    mediaTranslation: 12,
    sessionsCompleted: 0,
    currentStreak: 0,
  };
}

export class LocalSkillProfileRepository implements SkillProfileRepository {
  constructor(private readonly userId: string) {}

  private key(): string {
    return storageKey(this.userId, "skill-profile");
  }

  async getByUser(userId: string): Promise<SkillProfile | null> {
    if (userId !== this.userId) return null;
    const p = readJson<SkillProfile | null>(this.key(), null);
    return p ?? defaultProfile(userId);
  }

  async save(profile: SkillProfile): Promise<SkillProfile> {
    writeJson(this.key(), profile);
    return profile;
  }
}
