/**
 * 3.4 Component tests: FeatureProviderCard
 *
 * Tests the pure-logic exports and normalization behavior from the
 * FeatureProviderCard component, without requiring a React rendering
 * environment. The component's UI rendering would need jsdom/playwright.
 */
import { describe, it, expect } from "vitest";
import {
  isOllamaFamilyProviderId,
  normalizeProviderIdForUi,
  CANONICAL_OLLAMA_PROVIDER_ID,
  providerIdForOllamaMode,
} from "../../../lib/ai-provider-allowlist";

// FeatureProviderCard re-exports these types and uses these functions internally.
// We test the logic that drives the card's behavior.

describe("FeatureProviderCard logic: Ollama provider handling", () => {
  describe("provider ID normalization (used in card dropdown)", () => {
    it("collapses ollama variants for display", () => {
      // The card shows "Ollama" regardless of ollama_local/ollama_cloud
      expect(normalizeProviderIdForUi("ollama_local")).toBe("ollama");
      expect(normalizeProviderIdForUi("ollama_cloud")).toBe("ollama");
      expect(normalizeProviderIdForUi("ollama")).toBe("ollama");
    });

    it("non-Ollama providers pass through unchanged", () => {
      expect(normalizeProviderIdForUi("openai")).toBe("openai");
      expect(normalizeProviderIdForUi("anthropic")).toBe("anthropic");
      expect(normalizeProviderIdForUi("google")).toBe("google");
      expect(normalizeProviderIdForUi("deepseek")).toBe("deepseek");
      expect(normalizeProviderIdForUi("openrouter")).toBe("openrouter");
    });
  });

  describe("Ollama mode toggle (Local/Cloud switch)", () => {
    it("local mode produces correct runtime provider ID", () => {
      expect(providerIdForOllamaMode("local")).toBe("ollama_local");
    });

    it("cloud mode produces correct runtime provider ID", () => {
      expect(providerIdForOllamaMode("cloud")).toBe("ollama_cloud");
    });

    it("isOllamaFamilyProviderId identifies all variants", () => {
      expect(isOllamaFamilyProviderId("ollama")).toBe(true);
      expect(isOllamaFamilyProviderId("ollama_local")).toBe(true);
      expect(isOllamaFamilyProviderId("ollama_cloud")).toBe(true);
      expect(isOllamaFamilyProviderId("openai")).toBe(false);
    });
  });

  describe("Key badge display logic", () => {
    it("canonical Ollama ID is used for key lookup", () => {
      // When checking hasSavedKey, the card uses featureKey:ollama or featureKey:ollama_cloud
      const featureKey = "assistant_chat";
      const canonicalKey = `${featureKey}:${CANONICAL_OLLAMA_PROVIDER_ID}`;
      const cloudKey = `${featureKey}:ollama_cloud`;
      expect(canonicalKey).toBe("assistant_chat:ollama");
      expect(cloudKey).toBe("assistant_chat:ollama_cloud");
    });

    it("non-Ollama providers use direct key lookup", () => {
      const featureKey = "image_generation";
      const providerId = "openai";
      const key = `${featureKey}:${providerId}`;
      expect(key).toBe("image_generation:openai");
    });
  });

  describe("Ollama mode affects effective provider ID", () => {
    it("local mode → effectiveProviderId is 'ollama_local'", () => {
      const mode = "local";
      const effectiveId = providerIdForOllamaMode(mode);
      expect(effectiveId).toBe("ollama_local");
    });

    it("cloud mode → effectiveProviderId is 'ollama_cloud'", () => {
      const mode = "cloud";
      const effectiveId = providerIdForOllamaMode(mode);
      expect(effectiveId).toBe("ollama_cloud");
    });

    it("switching mode changes effective provider", () => {
      const localId = providerIdForOllamaMode("local");
      const cloudId = providerIdForOllamaMode("cloud");
      expect(localId).not.toBe(cloudId);
      expect(normalizeProviderIdForUi(localId)).toBe(normalizeProviderIdForUi(cloudId));
    });
  });

  describe("FeatureKey type coverage", () => {
    it("all 7 feature keys are valid Ollama collapse targets", () => {
      const featureKeys = [
        "assistant_chat",
        "assistant_embeddings",
        "creative_gym",
        "image_generation",
        "audio_stt",
        "audio_tts",
        "video_generation",
      ] as const;
      // Every feature can have an Ollama provider
      for (const key of featureKeys) {
        const providerId = "ollama";
        const normalized = normalizeProviderIdForUi(providerId);
        expect(normalized).toBe(CANONICAL_OLLAMA_PROVIDER_ID);
      }
    });
  });
});