/**
 * Workflow resolver — maps render job types to ComfyUI workflows.
 *
 * Templates are JSON files in `local-bridge/workflows/`.
 * Mustache-style `{{placeholder}}` tokens are replaced with
 * job parameters, style profile data, and input image references.
 *
 * NO product decisions — the resolver only fills in parameters,
 * it never chooses which workflow to run (that's set by job.type).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Databases, Query } from "node-appwrite";
import { getDatabases, Collections } from "./appwrite-client.js";
import { getConfig } from "./config.js";
import { log, formatError } from "./logger.js";
import type { RenderJobDocument } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowTemplate = {
  meta: { type: string; description: string };
  nodes: Record<string, { class_type: string; inputs: Record<string, unknown> }>;
};

export type InputMap = Record<string, string>;

export type ResolveOptions = {
  inputs?: InputMap;
  styleProfile?: { positivePrompt?: string; negativePrompt?: string } | null;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  checkpoint: "model.safetensors",
  width: 1024,
  height: 1024,
  steps: 20,
  cfg: 7,
  sampler: "euler",
  scheduler: "normal",
  denoise: 0.75,
  seed: () => Math.floor(Math.random() * 1_000_000_000),
  positive_prompt: "professional render, high quality",
  negative_prompt: "blurry, low quality, watermark",
} as const;

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

const templateCache = new Map<string, WorkflowTemplate>();

function getWorkflowsDir(): string {
  try {
    return getConfig().BRIDGE_WORKFLOWS_DIR ?? resolve(process.cwd(), "workflows");
  } catch {
    return resolve(process.cwd(), "workflows");
  }
}

// Only allow safe type names: alphanumeric, dash, underscore
const SAFE_TYPE_RE = /^[a-zA-Z0-9_-]+$/;

function loadTemplate(type: string): WorkflowTemplate | null {
  if (templateCache.has(type)) {
    return templateCache.get(type)!;
  }

  // Prevent path traversal via job.type
  if (!SAFE_TYPE_RE.test(type)) {
    log.warn("workflow-resolver", `Invalid job type "${type}" — rejected for safety`);
    return null;
  }

  const dir = getWorkflowsDir();

  // Try exact match first: {type}.json
  const exactPath = join(dir, `${type}.json`);
  try {
    const raw = readFileSync(exactPath, "utf-8");
    const template = JSON.parse(raw) as WorkflowTemplate;
    templateCache.set(type, template);
    return template;
  } catch {
    // Not found — try scanning
  }

  // Scan all files for meta.type match
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const t = JSON.parse(raw) as WorkflowTemplate;
        if (t.meta?.type === type) {
          templateCache.set(type, t);
          return t;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // workflows dir not readable
  }

  log.warn("workflow-resolver", `No template found for type "${type}"`);
  return null;
}

// ---------------------------------------------------------------------------
// Style profile lookup
// ---------------------------------------------------------------------------

async function fetchStyleProfile(
  styleProfileId: string,
): Promise<{ positivePrompt?: string; negativePrompt?: string } | null> {
  const db: Databases = getDatabases();
  const config = getConfig();

  try {
    const doc = await db.getDocument(
      config.BRIDGE_APPWRITE_DATABASE_ID,
      Collections.styleProfiles,
      styleProfileId,
    );
    return {
      positivePrompt: String(doc.positivePrompt ?? doc.positive_prompt ?? ""),
      negativePrompt: String(doc.negativePrompt ?? doc.negative_prompt ?? ""),
    };
  } catch (err) {
    log.warn("workflow-resolver", "Failed to fetch style profile", {
      styleProfileId,
      err: formatError(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Repair config parsing
// ---------------------------------------------------------------------------

function parseRepairConfig(
  raw: string | null,
): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    log.warn("workflow-resolver", "Invalid repairConfig JSON", { raw: raw.slice(0, 200) });
    return {};
  }
}

// ---------------------------------------------------------------------------
// Token interpolation
// ---------------------------------------------------------------------------

function interpolate(
  value: unknown,
  params: Record<string, unknown>,
): unknown {
  if (typeof value === "string") {
    // If the entire string is a single placeholder, preserve the param's type
    const singleMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (singleMatch && singleMatch[1] in params) {
      return params[singleMatch[1]];
    }

    // Partial replacement — always produces a string
    return value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      if (key in params) return String(params[key]);
      return _match;
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, params));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = interpolate(v, params);
    }
    return result;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Resolve workflow
// ---------------------------------------------------------------------------

export function resolveWorkflow(
  job: RenderJobDocument,
  options: ResolveOptions = {},
): Record<string, unknown> {
  const template = loadTemplate(job.type);
  if (!template) {
    throw new Error(`No workflow template found for job type "${job.type}"`);
  }

  const repairConfig = parseRepairConfig(job.repairConfig);

  // Resolve style profile if referenced
  // (async version used in render-job-handler; here we use the sync path
  //  with the pre-fetched profile passed via options)
  const style = options.styleProfile;

  // Build parameter map
  const params: Record<string, unknown> = {
    checkpoint: DEFAULTS.checkpoint,
    width: Number(repairConfig.width) || DEFAULTS.width,
    height: Number(repairConfig.height) || DEFAULTS.height,
    steps: Number(repairConfig.steps) || DEFAULTS.steps,
    cfg: Number(repairConfig.cfg) || DEFAULTS.cfg,
    sampler: String(repairConfig.sampler ?? DEFAULTS.sampler),
    scheduler: String(repairConfig.scheduler ?? DEFAULTS.scheduler),
    denoise: Number(repairConfig.denoise) ?? DEFAULTS.denoise,
    seed: Number(repairConfig.seed) || DEFAULTS.seed(),
    positive_prompt: style?.positivePrompt || String(repairConfig.positivePrompt ?? DEFAULTS.positive_prompt),
    negative_prompt: style?.negativePrompt || String(repairConfig.negativePrompt ?? DEFAULTS.negative_prompt),
  };

  // Inject input images from the input resolver
  if (options.inputs) {
    for (const [key, filename] of Object.entries(options.inputs)) {
      params[key] = filename;
    }
  }

  // Deep-clone and interpolate
  const workflow: Record<string, unknown> = {};
  for (const [nodeId, node] of Object.entries(template.nodes)) {
    workflow[nodeId] = {
      class_type: node.class_type,
      inputs: interpolate(node.inputs, params),
    };
  }

  log.info("workflow-resolver", "Resolved workflow", {
    type: job.type,
    templateNodes: Object.keys(template.nodes).length,
    params: Object.keys(params),
  });

  return workflow;
}

// ---------------------------------------------------------------------------
// Async resolve (with style profile fetch)
// ---------------------------------------------------------------------------

export async function resolveWorkflowAsync(
  job: RenderJobDocument,
  options: Omit<ResolveOptions, "styleProfile"> = {},
): Promise<Record<string, unknown>> {
  let styleProfile: ResolveOptions["styleProfile"] = null;

  if (job.styleProfileId) {
    styleProfile = await fetchStyleProfile(job.styleProfileId);
  }

  return resolveWorkflow(job, { ...options, styleProfile });
}

// ---------------------------------------------------------------------------
// Clear template cache (useful for testing / hot-reload)
// ---------------------------------------------------------------------------

export function clearTemplateCache(): void {
  templateCache.clear();
}