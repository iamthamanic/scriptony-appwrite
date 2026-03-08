/**
 * 🎨 INSPIRATIONS API CLIENT
 * 
 * Client for the `scriptony-inspiration` backend function
 * Manages visual references/inspiration images for projects
 */

import { apiClient } from '../api-client';
import type { ProjectInspiration } from '../../components/InspirationCard';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateInspirationData {
  projectId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
}

export interface UpdateInspirationData {
  imageUrl?: string;
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
  orderIndex?: number;
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Get all inspirations for a project
 */
export async function getInspirationsByProject(
  projectId: string,
  token: string
): Promise<ProjectInspiration[]> {
  try {
    console.log(`[Inspirations API] Loading inspirations for project: ${projectId}`);
    
    const response = await apiClient.get(
      `/inspirations?project_id=${projectId}`,
      token
    );

    const inspirations = response.inspirations || [];
    console.log(`[Inspirations API] Loaded ${inspirations.length} inspirations`);
    
    return inspirations;
  } catch (error) {
    console.error('[Inspirations API] Error loading inspirations:', error);
    throw error;
  }
}

/**
 * Get single inspiration by ID
 */
export async function getInspirationById(
  id: string,
  token: string
): Promise<ProjectInspiration> {
  try {
    const response = await apiClient.get(`/inspirations/${id}`, token);
    return response.inspiration;
  } catch (error) {
    console.error(`[Inspirations API] Error loading inspiration ${id}:`, error);
    throw error;
  }
}

/**
 * Create new inspiration
 */
export async function createInspiration(
  data: CreateInspirationData,
  token: string
): Promise<ProjectInspiration> {
  try {
    console.log('[Inspirations API] Creating inspiration:', {
      projectId: data.projectId,
      title: data.title,
      source: data.source,
    });

    const response = await apiClient.post('/inspirations', data, token);
    
    console.log('[Inspirations API] Created inspiration:', response.inspiration.id);
    return response.inspiration;
  } catch (error) {
    console.error('[Inspirations API] Error creating inspiration:', error);
    throw error;
  }
}

/**
 * Update existing inspiration
 */
export async function updateInspiration(
  id: string,
  data: UpdateInspirationData,
  token: string
): Promise<ProjectInspiration> {
  try {
    console.log(`[Inspirations API] Updating inspiration: ${id}`);

    const response = await apiClient.put(`/inspirations/${id}`, data, token);
    
    console.log('[Inspirations API] Updated inspiration:', id);
    return response.inspiration;
  } catch (error) {
    console.error(`[Inspirations API] Error updating inspiration ${id}:`, error);
    throw error;
  }
}

/**
 * Delete inspiration
 */
export async function deleteInspiration(
  id: string,
  token: string
): Promise<void> {
  try {
    console.log(`[Inspirations API] Deleting inspiration: ${id}`);

    await apiClient.delete(`/inspirations/${id}`, token);
    
    console.log('[Inspirations API] Deleted inspiration:', id);
  } catch (error) {
    console.error(`[Inspirations API] Error deleting inspiration ${id}:`, error);
    throw error;
  }
}

/**
 * Reorder inspirations
 */
export async function reorderInspirations(
  inspirationIds: string[],
  token: string
): Promise<void> {
  try {
    console.log(`[Inspirations API] Reordering ${inspirationIds.length} inspirations`);

    await apiClient.post('/inspirations/reorder', { inspirationIds }, token);
    
    console.log('[Inspirations API] Reordered inspirations');
  } catch (error) {
    console.error('[Inspirations API] Error reordering inspirations:', error);
    throw error;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const inspirationsApi = {
  getByProject: getInspirationsByProject,
  getById: getInspirationById,
  create: createInspiration,
  update: updateInspiration,
  delete: deleteInspiration,
  reorder: reorderInspirations,
};
