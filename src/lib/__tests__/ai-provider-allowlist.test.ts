import { describe, it, expect } from "vitest";
import {
  isOllamaFamilyProviderId,
  normalizeProviderIdForUi,
  inferOllamaModeFromProviderId,
  inferOllamaModeForFeature,
  providerIdForOllamaMode,
  collapseProvidersForFeature,
  filterProvidersForFeature,
  CANONICAL_OLLAMA_PROVIDER_ID,
  OLLAMA_FAMILY_PROVIDER_IDS,
  type OllamaUiMode,
} from "../ai-provider-allowlist";

describe("ai-provider-allowlist", () => {
  describe("isOllamaFamilyProviderId", () => {
    it("returns true for 'ollama'", () => {
      expect(isOllamaFamilyProviderId("ollama")).toBe(true);
    });

    it("returns true for 'ollama_local'", () => {
      expect(isOllamaFamilyProviderId("ollama_local")).toBe(true);
    });

    it("returns true for 'ollama_cloud'", () => {
      expect(isOllamaFamilyProviderId("ollama_cloud")).toBe(true);
    });

    it("returns false for 'openai'", () => {
      expect(isOllamaFamilyProviderId("openai")).toBe(false);
    });

    it("returns false for 'anthropic'", () => {
      expect(isOllamaFamilyProviderId("anthropic")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isOllamaFamilyProviderId("")).toBe(false);
    });
  });

  describe("normalizeProviderIdForUi", () => {
    it("normalizes 'ollama' to canonical 'ollama'", () => {
      expect(normalizeProviderIdForUi("ollama")).toBe("ollama");
    });

    it("normalizes 'ollama_local' to canonical 'ollama'", () => {
      expect(normalizeProviderIdForUi("ollama_local")).toBe("ollama");
    });

    it("normalizes 'ollama_cloud' to canonical 'ollama'", () => {
      expect(normalizeProviderIdForUi("ollama_cloud")).toBe("ollama");
    });

    it("passes through non-Ollama provider IDs unchanged", () => {
      expect(normalizeProviderIdForUi("openai")).toBe("openai");
      expect(normalizeProviderIdForUi("anthropic")).toBe("anthropic");
      expect(normalizeProviderIdForUi("google")).toBe("google");
    });
  });

  describe("inferOllamaModeFromProviderId", () => {
    it("returns 'cloud' for 'ollama_cloud'", () => {
      expect(inferOllamaModeFromProviderId("ollama_cloud")).toBe("cloud");
    });

    it("returns 'local' for 'ollama_local'", () => {
      expect(inferOllamaModeFromProviderId("ollama_local")).toBe("local");
    });

    it("returns 'local' for plain 'ollama'", () => {
      expect(inferOllamaModeFromProviderId("ollama")).toBe("local");
    });
  });

  describe("inferOllamaModeForFeature", () => {
    it("returns 'cloud' for explicit 'ollama_cloud'", () => {
      expect(
        inferOllamaModeForFeature("ollama_cloud", "assistant_chat", {}),
      ).toBe("cloud");
    });

    it("returns 'local' for explicit 'ollama_local'", () => {
      expect(
        inferOllamaModeForFeature("ollama_local", "assistant_chat", {}),
      ).toBe("local");
    });

    it("returns 'cloud' for plain 'ollama' when cloud key exists", () => {
      const keyIndex = { "assistant_chat:ollama_cloud": true };
      expect(
        inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex),
      ).toBe("cloud");
    });

    it("returns 'cloud' for plain 'ollama' when canonical key exists", () => {
      const keyIndex = { "assistant_chat:ollama": true };
      expect(
        inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex),
      ).toBe("cloud");
    });

    it("returns 'local' for plain 'ollama' when no key exists", () => {
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", {})).toBe(
        "local",
      );
    });

    it("returns 'local' for plain 'ollama' when only local key exists", () => {
      const keyIndex = { "assistant_chat:ollama_local": true };
      // ollama_local key doesn't trigger cloud mode — it's the local provider key
      expect(
        inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex),
      ).toBe("local");
    });

    it("returns 'cloud' for plain 'ollama' when key exists for different feature", () => {
      // Key for a different feature should NOT affect this feature
      const keyIndex = { "creative_gym:ollama_cloud": true };
      expect(
        inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex),
      ).toBe("local");
    });
  });

  describe("providerIdForOllamaMode", () => {
    it("returns 'ollama_cloud' for 'cloud'", () => {
      expect(providerIdForOllamaMode("cloud")).toBe("ollama_cloud");
    });

    it("returns 'ollama_local' for 'local'", () => {
      expect(providerIdForOllamaMode("local")).toBe("ollama_local");
    });
  });

  describe("collapseProvidersForFeature", () => {
    it("collapses three Ollama entries into one", () => {
      const providers = [
        { id: "openai", name: "OpenAI" },
        { id: "ollama", name: "Ollama" },
        { id: "ollama_local", name: "Ollama Local" },
        { id: "ollama_cloud", name: "Ollama Cloud" },
        { id: "anthropic", name: "Anthropic" },
      ];
      const collapsed = collapseProvidersForFeature(providers);
      const ollamaEntries = collapsed.filter(
        (p) => normalizeProviderIdForUi(p.id) === CANONICAL_OLLAMA_PROVIDER_ID,
      );
      expect(ollamaEntries).toHaveLength(1);
      expect(ollamaEntries[0].id).toBe("ollama");
      expect(ollamaEntries[0].name).toBe("Ollama");
      // Non-Ollama entries should be preserved
      expect(collapsed).toHaveLength(3); // openai, ollama, anthropic
    });

    it("does not collapse non-Ollama entries", () => {
      const providers = [
        { id: "openai", name: "OpenAI" },
        { id: "anthropic", name: "Anthropic" },
      ];
      const collapsed = collapseProvidersForFeature(providers);
      expect(collapsed).toHaveLength(2);
      expect(collapsed[0].id).toBe("openai");
      expect(collapsed[1].id).toBe("anthropic");
    });

    it("handles empty provider list", () => {
      expect(collapseProvidersForFeature([])).toEqual([]);
    });

    it("handles single Ollama entry", () => {
      const providers = [{ id: "ollama", name: "Ollama" }];
      const collapsed = collapseProvidersForFeature(providers);
      expect(collapsed).toHaveLength(1);
      expect(collapsed[0].id).toBe("ollama");
    });
  });

  describe("filterProvidersForFeature", () => {
    it("filters and collapses providers for assistant_chat", () => {
      const providers = [
        { id: "openai", name: "OpenAI" },
        { id: "ollama_local", name: "Ollama Local" },
        { id: "ollama_cloud", name: "Ollama Cloud" },
        { id: "deepseek", name: "DeepSeek" },
        { id: "tiktok", name: "TikTok" }, // not in allowlist
      ];
      const filtered = filterProvidersForFeature("assistant_chat", providers);
      const ids = filtered.map((p) => p.id);
      // Should not contain tiktok
      expect(ids).not.toContain("tiktok");
      // Should contain only one Ollama entry
      const ollamaIds = ids.filter(
        (id) => normalizeProviderIdForUi(id) === CANONICAL_OLLAMA_PROVIDER_ID,
      );
      expect(ollamaIds).toHaveLength(1);
    });

    it("returns empty array for unknown feature", () => {
      const providers = [{ id: "openai", name: "OpenAI" }];
      const filtered = filterProvidersForFeature(
        "unknown_feature" as any,
        providers,
      );
      // Unknown feature has no allowlist, so all providers pass through
      expect(filtered).toEqual(providers);
    });
  });

  describe("OLLAMA_FAMILY_PROVIDER_IDS", () => {
    it("contains all three Ollama variants", () => {
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama");
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama_local");
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama_cloud");
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toHaveLength(3);
    });
  });

  describe("CANONICAL_OLLAMA_PROVIDER_ID", () => {
    it("is 'ollama'", () => {
      expect(CANONICAL_OLLAMA_PROVIDER_ID).toBe("ollama");
    });
  });
});
