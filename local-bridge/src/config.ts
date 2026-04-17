/**
 * Environment configuration for the Local Bridge.
 *
 * All settings come from environment variables with sensible defaults.
 * Validated at startup via Zod.
 */

import { z } from "zod";

const envSchema = z.object({
  BRIDGE_APPWRITE_ENDPOINT: z.string().url(),
  BRIDGE_APPWRITE_PROJECT_ID: z.string().min(1),
  BRIDGE_APPWRITE_API_KEY: z.string().min(1),
  BRIDGE_APPWRITE_DATABASE_ID: z.string().default("scriptony"),

  BRIDGE_COMFYUI_URL: z.string().url().default("http://127.0.0.1:8188"),
  BRIDGE_BLENDER_URL: z.string().url().default("http://127.0.0.1:9876"),

  BRIDGE_STORAGE_BUCKET: z.string().default("shots"),

  BRIDGE_HEALTH_PORT: z.coerce.number().default(9877),

  BRIDGE_WORKFLOWS_DIR: z.string().default("./workflows"),

  BRIDGE_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type BridgeConfig = z.infer<typeof envSchema>;

let _config: BridgeConfig | null = null;

export function loadConfig(): BridgeConfig {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const lines = Object.entries(errors).flatMap(([key, msgs]) =>
      msgs.map((msg) => `  ${key}: ${msg}`)
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): BridgeConfig {
  if (!_config) throw new Error("Config not loaded — call loadConfig() first");
  return _config;
}