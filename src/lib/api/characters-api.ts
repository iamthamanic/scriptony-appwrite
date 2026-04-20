/**
 * Characters API Client
 *
 * API für Character-Management (CRUD operations)
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../api-client";
import type { Character } from "../types";

// =============================================================================
// CHARACTERS CRUD
// =============================================================================

/**
 * Get all characters for a project (Timeline/Film characters for @-mentions)
 */
export async function getCharacters(
  projectId: string,
  token: string,
): Promise<Character[]> {
  const result = await apiGet(`/timeline-characters?project_id=${projectId}`);
  const data = unwrapApiResult(result);
  return data?.characters || [];
}

/**
 * Get a single character by ID
 */
export async function getCharacter(
  characterId: string,
  token: string,
): Promise<Character> {
  const result = await apiGet(`/timeline-characters/${characterId}`);
  const data = unwrapApiResult(result);
  return data?.character || data;
}

/**
 * Create a new character
 */
export async function createCharacter(
  projectId: string,
  characterData: Partial<Character>,
  token: string,
): Promise<Character> {
  const result = await apiPost("/timeline-characters", {
    project_id: projectId,
    ...characterData,
  });
  const data = unwrapApiResult(result);
  return data?.character || data;
}

/**
 * Update an existing character
 */
export async function updateCharacter(
  characterId: string,
  updates: Partial<Character>,
  token: string,
): Promise<Character> {
  const result = await apiPut(`/timeline-characters/${characterId}`, updates);
  const data = unwrapApiResult(result);
  return data?.character || data;
}

/**
 * Delete a character
 */
export async function deleteCharacter(
  characterId: string,
  token: string,
): Promise<void> {
  const result = await apiDelete(`/timeline-characters/${characterId}`);
  unwrapApiResult(result);
}
