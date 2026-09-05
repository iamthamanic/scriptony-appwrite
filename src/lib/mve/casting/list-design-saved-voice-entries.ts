/**
 * Map MVE voice profiles saved from Voice Design candidates to VoiceEntry list items.
 * Location: src/lib/mve/casting/list-design-saved-voice-entries.ts
 */

import type { VoiceEntry } from "@/lib/api/voice-entry";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

function hasCatalogMatchAttributes(profile: MveVoiceProfile): boolean {
  const attributes = profile.attributes;
  if (!attributes) return false;
  return Object.values(attributes).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

/** True when the profile was persisted via saveVoiceDesignCandidate (not catalog suggest). */
export function isMveVoiceDesignCandidateSave(
  profile: MveVoiceProfile,
): boolean {
  if (profile.type !== "generated") return false;
  const baseVoiceId = profile.baseVoiceId?.trim();
  if (!baseVoiceId || baseVoiceId.startsWith("preset:")) return false;
  return !hasCatalogMatchAttributes(profile);
}

export function designSavedVoiceEntriesForCharacter(
  profiles: MveVoiceProfile[],
  characterId: string,
): VoiceEntry[] {
  return profiles
    .filter(
      (profile) =>
        profile.characterId === characterId &&
        isMveVoiceDesignCandidateSave(profile),
    )
    .flatMap((profile) => {
      const id = profile.baseVoiceId?.trim();
      if (!id) return [];
      return [
        {
          id,
          name: profile.name.trim() || id,
          lang: profile.language?.trim() || "de",
          gender: "designt",
        } satisfies VoiceEntry,
      ];
    });
}
