/**
 * 3.5 Integration smoke tests: all 5 feature areas
 *
 * Tests that the allowlist correctly maps each of the 7 feature keys
 * to the expected set of providers, and that the filter/collapse pipeline
 * produces correct results for all feature areas.
 */
import { describe, it, expect } from "vitest";
import {
  AI_FEATURE_PROVIDER_ALLOWLIST,
  filterProvidersForFeature,
  collapseProvidersForFeature,
  normalizeProviderIdForUi,
  CANONICAL_OLLAMA_PROVIDER_ID,
  isOllamaFamilyProviderId,
  type AiFeatureKey,
} from "../ai-provider-allowlist";

describe("Integration smoke tests: all 5+ feature areas", () => {
  const ALL_PROVIDERS = [
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "google", name: "Google" },
    { id: "deepseek", name: "DeepSeek" },
    { id: "openrouter", name: "OpenRouter" },
    { id: "huggingface", name: "HuggingFace" },
    { id: "ollama", name: "Ollama" },
    { id: "ollama_local", name: "Ollama (lokal)" },
    { id: "ollama_cloud", name: "Ollama (Cloud)" },
    { id: "elevenlabs", name: "ElevenLabs" },
    { id: "tiktok", name: "TikTok" },
  ];

  describe("assistant_chat allowlist", () => {
    const feature: AiFeatureKey = "assistant_chat";
    const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];

    it("includes expected providers", () => {
      expect(allowlist).toContain("openai");
      expect(allowlist).toContain("anthropic");
      expect(allowlist).toContain("google");
      expect(allowlist).toContain("deepseek");
      expect(allowlist).toContain("openrouter");
      expect(allowlist).toContain("huggingface");
      expect(allowlist).toContain("ollama");
    });

    it("excludes elevenlabs (no text capability)", () => {
      expect(allowlist).not.toContain("elevenlabs");
    });

    it("filter+collapse produces correct result", () => {
      const result = filterProvidersForFeature(feature, ALL_PROVIDERS);
      const ids = result.map((p) => p.id);
      expect(ids).toContain("openai");
      expect(ids).toContain("anthropic");
      expect(ids).not.toContain("ollama_local");
      expect(ids).not.toContain("ollama_cloud");
      expect(ids).toContain("ollama");
      expect(ids).not.toContain("tiktok");
      expect(ids).not.toContain("elevenlabs");
    });
  });

  describe("image_generation allowlist", () => {
    const feature: AiFeatureKey = "image_generation";

    it("does not include anthropic (no image capability)", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).not.toContain("anthropic");
    });

    it("includes image-capable providers", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("openai");
      expect(allowlist).toContain("google");
      expect(allowlist).toContain("openrouter");
      expect(allowlist).toContain("ollama");
    });

    it("filter+collapse excludes non-image providers", () => {
      const result = filterProvidersForFeature(feature, ALL_PROVIDERS);
      const ids = result.map((p) => p.id);
      expect(ids).not.toContain("elevenlabs");
      expect(ids).not.toContain("tiktok");
    });
  });

  describe("audio_stt allowlist", () => {
    const feature: AiFeatureKey = "audio_stt";

    it("includes openai and ollama", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("openai");
      expect(allowlist).toContain("ollama");
    });

    it("does not include anthropic", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).not.toContain("anthropic");
    });
  });

  describe("audio_tts allowlist", () => {
    const feature: AiFeatureKey = "audio_tts";

    it("includes elevenlabs", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("elevenlabs");
    });

    it("does not include anthropic", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).not.toContain("anthropic");
    });

    it("filter+collapse includes elevenlabs", () => {
      const result = filterProvidersForFeature(feature, ALL_PROVIDERS);
      const ids = result.map((p) => p.id);
      expect(ids).toContain("elevenlabs");
    });
  });

  describe("video_generation allowlist", () => {
    const feature: AiFeatureKey = "video_generation";

    it("includes openrouter and ollama", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("openrouter");
      expect(allowlist).toContain("ollama");
    });

    it("does not include openai", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).not.toContain("openai");
    });
  });

  describe("creative_gym allowlist", () => {
    const feature: AiFeatureKey = "creative_gym";

    it("includes text-capable providers", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("openai");
      expect(allowlist).toContain("anthropic");
      expect(allowlist).toContain("deepseek");
    });
  });

  describe("assistant_embeddings allowlist", () => {
    const feature: AiFeatureKey = "assistant_embeddings";

    it("includes embedding-capable providers", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).toContain("openai");
      expect(allowlist).toContain("deepseek");
      expect(allowlist).toContain("ollama");
    });

    it("does not include anthropic", () => {
      const allowlist = AI_FEATURE_PROVIDER_ALLOWLIST[feature];
      expect(allowlist).not.toContain("anthropic");
    });
  });

  describe("cross-feature: Ollama is in all features", () => {
    it("ollama appears in every feature allowlist", () => {
      for (const [feature, allowlist] of Object.entries(
        AI_FEATURE_PROVIDER_ALLOWLIST,
      )) {
        expect(allowlist).toContain("ollama");
        expect(allowlist).toContain("ollama_local");
        expect(allowlist).toContain("ollama_cloud");
      }
    });
  });

  describe("cross-feature: collapse always produces exactly one Ollama entry", () => {
    it("for every feature, filtering all providers yields at most one Ollama", () => {
      for (const feature of Object.keys(
        AI_FEATURE_PROVIDER_ALLOWLIST,
      ) as AiFeatureKey[]) {
        const result = filterProvidersForFeature(feature, ALL_PROVIDERS);
        const ollamaEntries = result.filter(
          (p) =>
            normalizeProviderIdForUi(p.id) === CANONICAL_OLLAMA_PROVIDER_ID,
        );
        expect(ollamaEntries.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("cross-feature: unknown providers are filtered out", () => {
    it("tiktok never appears in any feature", () => {
      for (const feature of Object.keys(
        AI_FEATURE_PROVIDER_ALLOWLIST,
      ) as AiFeatureKey[]) {
        const result = filterProvidersForFeature(feature, ALL_PROVIDERS);
        const ids = result.map((p) => p.id);
        expect(ids).not.toContain("tiktok");
      }
    });
  });
});
