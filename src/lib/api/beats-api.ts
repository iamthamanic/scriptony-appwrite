/**
 * 🎬 BEATS API CLIENT
 *
 * API für Story Beats (Save the Cat, Hero's Journey, etc.)
 */

import { apiClient } from "../api-client";

export interface StoryBeat {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  template_abbr?: string;
  description?: string;
  from_container_id: string;
  to_container_id: string;
  pct_from: number;
  pct_to: number;
  color?: string;
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBeatPayload {
  project_id: string;
  label: string;
  template_abbr?: string;
  description?: string;
  from_container_id: string;
  to_container_id: string;
  pct_from?: number;
  pct_to?: number;
  color?: string;
  notes?: string;
  order_index?: number;
}

export interface UpdateBeatPayload {
  label?: string;
  template_abbr?: string;
  description?: string;
  from_container_id?: string;
  to_container_id?: string;
  pct_from?: number;
  pct_to?: number;
  color?: string;
  notes?: string;
  order_index?: number;
}

function throwBeatsApiError(message: string, error: unknown): never {
  const nextError = new Error(
    error instanceof Error && error.message ? error.message : message,
  );
  (nextError as Error & { cause?: unknown }).cause = error;
  throw nextError;
}

/**
 * Get all beats for a project
 */
export async function getBeats(projectId: string): Promise<StoryBeat[]> {
  try {
    const data = await apiClient.get(`/beats?project_id=${projectId}`);
    return data.beats || [];
  } catch (error: unknown) {
    console.error("[BeatsAPI] Failed to fetch beats:", error);
    throwBeatsApiError("Failed to fetch beats", error);
  }
}

/**
 * Create a new beat
 */
export async function createBeat(
  payload: CreateBeatPayload,
): Promise<StoryBeat> {
  try {
    const data = await apiClient.post("/beats", payload);
    return data.beat;
  } catch (error: unknown) {
    console.error("[BeatsAPI] Failed to create beat:", error);
    throwBeatsApiError("Failed to create beat", error);
  }
}

/**
 * Update an existing beat
 */
export async function updateBeat(
  beatId: string,
  payload: UpdateBeatPayload,
): Promise<StoryBeat> {
  const url = `/beats/${beatId}`;
  console.log("[BeatsAPI] Updating beat:", { beatId, payload, url });

  try {
    const data = await apiClient.patch(url, payload);
    console.log("[BeatsAPI] Update successful:", { beatId });
    return data.beat;
  } catch (error: unknown) {
    console.error("[BeatsAPI] Update failed:", {
      beatId,
      error: error instanceof Error ? error.message : error,
    });
    throwBeatsApiError("Failed to update beat", error);
  }
}

/**
 * Delete a beat
 */
export async function deleteBeat(beatId: string): Promise<void> {
  console.log("[BeatsAPI] Deleting beat:", { beatId });

  try {
    await apiClient.delete(`/beats/${beatId}`);
    console.log("[BeatsAPI] Delete successful:", { beatId });
  } catch (error: unknown) {
    console.error("[BeatsAPI] Delete failed:", {
      beatId,
      error: error instanceof Error ? error.message : error,
    });
    throwBeatsApiError("Failed to delete beat", error);
  }
}

/**
 * Reorder beats (bulk update order_index)
 */
export async function reorderBeats(
  beats: { id: string; order_index: number }[],
): Promise<void> {
  // Update each beat's order_index
  await Promise.all(
    beats.map(({ id, order_index }) => updateBeat(id, { order_index })),
  );
}
