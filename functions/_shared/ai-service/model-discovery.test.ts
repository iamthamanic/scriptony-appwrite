/**
 * Unit tests for model-discovery helpers (no network).
 * Migrated from Deno to Vitest.
 */
import { describe, expect, it } from "vitest";
import {
  classifyOllamaModelForFeature,
  enrichWithRegistry,
  featureKeyToRegistryFeature,
  filterOpenAIModelIdsForFeature,
  filterOpenRouterRowsForFeature,
  isDiscoverableFeatureKey,
} from "./model-discovery";

describe("model-discovery", () => {
  describe("featureKeyToRegistryFeature", () => {
    it("maps known keys", () => {
      expect(featureKeyToRegistryFeature("assistant_chat")).toBe("text");
      expect(featureKeyToRegistryFeature("image_generation")).toBe("image");
      expect(featureKeyToRegistryFeature("video_generation")).toBe("video");
    });
  });

  describe("isDiscoverableFeatureKey", () => {
    it("returns true for known keys", () => {
      expect(isDiscoverableFeatureKey("assistant_chat")).toBe(true);
    });

    it("returns false for invalid keys", () => {
      expect(isDiscoverableFeatureKey("invalid")).toBe(false);
    });
  });

  describe("filterOpenAIModelIdsForFeature", () => {
    it("filters text vs image models", () => {
      const ids = [
        "gpt-4o",
        "gpt-4o-mini",
        "dall-e-3",
        "whisper-1",
        "tts-1",
        "text-embedding-3-small",
      ];
      expect(filterOpenAIModelIdsForFeature(ids, "text")).toEqual([
        "gpt-4o",
        "gpt-4o-mini",
      ]);
      expect(filterOpenAIModelIdsForFeature(ids, "image")).toEqual([
        "dall-e-3",
      ]);
      expect(filterOpenAIModelIdsForFeature(ids, "audio_stt")).toEqual([
        "whisper-1",
      ]);
      expect(filterOpenAIModelIdsForFeature(ids, "embeddings")).toEqual([
        "text-embedding-3-small",
      ]);
    });
  });

  describe("classifyOllamaModelForFeature", () => {
    it("classifies Ollama models by feature", () => {
      expect(classifyOllamaModelForFeature("llama3.1", "text")).toBe(true);
      expect(classifyOllamaModelForFeature("flux-schnell", "image")).toBe(true);
      expect(
        classifyOllamaModelForFeature("nomic-embed-text", "embeddings"),
      ).toBe(true);
      expect(classifyOllamaModelForFeature("flux-schnell", "text")).toBe(false);
    });
  });

  describe("filterOpenRouterRowsForFeature", () => {
    it("uses modality when present", () => {
      const rows = [
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          architecture: { modality: "text" },
        },
        {
          id: "black-forest-labs/flux-1.1-pro",
          name: "Flux",
          architecture: { modality: "image" },
        },
      ];
      const text = filterOpenRouterRowsForFeature(rows, "text");
      expect(text.length).toBe(1);
      expect(text[0].id).toBe("openai/gpt-4o");
      const img = filterOpenRouterRowsForFeature(rows, "image");
      expect(img.length).toBe(1);
      expect(img[0].id).toBe("black-forest-labs/flux-1.1-pro");
    });
  });

  describe("enrichWithRegistry", () => {
    it("fills contextWindow from registry", () => {
      const models = [
        {
          id: "gpt-4o",
          name: "gpt-4o",
          provider: "openai",
          features: ["text"],
        },
      ];
      const enriched = enrichWithRegistry(models, "openai", "text");
      expect(enriched[0].contextWindow).toBe(128000);
    });
  });
});
