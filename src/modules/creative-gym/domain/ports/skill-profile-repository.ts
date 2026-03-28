/**
 * Port: skill profile persistence.
 * Location: src/modules/creative-gym/domain/ports/skill-profile-repository.ts
 */

import type { SkillProfile } from "../types";

export interface SkillProfileRepository {
  getByUser(userId: string): Promise<SkillProfile | null>;
  save(profile: SkillProfile): Promise<SkillProfile>;
}
