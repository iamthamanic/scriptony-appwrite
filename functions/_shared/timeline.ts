/**
 * Shared timeline helpers for Scriptony HTTP routes.
 *
 * This module normalizes node, character, shot, and audio payloads so multiple
 * file-based handlers can stay small and consistent.
 */

import { requestGraphql } from "./graphql-compat";

type JsonRecord = Record<string, any>;

function compact<T extends JsonRecord>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeNodeInput(body: JsonRecord): JsonRecord {
  return compact({
    project_id: body.project_id ?? body.projectId,
    template_id: body.template_id ?? body.templateId,
    level: body.level,
    parent_id:
      body.parent_id !== undefined ? body.parent_id : body.parentId,
    node_number: body.node_number ?? body.nodeNumber,
    title: body.title,
    description: body.description ?? null,
    color: body.color ?? null,
    order_index: body.order_index ?? body.orderIndex,
    metadata: body.metadata ?? {},
  });
}

export function normalizeCharacterInput(body: JsonRecord): JsonRecord {
  return compact({
    project_id: body.project_id ?? body.projectId,
    world_id: body.world_id ?? body.worldId ?? null,
    organization_id: body.organization_id ?? body.organizationId ?? null,
    name: body.name,
    role: body.role ?? null,
    description: body.description ?? null,
    image_url: body.image_url ?? body.imageUrl ?? body.avatar_url ?? null,
    avatar_url: body.avatar_url ?? body.avatarUrl ?? body.image_url ?? null,
    backstory: body.backstory ?? null,
    personality: body.personality ?? null,
    color: body.color ?? null,
  });
}

export function normalizeShotInput(body: JsonRecord): JsonRecord {
  return compact({
    scene_id: body.scene_id ?? body.sceneId,
    project_id: body.project_id ?? body.projectId,
    shot_number: body.shot_number ?? body.shotNumber,
    description: body.description ?? null,
    camera_angle: body.camera_angle ?? body.cameraAngle ?? null,
    camera_movement: body.camera_movement ?? body.cameraMovement ?? null,
    framing: body.framing ?? null,
    lens: body.lens ?? null,
    duration: body.duration ?? null,
    shotlength_minutes:
      body.shotlength_minutes ?? body.shotlengthMinutes ?? null,
    shotlength_seconds:
      body.shotlength_seconds ?? body.shotlengthSeconds ?? null,
    composition: body.composition ?? null,
    lighting_notes: body.lighting_notes ?? body.lightingNotes ?? null,
    image_url: body.image_url ?? body.imageUrl ?? null,
    sound_notes: body.sound_notes ?? body.soundNotes ?? null,
    storyboard_url: body.storyboard_url ?? body.storyboardUrl ?? null,
    reference_image_url:
      body.reference_image_url ?? body.referenceImageUrl ?? null,
    dialog: body.dialog ?? null,
    notes: body.notes ?? null,
    order_index: body.order_index ?? body.orderIndex,
    user_id: body.user_id ?? body.userId ?? null,
  });
}

export function mapCharacter(row: JsonRecord): JsonRecord {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    project_id: row.project_id ?? null,
    worldId: row.world_id ?? null,
    world_id: row.world_id ?? null,
    organizationId: row.organization_id ?? null,
    organization_id: row.organization_id ?? null,
    name: row.name,
    role: row.role ?? undefined,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? row.avatar_url ?? undefined,
    image_url: row.image_url ?? row.avatar_url ?? null,
    avatar_url: row.avatar_url ?? row.image_url ?? null,
    backstory: row.backstory ?? undefined,
    personality: row.personality ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

export function mapNode(row: JsonRecord): JsonRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    project_id: row.project_id,
    templateId: row.template_id,
    template_id: row.template_id,
    level: row.level,
    parentId: row.parent_id ?? null,
    parent_id: row.parent_id ?? null,
    nodeNumber: row.node_number,
    node_number: row.node_number,
    title: row.title,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    orderIndex: row.order_index,
    order_index: row.order_index,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

export function mapShotAudio(row: JsonRecord): JsonRecord {
  return {
    id: row.id,
    shotId: row.shot_id,
    shot_id: row.shot_id,
    type: row.type,
    fileUrl: row.file_url,
    file_url: row.file_url,
    fileName: row.file_name,
    file_name: row.file_name,
    label: row.label ?? undefined,
    fileSize: row.file_size ?? undefined,
    file_size: row.file_size ?? undefined,
    startTime: row.start_time ?? undefined,
    start_time: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    end_time: row.end_time ?? undefined,
    fadeIn: row.fade_in ?? undefined,
    fade_in: row.fade_in ?? undefined,
    fadeOut: row.fade_out ?? undefined,
    fade_out: row.fade_out ?? undefined,
    waveformData: Array.isArray(row.waveform_data) ? row.waveform_data : [],
    waveform_data: Array.isArray(row.waveform_data) ? row.waveform_data : [],
    duration: row.audio_duration ?? row.duration ?? undefined,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

export function mapShot(row: JsonRecord): JsonRecord {
  return {
    id: row.id,
    sceneId: row.scene_id,
    scene_id: row.scene_id,
    projectId: row.project_id,
    project_id: row.project_id,
    shotNumber: row.shot_number,
    shot_number: row.shot_number,
    description: row.description ?? undefined,
    cameraAngle: row.camera_angle ?? undefined,
    camera_angle: row.camera_angle ?? undefined,
    cameraMovement: row.camera_movement ?? undefined,
    camera_movement: row.camera_movement ?? undefined,
    framing: row.framing ?? undefined,
    lens: row.lens ?? undefined,
    duration: row.duration ?? undefined,
    shotlengthMinutes: row.shotlength_minutes ?? undefined,
    shotlength_minutes: row.shotlength_minutes ?? undefined,
    shotlengthSeconds: row.shotlength_seconds ?? undefined,
    shotlength_seconds: row.shotlength_seconds ?? undefined,
    composition: row.composition ?? undefined,
    lightingNotes: row.lighting_notes ?? undefined,
    lighting_notes: row.lighting_notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
    image_url: row.image_url ?? undefined,
    soundNotes: row.sound_notes ?? undefined,
    sound_notes: row.sound_notes ?? undefined,
    storyboardUrl: row.storyboard_url ?? undefined,
    storyboard_url: row.storyboard_url ?? undefined,
    referenceImageUrl: row.reference_image_url ?? undefined,
    reference_image_url: row.reference_image_url ?? undefined,
    dialog: row.dialog ?? undefined,
    notes: row.notes ?? undefined,
    orderIndex: row.order_index,
    order_index: row.order_index,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    updatedBy: row.user_id ?? undefined,
    user_id: row.user_id ?? undefined,
    characters: asArray(row.shot_characters).map((entry) =>
      mapCharacter(entry.character)
    ),
    audioFiles: asArray(row.shot_audio).map(mapShotAudio),
    audio_files: asArray(row.shot_audio).map(mapShotAudio),
  };
}

export async function getProjectIfAccessible(projectId: string): Promise<JsonRecord | null> {
  const data = await requestGraphql<{
    projects_by_pk: JsonRecord | null;
  }>(
    `
      query GetProjectForTimeline($projectId: uuid!) {
        projects_by_pk(id: $projectId) {
          id
          organization_id
          user_id
          title
          type
          template_id
          is_deleted
        }
      }
    `,
    { projectId }
  );

  return data.projects_by_pk;
}

export async function getNodeById(nodeId: string): Promise<JsonRecord | null> {
  const data = await requestGraphql<{
    timeline_nodes_by_pk: JsonRecord | null;
  }>(
    `
      query GetTimelineNode($nodeId: uuid!) {
        timeline_nodes_by_pk(id: $nodeId) {
          id
          project_id
          template_id
          level
          parent_id
          node_number
          title
          description
          color
          order_index
          metadata
          created_at
          updated_at
        }
      }
    `,
    { nodeId }
  );

  return data.timeline_nodes_by_pk;
}

export async function getTimelineChildren(parentId: string): Promise<JsonRecord[]> {
  const data = await requestGraphql<{
    timeline_nodes: JsonRecord[];
  }>(
    `
      query GetTimelineChildren($parentId: uuid!) {
        timeline_nodes(
          where: { parent_id: { _eq: $parentId } }
          order_by: [{ order_index: asc }, { node_number: asc }, { created_at: asc }]
        ) {
          id
          project_id
          template_id
          level
          parent_id
          node_number
          title
          description
          color
          order_index
          metadata
          created_at
          updated_at
        }
      }
    `,
    { parentId }
  );

  return data.timeline_nodes;
}

export async function getTimelineNodes(filters: {
  projectId: string;
  level?: number;
  parentId?: string | null;
}): Promise<JsonRecord[]> {
  const nodes = await getAllProjectNodes(filters.projectId);

  return nodes.filter((node) => {
    if (filters.level !== undefined && node.level !== filters.level) {
      return false;
    }
    if (filters.parentId !== undefined) {
      return (node.parent_id ?? null) === filters.parentId;
    }
    return true;
  });
}

export async function getAllProjectNodes(projectId: string): Promise<JsonRecord[]> {
  const data = await requestGraphql<{
    timeline_nodes: JsonRecord[];
  }>(
    `
      query GetAllProjectNodes($projectId: uuid!) {
        timeline_nodes(
          where: { project_id: { _eq: $projectId } }
          order_by: [
            { level: asc }
            { parent_id: asc_nulls_first }
            { order_index: asc }
            { node_number: asc }
          ]
        ) {
          id
          project_id
          template_id
          level
          parent_id
          node_number
          title
          description
          color
          order_index
          metadata
          created_at
          updated_at
        }
      }
    `,
    { projectId }
  );

  return data.timeline_nodes;
}

export async function getCharactersByProject(projectId: string): Promise<JsonRecord[]> {
  const data = await requestGraphql<{
    characters: JsonRecord[];
  }>(
    `
      query GetCharactersByProject($projectId: uuid!) {
        characters(
          where: { project_id: { _eq: $projectId } }
          order_by: [{ updated_at: desc }, { created_at: desc }]
        ) {
          id
          project_id
          world_id
          organization_id
          name
          role
          description
          image_url
          avatar_url
          backstory
          personality
          color
          created_at
          updated_at
        }
      }
    `,
    { projectId }
  );

  return data.characters;
}

export async function getCharacterById(characterId: string): Promise<JsonRecord | null> {
  const data = await requestGraphql<{
    characters_by_pk: JsonRecord | null;
  }>(
    `
      query GetCharacter($characterId: uuid!) {
        characters_by_pk(id: $characterId) {
          id
          project_id
          world_id
          organization_id
          name
          role
          description
          image_url
          avatar_url
          backstory
          personality
          color
          created_at
          updated_at
        }
      }
    `,
    { characterId }
  );

  return data.characters_by_pk;
}

export async function getShots(filters: {
  projectId?: string;
  sceneId?: string;
}): Promise<JsonRecord[]> {
  if (filters.projectId) {
    const data = await requestGraphql<{
      shots: JsonRecord[];
    }>(
      `
        query GetShotsByProject($projectId: uuid!) {
          shots(
            where: { project_id: { _eq: $projectId } }
            order_by: [{ order_index: asc }, { created_at: asc }]
          ) {
            id
            scene_id
            project_id
            shot_number
            description
            camera_angle
            camera_movement
            framing
            lens
            duration
            shotlength_minutes
            shotlength_seconds
            composition
            lighting_notes
            image_url
            sound_notes
            storyboard_url
            reference_image_url
            dialog
            notes
            order_index
            user_id
            created_at
            updated_at
            shot_characters {
              character {
                id
                project_id
                world_id
                organization_id
                name
                role
                description
                image_url
                avatar_url
                backstory
                personality
                color
                created_at
                updated_at
              }
            }
            shot_audio(order_by: { created_at: asc }) {
              id
              shot_id
              type
              file_url
              file_name
              label
              file_size
              start_time
              end_time
              fade_in
              fade_out
              waveform_data
              audio_duration
              created_at
            }
          }
        }
      `,
      { projectId: filters.projectId }
    );

    return data.shots;
  }

  if (filters.sceneId) {
    const data = await requestGraphql<{
      shots: JsonRecord[];
    }>(
      `
        query GetShotsByScene($sceneId: uuid!) {
          shots(
            where: { scene_id: { _eq: $sceneId } }
            order_by: [{ order_index: asc }, { created_at: asc }]
          ) {
            id
            scene_id
            project_id
            shot_number
            description
            camera_angle
            camera_movement
            framing
            lens
            duration
            shotlength_minutes
            shotlength_seconds
            composition
            lighting_notes
            image_url
            sound_notes
            storyboard_url
            reference_image_url
            dialog
            notes
            order_index
            user_id
            created_at
            updated_at
            shot_characters {
              character {
                id
                project_id
                world_id
                organization_id
                name
                role
                description
                image_url
                avatar_url
                backstory
                personality
                color
                created_at
                updated_at
              }
            }
            shot_audio(order_by: { created_at: asc }) {
              id
              shot_id
              type
              file_url
              file_name
              label
              file_size
              start_time
              end_time
              fade_in
              fade_out
              waveform_data
              audio_duration
              created_at
            }
          }
        }
      `,
      { sceneId: filters.sceneId }
    );

    return data.shots;
  }

  return [];
}

export async function getShotById(shotId: string): Promise<JsonRecord | null> {
  const data = await requestGraphql<{
    shots_by_pk: JsonRecord | null;
  }>(
    `
      query GetShot($shotId: uuid!) {
        shots_by_pk(id: $shotId) {
          id
          scene_id
          project_id
          shot_number
          description
          camera_angle
          camera_movement
          framing
          lens
          duration
          shotlength_minutes
          shotlength_seconds
          composition
          lighting_notes
          image_url
          sound_notes
          storyboard_url
          reference_image_url
          dialog
          notes
          order_index
          user_id
          created_at
          updated_at
          shot_characters {
            character {
              id
              project_id
              world_id
              organization_id
              name
              role
              description
              image_url
              avatar_url
              backstory
              personality
              color
              created_at
              updated_at
            }
          }
          shot_audio(order_by: { created_at: asc }) {
            id
            shot_id
            type
            file_url
            file_name
            label
            file_size
            start_time
            end_time
            fade_in
            fade_out
            waveform_data
            audio_duration
            created_at
          }
        }
      }
    `,
    { shotId }
  );

  return data.shots_by_pk;
}

export async function buildNodePath(nodeId: string): Promise<JsonRecord[]> {
  const path: JsonRecord[] = [];
  let current = await getNodeById(nodeId);

  while (current) {
    path.unshift(mapNode(current));
    if (!current.parent_id) {
      break;
    }
    current = await getNodeById(current.parent_id);
  }

  return path;
}

export async function getRecursiveChildren(nodeId: string): Promise<JsonRecord[]> {
  const children = await getTimelineChildren(nodeId);
  const nested = await Promise.all(
    children.map(async (child) => {
      const descendants = await getRecursiveChildren(child.id);
      return [mapNode(child), ...descendants];
    })
  );

  return nested.flat();
}
