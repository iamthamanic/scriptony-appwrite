/**
 * Client for POST /ai/gym/generate-starter (Creative Gym starter text).
 * Location: src/modules/scriptony-ai/infrastructure/gym-starter-api.ts
 */

import { apiPost, unwrapApiResult } from "../../../lib/api-client";
import type { GymGenerateStarterRequest, GymGenerateStarterResponse } from "../domain/types";

export async function requestGymStarter(
  body: GymGenerateStarterRequest
): Promise<GymGenerateStarterResponse> {
  const result = await apiPost<GymGenerateStarterResponse>("/ai/gym/generate-starter", {
    challenge_template_id: body.challenge_template_id,
    medium: body.medium,
    source_project_id: body.source_project_id,
    regenerate: body.regenerate ?? false,
    ui_language: body.ui_language,
  });
  const data = unwrapApiResult(result);
  if (!data?.text) {
    throw new Error((data as { error?: string })?.error || "Kein Text von der KI erhalten.");
  }
  return data as GymGenerateStarterResponse;
}
