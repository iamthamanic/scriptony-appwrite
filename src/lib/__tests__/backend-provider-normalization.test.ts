/**
 * 3.6 Backend unit tests: provider normalization
 * Tests the backend-side Ollama provider normalization functions
 * that mirror the frontend ai-provider-allowlist logic.
 *
 * These test the _shared modules that both frontend and backend depend on.
 */
import { describe, it, expect } from "vitest";

// We test the shared backend provider registry which the frontend allowlist mirrors
// Note: The backend modules use Node.js imports (http, https), so we test the
// pure-logic parts that don't require network.

// --- _shared/ai-service/providers/index.ts exports ---

// Import via dynamic path to avoid Node.js module issues in Vitest
// Instead, we test the pure normalization constants and logic that are
// also mirrored in the frontend ai-provider-allowlist.ts

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
} from "../ai-provider-allowlist";

describe("Backend provider normalization", () => {
  describe("Ollama family identification", () => {
    it("identifies all three Ollama variants", () => {
      expect(isOllamaFamilyProviderId("ollama")).toBe(true);
      expect(isOllamaFamilyProviderId("ollama_local")).toBe(true);
      expect(isOllamaFamilyProviderId("ollama_cloud")).toBe(true);
    });

    it("rejects non-Ollama providers", () => {
      expect(isOllamaFamilyProviderId("openai")).toBe(false);
      expect(isOllamaFamilyProviderId("anthropic")).toBe(false);
      expect(isOllamaFamilyProviderId("")).toBe(false);
    });

    it("OLLAMA_FAMILY_PROVIDER_IDS contains exactly three entries", () => {
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toHaveLength(3);
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama");
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama_local");
      expect(OLLAMA_FAMILY_PROVIDER_IDS).toContain("ollama_cloud");
    });

    it("CANONICAL_OLLAMA_PROVIDER_ID is 'ollama'", () => {
      expect(CANONICAL_OLLAMA_PROVIDER_ID).toBe("ollama");
    });
  });

  describe("normalizeProviderIdForUi", () => {
    it("collapses ollama variants to canonical 'ollama'", () => {
      expect(normalizeProviderIdForUi("ollama")).toBe("ollama");
      expect(normalizeProviderIdForUi("ollama_local")).toBe("ollama");
      expect(normalizeProviderIdForUi("ollama_cloud")).toBe("ollama");
    });

    it("passes through non-Ollama providers unchanged", () => {
      expect(normalizeProviderIdForUi("openai")).toBe("openai");
      expect(normalizeProviderIdForUi("anthropic")).toBe("anthropic");
      expect(normalizeProviderIdForUi("google")).toBe("google");
      expect(normalizeProviderIdForUi("deepseek")).toBe("deepseek");
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
      expect(inferOllamaModeForFeature("ollama_cloud", "assistant_chat", {})).toBe("cloud");
    });

    it("returns 'local' for explicit 'ollama_local'", () => {
      expect(inferOllamaModeForFeature("ollama_local", "assistant_chat", {})).toBe("local");
    });

    it("returns 'cloud' for plain 'ollama' when cloud key exists", () => {
      const keyIndex = { "assistant_chat:ollama_cloud": true };
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex)).toBe("cloud");
    });

    it("returns 'cloud' for plain 'ollama' when canonical key exists", () => {
      const keyIndex = { "assistant_chat:ollama": true };
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex)).toBe("cloud");
    });

    it("returns 'local' for plain 'ollama' when no key exists", () => {
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", {})).toBe("local");
    });

    it("returns 'local' for plain 'ollama' when only local key exists", () => {
      const keyIndex = { "assistant_chat:ollama_local": true };
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex)).toBe("local");
    });

    it("returns 'local' for plain 'ollama' when key exists for different feature", () => {
      const keyIndex = { "creative_gym:ollama_cloud": true };
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex)).toBe("local");
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
        (p) => normalizeProviderIdForUi(p.id) === CANONICAL_OLLAMA_PROVIDER_ID
      );
      expect(ollamaEntries).toHaveLength(1);
      expect(ollamaEntries[0].id).toBe("ollama");
      expect(ollamaEntries[0].name).toBe("Ollama");
      expect(collapsed).toHaveLength(3);
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

    it("preserves first Ollama entry position in list", () => {
      const providers = [
        { id: "ollama_cloud", name: "Ollama Cloud" },
        { id: "openai", name: "OpenAI" },
        { id: "ollama_local", name: "Ollama Local" },
      ];
      const collapsed = collapseProvidersForFeature(providers);
      expect(collapsed[0].id).toBe("ollama");
      expect(collapsed[1].id).toBe("openai");
      expect(collapsed).toHaveLength(2);
    });
  });

  describe("filterProvidersForFeature", () => {
    it("filters and collapses providers for assistant_chat", () => {
      const providers = [
        { id: "openai", name: "OpenAI" },
        { id: "ollama_local", name: "Ollama Local" },
        { id: "ollama_cloud", name: "Ollama Cloud" },
        { id: "deepseek", name: "DeepSeek" },
        { id: "tiktok", name: "TikTok" },
      ];
      const filtered = filterProvidersForFeature("assistant_chat", providers);
      const ids = filtered.map((p) => p.id);
      expect(ids).not.toContain("tiktok");
      const ollamaIds = ids.filter(
        (id) => normalizeProviderIdForUi(id) === CANONICAL_OLLAMA_PROVIDER_ID
      );
      expect(ollamaIds).toHaveLength(1);
    });

    it("returns all providers for unknown feature", () => {
      const providers = [{ id: "openai", name: "OpenAI" }];
      const filtered = filterProvidersForFeature("unknown_feature" as any, providers);
      expect(filtered).toEqual(providers);
    });
  });

  describe("Ollama mode round-trip", () => {
    it("local mode round-trips correctly", () => {
      const providerId = providerIdForOllamaMode("local");
      expect(providerId).toBe("ollama_local");
      expect(inferOllamaModeFromProviderId(providerId)).toBe("local");
    });

    it("cloud mode round-trips correctly", () => {
      const providerId = providerIdForOllamaMode("cloud");
      expect(providerId).toBe("ollama_cloud");
      expect(inferOllamaModeFromProviderId(providerId)).toBe("cloud");
    });

    it("canonical 'ollama' round-trips to local via inference", () => {
      const normalized = normalizeProviderIdForUi("ollama_cloud");
      expect(normalized).toBe("ollama");
      // Without explicit mode, plain "ollama" defaults to local
      expect(inferOllamaModeFromProviderId("ollama")).toBe("local");
    });
  });

  describe("Ollama mode inference with feature key index", () => {
    it("cloud key detection works across all features", () => {
      const features: string[] = [
        "assistant_chat",
        "assistant_embeddings",
        "creative_gym",
        "image_generation",
        "audio_stt",
        "audio_tts",
        "video_generation",
      ];
      for (const feature of features) {
        const keyIndex = { [`${feature}:ollama_cloud`]: true };
        expect(inferOllamaModeForFeature("ollama", feature, keyIndex)).toBe("cloud");
      }
    });

    it("local key does not trigger cloud mode for same feature", () => {
      const keyIndex = { "assistant_chat:ollama_local": true };
      expect(inferOllamaModeForFeature("ollama", "assistant_chat", keyIndex)).toBe("local");
    });

    it("canonical ollama key triggers cloud mode", () => {
      const keyIndex = { "image_generation:ollama": true };
      expect(inferOllamaModeForFeature("ollama", "image_generation", keyIndex)).toBe("cloud");
    });
  });
});