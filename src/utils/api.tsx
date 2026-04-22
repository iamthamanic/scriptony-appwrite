/**
 * Legacy API Wrapper - Backwards Compatibility Layer
 *
 * This file maintains the old API interface for existing code.
 * New code should use /lib/api-client.ts directly.
 *
 * @deprecated Use /lib/api-client.ts instead
 */

// Import directly from api-client to avoid dependency on formatters
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../lib/api-client";

/**
 * @deprecated Use apiGet, apiPost, etc. from /lib/api-client.ts
 */
async function apiFetch(
  endpoint: string,
  options: { method?: string; body?: any } = {},
) {
  const { method = "GET", body } = options;

  let result;

  switch (method.toUpperCase()) {
    case "GET":
      result = await apiGet(endpoint);
      break;
    case "POST":
      result = await apiPost(endpoint, body);
      break;
    case "PUT":
      result = await apiPut(endpoint, body);
      break;
    case "DELETE":
      result = await apiDelete(endpoint, body);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  // Unwrap result (throw on error to maintain backward compatibility)
  return unwrapApiResult(result);
}

// ==================== PROJECTS ====================

export const projectsApi = {
  getAll: async () => {
    const data = await apiFetch("/projects");
    // Server returns array directly, not { projects: [...] }
    return Array.isArray(data) ? data : data?.projects || [];
  },

  getOne: async (id: string) => {
    const data = await apiFetch(`/projects/${id}`);
    // Server returns object directly, not { project: {...} }
    return data?.project || data;
  },

  create: async (project: any) => {
    const data = await apiFetch("/projects", {
      method: "POST",
      body: project,
    });
    // Server returns object directly, not { project: {...} }
    return data?.project || data;
  },

  update: async (id: string, project: any) => {
    const data = await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: project,
    });
    // Server returns object directly, not { project: {...} }
    return data?.project || data;
  },

  delete: async (id: string, password: string) => {
    await apiFetch(`/projects/${id}`, {
      method: "DELETE",
      body: { password },
    });
  },
};

// ==================== SCENES ====================

export const scenesApi = {
  getAll: async (projectId: string) => {
    const data = await apiFetch(`/projects/${projectId}/scenes`);
    return data.scenes;
  },

  create: async (projectId: string, scene: any) => {
    const data = await apiFetch(`/projects/${projectId}/scenes`, {
      method: "POST",
      body: scene,
    });
    return data.scene;
  },

  update: async (projectId: string, id: string, scene: any) => {
    const data = await apiFetch(`/projects/${projectId}/scenes/${id}`, {
      method: "PUT",
      body: scene,
    });
    return data.scene;
  },

  delete: async (projectId: string, id: string) => {
    await apiFetch(`/projects/${projectId}/scenes/${id}`, { method: "DELETE" });
  },
};

// ==================== CHARACTERS ====================

export const charactersApi = {
  getAll: async (projectId: string) => {
    const data = await apiFetch(`/projects/${projectId}/characters`);
    return data.characters;
  },

  create: async (projectId: string, character: any) => {
    const data = await apiFetch(`/projects/${projectId}/characters`, {
      method: "POST",
      body: character,
    });
    return data.character;
  },

  update: async (projectId: string, id: string, character: any) => {
    const data = await apiFetch(`/projects/${projectId}/characters/${id}`, {
      method: "PUT",
      body: character,
    });
    return data.character;
  },

  delete: async (projectId: string, id: string) => {
    await apiFetch(`/projects/${projectId}/characters/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== WORLDS ====================

export const worldsApi = {
  getAll: async () => {
    const data = await apiFetch("/worlds");
    // Server returns array directly, not { worlds: [...] }
    return Array.isArray(data) ? data : data?.worlds || [];
  },

  getOne: async (id: string) => {
    const data = await apiFetch(`/worlds/${id}`);
    // Server returns object directly, not { world: {...} }
    return data?.world || data;
  },

  create: async (world: any) => {
    const data = await apiFetch("/worlds", {
      method: "POST",
      body: world,
    });
    // Server returns object directly, not { world: {...} }
    return data?.world || data;
  },

  update: async (id: string, world: any) => {
    const data = await apiFetch(`/worlds/${id}`, {
      method: "PUT",
      body: world,
    });
    // Server returns object directly, not { world: {...} }
    return data?.world || data;
  },

  delete: async (id: string, password: string) => {
    await apiFetch(`/worlds/${id}`, {
      method: "DELETE",
      body: { password },
    });
  },
};

// ==================== CATEGORIES ====================

export const categoriesApi = {
  getAll: async (worldId: string) => {
    const data = await apiFetch(`/worlds/${worldId}/categories`);
    return data.categories;
  },

  create: async (worldId: string, category: any) => {
    const data = await apiFetch(`/worlds/${worldId}/categories`, {
      method: "POST",
      body: category,
    });
    return data.category;
  },

  update: async (worldId: string, id: string, category: any) => {
    const data = await apiFetch(`/worlds/${worldId}/categories/${id}`, {
      method: "PUT",
      body: category,
    });
    return data.category;
  },

  delete: async (worldId: string, id: string) => {
    await apiFetch(`/worlds/${worldId}/categories/${id}`, { method: "DELETE" });
  },
};

// ==================== ITEMS ====================

export const itemsApi = {
  getAll: async (worldId: string, categoryId: string) => {
    const data = await apiFetch(
      `/worlds/${worldId}/categories/${categoryId}/items`,
    );
    return data.items;
  },

  getAllForWorld: async (worldId: string) => {
    const data = await apiFetch(`/worlds/${worldId}/items`);
    return data.items;
  },

  create: async (worldId: string, categoryId: string, item: any) => {
    const data = await apiFetch(
      `/worlds/${worldId}/categories/${categoryId}/items`,
      {
        method: "POST",
        body: item,
      },
    );
    return data.item;
  },

  update: async (
    worldId: string,
    categoryId: string,
    id: string,
    item: any,
  ) => {
    const data = await apiFetch(
      `/worlds/${worldId}/categories/${categoryId}/items/${id}`,
      {
        method: "PUT",
        body: item,
      },
    );
    return data.item;
  },

  delete: async (worldId: string, categoryId: string, id: string) => {
    await apiFetch(`/worlds/${worldId}/categories/${categoryId}/items/${id}`, {
      method: "DELETE",
    });
  },
};
