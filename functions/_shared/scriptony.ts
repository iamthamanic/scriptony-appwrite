/**
 * Shared Scriptony data helpers for HTTP functions.
 *
 * These helpers normalize request payloads and centralize access checks.
 */

import { requestGraphql } from "./graphql-compat";

export function normalizeProjectInput(body: Record<string, any>): Record<string, any> {
  const project = {
    title: body.title,
    logline: body.logline ?? body.description ?? null,
    genre: body.genre ?? null,
    type: body.type || "film",
    duration: body.duration ?? null,
    world_id: body.world_id ?? body.worldId ?? body.linked_world_id ?? body.linkedWorldId ?? null,
    cover_image_url: body.cover_image_url ?? body.coverImage ?? body.coverImageUrl ?? null,
    narrative_structure: body.narrative_structure ?? body.narrativeStructure ?? null,
    beat_template: body.beat_template ?? body.beatTemplate ?? null,
    episode_layout: body.episode_layout ?? body.episodeLayout ?? null,
    season_engine: body.season_engine ?? body.seasonEngine ?? null,
    template_id: body.template_id ?? body.templateId ?? null,
    time_lock: body.time_lock ?? body.timeLock ?? null,
    max_duration_seconds: body.max_duration_seconds ?? body.maxDurationSeconds ?? null,
    reading_speed_wpm: body.reading_speed_wpm ?? body.readingSpeedWpm ?? null,
  };

  return Object.fromEntries(
    Object.entries(project).filter(([_, value]) => value !== undefined)
  );
}

export function normalizeWorldInput(body: Record<string, any>): Record<string, any> {
  const world = {
    name: body.name,
    description: body.description ?? null,
    lore: body.lore ?? null,
    image_url: body.image_url ?? body.imageUrl ?? null,
    cover_image_url: body.cover_image_url ?? body.coverImageUrl ?? body.image_url ?? body.imageUrl ?? null,
    linked_project_id: body.linked_project_id ?? body.linkedProjectId ?? null,
  };

  return Object.fromEntries(
    Object.entries(world).filter(([_, value]) => value !== undefined)
  );
}

export function normalizeBeatInput(body: Record<string, any>): Record<string, any> {
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
    Object.entries(beat).filter(([_, value]) => value !== undefined)
  );
}

export async function getUserOrganizationIds(userId: string): Promise<string[]> {
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
    { userId }
  );

  return data.organization_members.map((entry) => entry.organization_id);
}

export async function getAccessibleProject(
  projectId: string,
  userId: string,
  organizationIds: string[]
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
    }
  );

  return data.projects[0] || null;
}
