/**
 * Shared observability helpers for stats, logs, and admin compatibility routes.
 */

import { requestGraphql } from "./hasura";

type JsonRecord = Record<string, any>;

export function toDurationSeconds(shot: JsonRecord): number {
  if (typeof shot.duration === "number") {
    return shot.duration;
  }

  if (typeof shot.duration === "string") {
    const cleaned = shot.duration.trim();
    if (/^\d+$/.test(cleaned)) {
      return Number(cleaned);
    }
    const match = cleaned.match(/^(\d+):(\d{1,2})$/);
    if (match) {
      return Number(match[1]) * 60 + Number(match[2]);
    }
    const secondsMatch = cleaned.match(/^(\d+(?:\.\d+)?)s$/i);
    if (secondsMatch) {
      return Math.round(Number(secondsMatch[1]));
    }
  }

  return (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
}

export function countBy(items: JsonRecord[], field: string, fallback: string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item[field] || fallback;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export async function getProjectStatsPayload(projectId: string): Promise<{
  project: JsonRecord | null;
  nodes: JsonRecord[];
  shots: JsonRecord[];
  characters: JsonRecord[];
  worlds: JsonRecord[];
}> {
  const data = await requestGraphql<{
    projects_by_pk: JsonRecord | null;
    timeline_nodes: JsonRecord[];
    shots: JsonRecord[];
    characters: JsonRecord[];
    worlds: JsonRecord[];
  }>(
    `
      query GetProjectStatsPayload($projectId: uuid!) {
        projects_by_pk(id: $projectId) {
          id
          type
          genre
          created_at
          updated_at
        }
        timeline_nodes(where: { project_id: { _eq: $projectId } }) {
          id
          parent_id
          level
          created_at
          updated_at
        }
        shots(where: { project_id: { _eq: $projectId } }) {
          id
          scene_id
          duration
          shotlength_minutes
          shotlength_seconds
          camera_angle
          framing
          lens
          camera_movement
          image_url
          storyboard_url
          dialog
          notes
          sound_notes
          created_at
          updated_at
        }
        characters(where: { project_id: { _eq: $projectId } }) {
          id
          name
        }
        worlds(where: { project_id: { _eq: $projectId } }) {
          id
        }
      }
    `,
    { projectId }
  );

  return {
    project: data.projects_by_pk,
    nodes: data.timeline_nodes,
    shots: data.shots,
    characters: data.characters,
    worlds: data.worlds,
  };
}

export async function getShotCharacterCounts(projectId: string): Promise<JsonRecord[]> {
  const data = await requestGraphql<{
    shot_characters: Array<{
      character_id: string;
      character: { name: string } | null;
    }>;
  }>(
    `
      query GetShotCharacterCounts($projectId: uuid!) {
        shot_characters(where: { shot: { project_id: { _eq: $projectId } } }) {
          character_id
          character {
            name
          }
        }
      }
    `,
    { projectId }
  );

  const counts = new Map<string, { character_id: string; name: string; shot_count: number }>();
  for (const entry of data.shot_characters) {
    const current = counts.get(entry.character_id) || {
      character_id: entry.character_id,
      name: entry.character?.name || "Unknown",
      shot_count: 0,
    };
    current.shot_count += 1;
    counts.set(entry.character_id, current);
  }

  return Array.from(counts.values()).sort((a, b) => b.shot_count - a.shot_count);
}

export async function getNodeContext(nodeType: string, id: string): Promise<{
  sequences?: number;
  scenes?: number;
  shots?: number;
  characters?: number;
  total_duration?: number;
  average_duration?: number;
  created_at?: string | null;
  updated_at?: string | null;
  has_dialog?: boolean;
  has_notes?: boolean;
  has_audio?: boolean;
  has_image?: boolean;
  camera_angle?: string | null;
  framing?: string | null;
  lens?: string | null;
  camera_movement?: string | null;
}> {
  if (nodeType === "shot") {
    const data = await requestGraphql<{
      shots_by_pk: JsonRecord | null;
      shot_characters: Array<{ character_id: string }>;
    }>(
      `
        query GetShotStats($id: uuid!) {
          shots_by_pk(id: $id) {
            id
            duration
            shotlength_minutes
            shotlength_seconds
            dialog
            notes
            sound_notes
            image_url
            storyboard_url
            camera_angle
            framing
            lens
            camera_movement
            created_at
            updated_at
          }
          shot_characters(where: { shot_id: { _eq: $id } }) {
            character_id
          }
        }
      `,
      { id }
    );

    const shot = data.shots_by_pk;
    if (!shot) {
      return {};
    }

    return {
      characters: data.shot_characters.length,
      duration: toDurationSeconds(shot),
      has_dialog: Boolean(shot.dialog),
      has_notes: Boolean(shot.notes),
      has_audio: Boolean(shot.sound_notes),
      has_image: Boolean(shot.image_url || shot.storyboard_url),
      camera_angle: shot.camera_angle ?? null,
      framing: shot.framing ?? null,
      lens: shot.lens ?? null,
      camera_movement: shot.camera_movement ?? null,
      created_at: shot.created_at,
      updated_at: shot.updated_at,
    };
  }

  const node = await requestGraphql<{
    timeline_nodes_by_pk: JsonRecord | null;
    timeline_nodes: JsonRecord[];
    shots: JsonRecord[];
    shot_characters: Array<{ character_id: string }>;
  }>(
    `
      query GetNodeStats($id: uuid!) {
        timeline_nodes_by_pk(id: $id) {
          id
          level
          created_at
          updated_at
        }
        timeline_nodes(where: { _or: [{ parent_id: { _eq: $id } }, { parent: { parent_id: { _eq: $id } } }] }) {
          id
          parent_id
          level
        }
        shots(where: { _or: [{ scene_id: { _eq: $id } }, { scene: { parent_id: { _eq: $id } } }, { scene: { parent: { parent_id: { _eq: $id } } } }] }) {
          id
          duration
          shotlength_minutes
          shotlength_seconds
          scene_id
        }
        shot_characters(where: { shot: { _or: [{ scene_id: { _eq: $id } }, { scene: { parent_id: { _eq: $id } } }, { scene: { parent: { parent_id: { _eq: $id } } } }] } }) {
          character_id
        }
      }
    `,
    { id }
  );

  const durations = data.shots.map(toDurationSeconds);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const uniqueCharacters = new Set(data.shot_characters.map((entry) => entry.character_id));

  return {
    sequences: data.timeline_nodes.filter((entry) => entry.level === 2).length,
    scenes: data.timeline_nodes.filter((entry) => entry.level === 3).length + (nodeType === "scene" ? 1 : 0),
    shots: data.shots.length,
    characters: uniqueCharacters.size,
    total_duration: totalDuration,
    average_duration: data.shots.length ? Math.round(totalDuration / data.shots.length) : 0,
    created_at: data.timeline_nodes_by_pk?.created_at ?? null,
    updated_at: data.timeline_nodes_by_pk?.updated_at ?? null,
  };
}
