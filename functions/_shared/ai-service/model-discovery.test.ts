/**
 * Unit tests for model-discovery helpers (no network).
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classifyOllamaModelForFeature,
  enrichWithRegistry,
  featureKeyToRegistryFeature,
  filterOpenAIModelIdsForFeature,
  filterOpenRouterRowsForFeature,
  isDiscoverableFeatureKey,
} from "./model-discovery.ts";

Deno.test("featureKeyToRegistryFeature maps known keys", () => {
  assertEquals(featureKeyToRegistryFeature("assistant_chat"), "text");
  assertEquals(featureKeyToRegistryFeature("image_generation"), "image");
  assertEquals(featureKeyToRegistryFeature("video_generation"), "video");
});

Deno.test("isDiscoverableFeatureKey", () => {
  assertEquals(isDiscoverableFeatureKey("assistant_chat"), true);
  assertEquals(isDiscoverableFeatureKey("invalid"), false);
});

Deno.test("filterOpenAIModelIdsForFeature text vs image", () => {
  const ids = ["gpt-4o", "gpt-4o-mini", "dall-e-3", "whisper-1", "tts-1", "text-embedding-3-small"];
  assertEquals(filterOpenAIModelIdsForFeature(ids, "text"), ["gpt-4o", "gpt-4o-mini"]);
  assertEquals(filterOpenAIModelIdsForFeature(ids, "image"), ["dall-e-3"]);
  assertEquals(filterOpenAIModelIdsForFeature(ids, "audio_stt"), ["whisper-1"]);
  assertEquals(filterOpenAIModelIdsForFeature(ids, "embeddings"), ["text-embedding-3-small"]);
});

Deno.test("classifyOllamaModelForFeature", () => {
  assertEquals(classifyOllamaModelForFeature("llama3.1", "text"), true);
  assertEquals(classifyOllamaModelForFeature("flux-schnell", "image"), true);
  assertEquals(classifyOllamaModelForFeature("nomic-embed-text", "embeddings"), true);
  assertEquals(classifyOllamaModelForFeature("flux-schnell", "text"), false);
});

Deno.test("filterOpenRouterRowsForFeature uses modality when present", () => {
  const rows = [
    { id: "openai/gpt-4o", name: "GPT-4o", architecture: { modality: "text" } },
    { id: "black-forest-labs/flux-1.1-pro", name: "Flux", architecture: { modality: "image" } },
  ];
  const text = filterOpenRouterRowsForFeature(rows, "text");
  assertEquals(text.length, 1);
  assertEquals(text[0].id, "openai/gpt-4o");
  const img = filterOpenRouterRowsForFeature(rows, "image");
  assertEquals(img.length, 1);
  assertEquals(img[0].id, "black-forest-labs/flux-1.1-pro");
});

Deno.test("enrichWithRegistry fills contextWindow from registry", () => {
  const models = [{ id: "gpt-4o", name: "gpt-4o", provider: "openai", features: ["text"] }];
  const enriched = enrichWithRegistry(models, "openai", "text");
  assertEquals(enriched[0].contextWindow, 128000);
});
