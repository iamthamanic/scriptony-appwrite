/**
 * Tests for design-saved voice dropdown entries.
 */

import { describe, expect, it } from "vitest";
import {
  designSavedVoiceEntriesForCharacter,
  isMveVoiceDesignCandidateSave,
} from "../list-design-saved-voice-entries";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

const baseProfile: MveVoiceProfile = {
  id: "mve-1",
  userId: "local-user",
  name: "Pazulu — Kandidat A",
  language: "de",
  engine: "voicebox",
  type: "generated",
  status: "ready",
  baseVoiceId: "vb-designed-1",
  characterId: "char-pazulu",
  consentStatus: "not_required",
  commercialUseAllowed: false,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("isMveVoiceDesignCandidateSave", () => {
  it("accepts generated profiles without catalog-match attributes", () => {
    expect(isMveVoiceDesignCandidateSave(baseProfile)).toBe(true);
  });

  it("rejects catalog suggest profiles with attributes", () => {
    expect(
      isMveVoiceDesignCandidateSave({
        ...baseProfile,
        attributes: { pitch: "high", genderPresentation: "female" },
      }),
    ).toBe(false);
  });

  it("rejects preset baseVoiceId", () => {
    expect(
      isMveVoiceDesignCandidateSave({
        ...baseProfile,
        baseVoiceId: "preset:kokoro:af_sarah",
      }),
    ).toBe(false);
  });

  it("rejects non-generated types", () => {
    expect(
      isMveVoiceDesignCandidateSave({
        ...baseProfile,
        type: "default",
      }),
    ).toBe(false);
  });
});

describe("designSavedVoiceEntriesForCharacter", () => {
  it("maps matching character profiles to voice entries", () => {
    const entries = designSavedVoiceEntriesForCharacter(
      [
        baseProfile,
        {
          ...baseProfile,
          id: "mve-2",
          characterId: "char-other",
          baseVoiceId: "vb-other",
        },
        {
          ...baseProfile,
          id: "mve-3",
          attributes: { pitch: "medium" },
        },
      ],
      "char-pazulu",
    );

    expect(entries).toEqual([
      {
        id: "vb-designed-1",
        name: "Pazulu — Kandidat A",
        lang: "de",
        gender: "designt",
      },
    ]);
  });
});
