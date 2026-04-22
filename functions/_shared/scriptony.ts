/**
 * Shared Scriptony data helpers for HTTP functions.
 *
 * These helpers normalize request payloads and centralize access checks.
 */

import { requestGraphql } from "./graphql-compat";
import { type ResponseLike, sendNotFound } from "./http";

function hasOwn(body: Record<string, any>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function pickProvided(body: Record<string, any>, ...keys: string[]): any {
  for (const key of keys) {
    if (hasOwn(body, key)) {
      return body[key];
    }
  }
  return undefined;
}

function serializeConceptBlocks(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseConceptBlocks(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function hydrateProjectRow<T extends Record<string, any> | null>(
  project: T,
): T {
  if (!project) return project;
  return {
    ...project,
    concept_blocks: parseConceptBlocks(project.concept_blocks),
  } as T;
}

export function hydrateProjectRows<T extends Record<string, any>>(
  projects: T[],
): T[] {
  return projects.map((project) => hydrateProjectRow(project));
}

export function normalizeProjectInput(
  body: Record<string, any>,
): Record<string, any> {
  const conceptBlocks = pickProvided(body, "concept_blocks", "conceptBlocks");
  const project = {
    organization_id: pickProvided(body, "organization_id", "organizationId"),
    user_id: pickProvided(body, "user_id", "userId"),
    title: pickProvided(body, "title"),
    logline: pickProvided(body, "logline"),
    description: pickProvided(body, "description"),
    genre: pickProvided(body, "genre"),
    type: pickProvided(body, "type"),
    format: pickProvided(body, "format"),
    duration: pickProvided(body, "duration"),
    status: pickProvided(body, "status"),
    slug: pickProvided(body, "slug"),
    world_id: pickProvided(
      body,
      "world_id",
      "worldId",
      "linked_world_id",
      "linkedWorldId",
    ),
    cover_image_url: pickProvided(
      body,
      "cover_image_url",
      "coverImage",
      "coverImageUrl",
    ),
    is_deleted: pickProvided(body, "is_deleted", "isDeleted"),
    narrative_structure: pickProvided(
      body,
      "narrative_structure",
      "narrativeStructure",
    ),
    beat_template: pickProvided(body, "beat_template", "beatTemplate"),
    episode_layout: pickProvided(body, "episode_layout", "episodeLayout"),
    season_engine: pickProvided(body, "season_engine", "seasonEngine"),
    concept_blocks: serializeConceptBlocks(conceptBlocks),
    target_pages: pickProvided(body, "target_pages", "targetPages"),
    words_per_page: pickProvided(body, "words_per_page", "wordsPerPage"),
    reading_speed_wpm: pickProvided(
      body,
      "reading_speed_wpm",
      "readingSpeedWpm",
    ),
    template_id: pickProvided(body, "template_id", "templateId"),
  };

  return Object.fromEntries(
    Object.entries(project).filter(([_, value]) => value !== undefined),
  );
}

export function normalizeWorldInput(
  body: Record<string, any>,
): Record<string, any> {
  // Appwrite `worlds` collection uses `cover_image_url` only (no separate `image_url` attribute).
  const cover = body.cover_image_url ??
    body.coverImageUrl ??
    body.image_url ??
    body.imageUrl ??
    null;
  const world = {
    name: body.name,
    description: body.description ?? null,
    cover_image_url: cover,
    linked_project_id: body.linked_project_id ?? body.linkedProjectId ?? null,
  };

  return Object.fromEntries(
    Object.entries(world).filter(([_, value]) => value !== undefined),
  );
}

const WORLD_DOC_KEYS = [
  "name",
  "description",
  "cover_image_url",
  "linked_project_id",
] as const;

/**
 * Only attributes that exist on the Appwrite `worlds` collection may be sent to createDocument.
 * Strips unknown keys (e.g. `lore`, stray client fields) to avoid
 * "Invalid document structure: Unknown attribute".
 */
export function worldsInsertPayload(
  body: Record<string, any>,
  organizationId: string,
): Record<string, unknown> {
  const n = normalizeWorldInput(body);
  return {
    name: n.name as string,
    description: n.description ?? null,
    cover_image_url: n.cover_image_url ?? null,
    linked_project_id: n.linked_project_id ?? null,
    organization_id: organizationId,
  };
}

/** Allowed fields for worlds update only — no extra keys from the request body. */
export function worldsUpdatePayload(
  body: Record<string, any>,
): Record<string, unknown> {
  const n = normalizeWorldInput(body);
  const out: Record<string, unknown> = {};
  for (const k of WORLD_DOC_KEYS) {
    if (Object.prototype.hasOwnProperty.call(n, k)) {
      out[k] = n[k];
    }
  }
  return out;
}

export function normalizeBeatInput(
  body: Record<string, any>,
): Record<string, any> {
  const beat = {
    label: body.label,
    template_abbr: body.template_abbr ?? body.templateAbbr ?? null,
    description: body.description ?? null,
    from_container_id: body.from_container_id ?? body.fromContainerId,
    to_container_id: body.to_container_id ?? body.toContainerId,
    pct_from: body.pct_from ?? body.pctFrom ?? 0,
    pct_to: body.pct_to ?? body.pctTo ?? 0,
    color: body.color ?? null,
    notes: body.notes ?? null,
    order_index: body.order_index ?? body.orderIndex ?? 0,
  };

  return Object.fromEntries(
    Object.entries(beat).filter(([_, value]) => value !== undefined),
  );
}

export async function getUserOrganizationIds(
  userId: string,
): Promise<string[]> {
  const data = await requestGraphql<{
    organization_members: Array<{ organization_id: string }>;
  }>(
    `
      query GetUserOrganizations($userId: uuid!) {
        organization_members(where: { user_id: { _eq: $userId } }) {
          organization_id
        }
      }
    `,
    { userId },
  );

  return data.organization_members.map((entry) => entry.organization_id);
}

export async function getAccessibleProject(
  projectId: string,
  userId: string,
  organizationIds: string[],
): Promise<Record<string, any> | null> {
  const data = await requestGraphql<{
    projects: Array<Record<string, any>>;
  }>(
    `
      query GetAccessibleProject($projectId: uuid!, $userId: uuid!, $organizationIds: [uuid!]!) {
        projects(
          where: {
            id: { _eq: $projectId }
            _or: [
              { user_id: { _eq: $userId } }
              { organization_id: { _in: $organizationIds } }
            ]
          }
          limit: 1
        ) {
          id
          organization_id
          user_id
          title
          type
          world_id
          cover_image_url
          logline
          genre
          duration
          narrative_structure
          beat_template
          episode_layout
          season_engine
          concept_blocks
          target_pages
          words_per_page
          reading_speed_wpm
          is_deleted
          created_at
          updated_at
        }
      }
    `,
    {
      projectId,
      userId,
      organizationIds,
    },
  );

  return hydrateProjectRow(data.projects[0] || null);
}

/**
 * Verify that the authenticated user has access to the given project.
 * Returns the project row on success, or null (and sends 404) on failure.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  res: ResponseLike,
): Promise<Record<string, any> | null> {
  const organizationIds = await getUserOrganizationIds(userId);
  const project = await getAccessibleProject(
    projectId,
    userId,
    organizationIds,
  );
  if (!project) {
    sendNotFound(res, "Project not found or access denied");
    return null;
  }
  return project;
}

// ============================================================================
// Inspirations Collection Helpers (separate from projects collection)
// ============================================================================

export async function getProjectInspirations(
  projectId: string,
): Promise<string[]> {
  try {
    const data = await requestGraphql<{
      project_inspirations: Array<{ body: string | null; order_index: number }>;
    }>(
      `
        query GetProjectInspirations($projectId: uuid!) {
          project_inspirations(
            where: { project_id: { _eq: $projectId } }
            order_by: { order_index: asc }
          ) {
            body
            order_index
          }
        }
      `,
      { projectId },
    );
    return data.project_inspirations
      .map((row) => row.body)
      .filter((b): b is string => b !== null && b !== undefined);
  } catch {
    return [];
  }
}

export async function setProjectInspirations(
  projectId: string,
  inspirations: string[],
): Promise<void> {
  const validInspirations = inspirations
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Delete existing inspirations first
  await requestGraphql(
    `
      mutation DeleteProjectInspirations($projectId: uuid!) {
        delete_project_inspirations(where: { project_id: { _eq: $projectId } }) {
          affected_rows
        }
      }
    `,
    { projectId },
  );

  // Insert new inspirations if any
  if (validInspirations.length > 0) {
    const objects = validInspirations.map((inspiration, index) => ({
      project_id: projectId,
      body: inspiration,
      order_index: index,
    }));

    await requestGraphql(
      `
        mutation InsertProjectInspirations($objects: [project_inspirations_insert_input!]!) {
          insert_project_inspirations(objects: $objects) {
            affected_rows
          }
        }
      `,
      { objects },
    );
  }
}

export async function deleteProjectInspirations(projectId: string): Promise<void> {
  await requestGraphql(
    `
      mutation DeleteProjectInspirations($projectId: uuid!) {
        delete_project_inspirations(where: { project_id: { _eq: $projectId } }) {
          affected_rows
        }
      }
    `,
    { projectId },
  );
}

/**
 * Hydrate project with inspirations from separate collection
 */
export async function hydrateProjectWithInspirations<
  T extends Record<string, any> | null,
>(project: T): Promise<T> {
  if (!project) return project;
  const inspirations = await getProjectInspirations(project.id);
  return {
    ...project,
    inspirations: inspirations.length > 0 ? inspirations : [],
  } as T;
}

export async function hydrateProjectsWithInspirations<
  T extends Record<string, any>,
>(projects: T[]): Promise<T[]> {
  return Promise.all(projects.map((p) => hydrateProjectWithInspirations(p)));
}
