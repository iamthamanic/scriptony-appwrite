/**
 * Scriptony AI module — shared types for feature profiles and Gym starter API.
 * Location: src/modules/scriptony-ai/domain/types.ts
 */

export type AiFeatureId = "assistant" | "gym" | "stage";

export type AiBillingMode = "byok" | "hosted";

export interface AiFeatureProfileOverride {
  provider?: "openai" | "anthropic" | "google" | "openrouter" | "deepseek";
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt_extra?: string;
}

export interface AiSettingsJsonV1 {
  schema_version?: number;
  ai_mode?: AiBillingMode;
  output_language?: "ui" | "de" | "en" | "custom";
  custom_locale?: string;
  feature_profiles?: Partial<Record<AiFeatureId, AiFeatureProfileOverride>>;
}

export interface GymGenerateStarterRequest {
  challenge_template_id: string;
  medium: string;
  source_project_id?: string;
  regenerate?: boolean;
  ui_language?: "de" | "en";
}

export interface GymGenerateStarterResponse {
  text: string;
  challenge_template_id: string;
  medium: string;
  token_details?: { input_tokens: number; output_tokens: number };
}
