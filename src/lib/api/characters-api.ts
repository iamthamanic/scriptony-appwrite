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

/**
 * Normalize incoming character data — maps legacy snake_case to camelCase.
 * Removes fields that would cause "Unknown attribute" in Appwrite.
 */
function normalizeCharacter(raw: Record<string, unknown>): Character {
  const c = { ...raw } as Record<string, unknown>;

  // Map legacy snake_case to camelCase
  if (c.image_url !== undefined && c.imageUrl === undefined) {
    c.imageUrl = c.image_url;
  }

  // Remove fields that Appwrite doesn't know
  delete c.image_url;

  return c as unknown as Character;
}

/**
 * Sanitize outgoing character payload — removes Appwrite-unknown fields.
 */
function sanitizeCharacterPayload(
  data: Partial<Character>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  delete payload.image_url; // Won't exist at compile time, but guard at runtime
  return payload;
}

// =============================================================================
// CHARACTERS CRUD
// =============================================================================

/**
 * Get all characters for a project (Timeline/Film characters for @-mentions)
 */
export async function getCharacters(
  projectId: string,
  _token: string,
): Promise<Character[]> {
  const result = await apiGet(`/timeline-characters?project_id=${projectId}`);
  const data = unwrapApiResult(result);
  const chars = (data?.characters || []) as Record<string, unknown>[];
  return chars.map(normalizeCharacter);
}

/**
 * Get a single character by ID
 */
export async function getCharacter(
  characterId: string,
  _token: string,
): Promise<Character> {
  const result = await apiGet(`/timeline-characters/${characterId}`);
  const data = unwrapApiResult(result);
  return normalizeCharacter(
    (data?.character || data) as Record<string, unknown>,
  );
}

/**
 * Create a new character
 */
export async function createCharacter(
  projectId: string,
  characterData: Partial<Character>,
  _token: string,
): Promise<Character> {
  const payload = sanitizeCharacterPayload(characterData);

  const result = await apiPost("/timeline-characters", {
    project_id: projectId,
    ...payload,
  });
  const data = unwrapApiResult(result);
  return normalizeCharacter(
    (data?.character || data) as Record<string, unknown>,
  );
}

/**
 * Update an existing character
 */
export async function updateCharacter(
  characterId: string,
  updates: Partial<Character>,
  _token: string,
): Promise<Character> {
  const payload = sanitizeCharacterPayload(updates);

  const result = await apiPut(`/timeline-characters/${characterId}`, payload);
  const data = unwrapApiResult(result);
  return normalizeCharacter(
    (data?.character || data) as Record<string, unknown>,
  );
}

/**
 * Delete a character
 */
export async function deleteCharacter(
  characterId: string,
  _token: string,
): Promise<void> {
  const result = await apiDelete(`/timeline-characters/${characterId}`);
  unwrapApiResult(result);
}
