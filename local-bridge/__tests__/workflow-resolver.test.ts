import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveWorkflow, clearTemplateCache } from "../src/workflow-resolver.js";
import type { RenderJobDocument } from "../src/types.js";

const baseJob: RenderJobDocument = {
  id: "job-1",
  $id: "job-1",
  userId: "user-1",
  projectId: "proj-1",
  shotId: "shot-1",
  type: "txt2img",
  jobClass: "official",
  status: "executing",
  reviewStatus: "pending",
  guideBundleId: null,
  styleProfileId: null,
  repairConfig: null,
  outputImageIds: [],
  createdAt: "2026-04-17T00:00:00Z",
  completedAt: null,
};

beforeEach(() => {
  clearTemplateCache();
});

describe("resolveWorkflow", () => {
  it("throws for unknown job type", () => {
    const job = { ...baseJob, type: "nonexistent" };
    expect(() => resolveWorkflow(job)).toThrow('No workflow template found for job type "nonexistent"');
  });

  it("resolves txt2img with defaults", () => {
    const job = { ...baseJob, type: "txt2img" };
    const workflow = resolveWorkflow(job);

    const sampler = workflow["3"] as { inputs: Record<string, unknown> };
    expect(sampler.inputs.steps).toBe(20);
    expect(sampler.inputs.cfg).toBe(7);
    expect(sampler.inputs.sampler_name).toBe("euler");
    expect(typeof sampler.inputs.seed).toBe("number");
  });

  it("overrides defaults from repairConfig", () => {
    const job = {
      ...baseJob,
      type: "txt2img",
      repairConfig: JSON.stringify({ steps: 30, cfg: 9, width: 768, height: 512 }),
    };
    const workflow = resolveWorkflow(job);

    const sampler = workflow["3"] as { inputs: Record<string, unknown> };
    expect(sampler.inputs.steps).toBe(30);
    expect(sampler.inputs.cfg).toBe(9);

    const latent = workflow["5"] as { inputs: Record<string, unknown> };
    expect(latent.inputs.width).toBe(768);
    expect(latent.inputs.height).toBe(512);
  });

  it("injects style profile prompts", () => {
    const job = { ...baseJob, type: "txt2img" };
    const workflow = resolveWorkflow(job, {
      styleProfile: {
        positivePrompt: "cinematic lighting, 8k",
        negativePrompt: "cartoon, low res",
      },
    });

    const pos = workflow["6"] as { inputs: Record<string, unknown> };
    const neg = workflow["7"] as { inputs: Record<string, unknown> };
    expect(pos.inputs.text).toBe("cinematic lighting, 8k");
    expect(neg.inputs.text).toBe("cartoon, low res");
  });

  it("injects input images from inputs map", () => {
    const job = {
      ...baseJob,
      type: "img2img",
      repairConfig: JSON.stringify({ denoise: 0.5 }),
    };
    const workflow = resolveWorkflow(job, {
      inputs: { input_image: "uploaded-ref.png" },
    });

    const loadImage = workflow["10"] as { inputs: Record<string, unknown> };
    expect(loadImage.inputs.image).toBe("uploaded-ref.png");

    const sampler = workflow["3"] as { inputs: Record<string, unknown> };
    expect(sampler.inputs.denoise).toBe(0.5);
  });

  it("injects mask and source for inpaint", () => {
    const job = { ...baseJob, type: "inpaint" };
    const workflow = resolveWorkflow(job, {
      inputs: { input_image: "source.png", mask_image: "mask.png" },
    });

    const loadImage = workflow["10"] as { inputs: Record<string, unknown> };
    const loadMask = workflow["12"] as { inputs: Record<string, unknown> };
    expect(loadImage.inputs.image).toBe("source.png");
    expect(loadMask.inputs.image).toBe("mask.png");
  });

  it("ignores invalid repairConfig gracefully", () => {
    const job = { ...baseJob, type: "txt2img", repairConfig: "not json" };
    const workflow = resolveWorkflow(job);

    const sampler = workflow["3"] as { inputs: Record<string, unknown> };
    expect(sampler.inputs.steps).toBe(20); // defaults
  });

  it("uses default prompts when no style profile", () => {
    const job = { ...baseJob, type: "txt2img" };
    const workflow = resolveWorkflow(job);

    const pos = workflow["6"] as { inputs: Record<string, unknown> };
    expect(pos.inputs.text).toBe("professional render, high quality");
  });

  it("rejects path traversal in job type", () => {
    const job = { ...baseJob, type: "../../etc/passwd" };
    expect(() => resolveWorkflow(job)).toThrow();
  });

  it("rejects types with special characters", () => {
    const job = { ...baseJob, type: "txt2img; rm -rf /" };
    expect(() => resolveWorkflow(job)).toThrow();
  });

  it("accepts types with dashes and underscores", () => {
    const job = { ...baseJob, type: "txt2img_v2" };
    // This type doesn't have a template, but should not be rejected by the safety check
    expect(() => resolveWorkflow(job)).toThrow('No workflow template found');
  });

  it("preserves numeric types from single-placeholder interpolation", () => {
    const job = { ...baseJob, type: "txt2img" };
    const workflow = resolveWorkflow(job);

    const sampler = workflow["3"] as { inputs: Record<string, unknown> };
    expect(typeof sampler.inputs.steps).toBe("number");
    expect(typeof sampler.inputs.cfg).toBe("number");
    expect(typeof sampler.inputs.seed).toBe("number");
  });
});