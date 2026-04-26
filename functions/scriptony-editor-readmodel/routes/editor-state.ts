/**
 * T12: Editor State Route — Read-only View-Model.
 *
 * GET /editor/projects/:projectId/state?lite=true
 *   lite=true   → project + timeline nodes only
 *   lite=false  → full aggregation (default)
 *
 * Verboten: createDocument, updateDocument, deleteDocument, Storage Writes,
 *           Provider Calls, Job-Erstellung.
 */

import { Query } from "node-appwrite";
import { requireUserBootstrap } from "../../_shared/auth";
import { listDocumentsFull, C } from "../../_shared/appwrite-db";
import {
  getQuery,
  type RequestLike,
  type ResponseLike,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { requireProjectAccess } from "../../_shared/scriptony";
import {
  getAllProjectNodes,
  getCharactersByProject,
  getShots,
  mapNode,
  mapCharacter,
  mapShot,
} from "../../_shared/timeline";
import { mapClip } from "../../_shared/clips-map";

type TimelineLevel = { level: number };

async function getScriptBlocksForProject(
  projectId: string,
): Promise<Record<string, any>[]> {
  try {
    const scripts = await listDocumentsFull(C.scripts, [
      Query.equal("project_id", projectId),
      Query.limit(1),
    ]);
    const scriptId = scripts[0]?.id;
    if (!scriptId) return [];
    return listDocumentsFull(C.script_blocks, [
      Query.equal("script_id", scriptId),
      Query.orderAsc("order_index"),
      Query.limit(5000),
    ]);
  } catch {
    return [];
  }
}

async function getSceneAudioTracksForProject(
  projectId: string,
): Promise<Record<string, any>[]> {
  try {
    const data = await requestGraphql<{
      scene_audio_tracks: Array<Record<string, any>>;
    }>(
      `
        query GetSceneAudioTracksByProject($projectId: uuid!) {
          scene_audio_tracks(
            where: { project_id: { _eq: $projectId } }
            order_by: { order_index: asc }
          ) {
            id
            scene_id
            project_id
            type
            content
            character_id
            audio_file_id
            order_index
            start_time
            end_time
            created_at
            updated_at
          }
        }
      `,
      { projectId },
    );
    return data.scene_audio_tracks || [];
  } catch {
    return [];
  }
}

async function getAssetsForProject(
  projectId: string,
): Promise<Record<string, any>[]> {
  try {
    return listDocumentsFull(C.assets, [
      Query.equal("project_id", projectId),
      Query.limit(5000),
    ]);
  } catch {
    return [];
  }
}

async function getStyleForProject(projectId: string): Promise<{
  style: Record<string, any> | null;
  items: Record<string, any>[];
}> {
  try {
    const styles = await listDocumentsFull(C.project_visual_style, [
      Query.equal("project_id", projectId),
      Query.limit(1),
    ]);
    const style = styles[0] || null;
    if (!style) return { style: null, items: [] };
    const items = await listDocumentsFull(C.project_visual_style_items, [
      Query.equal("project_visual_style_id", style.id),
      Query.limit(5000),
    ]);
    return { style, items };
  } catch {
    return { style: null, items: [] };
  }
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const startedAt = Date.now();

  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      sendMethodNotAllowed(res, ["GET"]);
      return;
    }

    const projectId = req.params?.projectId || "";
    if (!projectId) {
      sendJson(res, 400, { error: "projectId is required" });
      return;
    }

    const project = await requireProjectAccess(
      projectId,
      bootstrap.user.id,
      res,
    );
    if (!project) return;

    const lite = (getQuery(req, "lite") || "false") === "true";

    // === Core: always fetched ===
    const nodesPromise = getAllProjectNodes(projectId);

    // === Extended: parallel for full mode ===
    const extendedPromise = lite
      ? Promise.resolve(null)
      : Promise.all([
          getCharactersByProject(projectId),
          getShots({ projectId }),
          listDocumentsFull(C.clips, [Query.equal("project_id", projectId)]),
          getScriptBlocksForProject(projectId),
          getSceneAudioTracksForProject(projectId),
          getAssetsForProject(projectId),
          getStyleForProject(projectId),
        ]);

    const [nodes, extended] = await Promise.all([
      nodesPromise,
      extendedPromise,
    ]);

    const mappedNodes = nodes.map(mapNode);

    const response: Record<string, any> = {
      project: {
        id: project.id,
        title: project.title,
        type: project.type,
        logline: project.logline ?? undefined,
        genre: project.genre ?? undefined,
        duration: project.duration ?? undefined,
        coverImageUrl: project.cover_image_url ?? undefined,
        narrativeStructure: project.narrative_structure ?? undefined,
        beatTemplate: project.beat_template ?? undefined,
        episodeLayout: project.episode_layout ?? undefined,
        seasonEngine: project.season_engine ?? undefined,
        worldId: project.world_id ?? undefined,
        isDeleted: project.is_deleted ?? false,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
      timeline: {
        acts: mappedNodes.filter((n: TimelineLevel) => n.level === 1),
        sequences: mappedNodes.filter((n: TimelineLevel) => n.level === 2),
        scenes: mappedNodes.filter((n: TimelineLevel) => n.level === 3),
      },
      meta: {
        lite,
        elapsedMs: Date.now() - startedAt,
        version: "v1",
        warning:
          mappedNodes.length > 200
            ? "Large project: consider lite=true for faster loads"
            : undefined,
      },
    };

    if (!lite && extended) {
      const [
        characters,
        shots,
        clipRows,
        scriptBlocks,
        sceneAudioTracks,
        assets,
        styleData,
      ] = extended;

      const mappedShots = shots.map(mapShot);
      const shotIds = new Set(mappedShots.map((s) => s.id));

      response.characters = characters.map(mapCharacter);
      response.shots = mappedShots;
      response.clips = clipRows
        .map(mapClip)
        .filter((c) => shotIds.has(c.shotId));
      response.scriptBlocks = scriptBlocks.map((b) => ({
        id: b.id,
        scriptId: b.script_id ?? null,
        type: b.type ?? null,
        content: b.content ?? null,
        speakerCharacterId: b.speaker_character_id ?? null,
        orderIndex: b.order_index ?? 0,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));
      response.sceneAudioTracks = sceneAudioTracks.map((t) => ({
        id: t.id,
        sceneId: t.scene_id ?? null,
        projectId: t.project_id ?? null,
        type: t.type ?? null,
        content: t.content ?? null,
        characterId: t.character_id ?? null,
        audioFileId: t.audio_file_id ?? null,
        orderIndex: t.order_index ?? 0,
        startTime: t.start_time ?? null,
        endTime: t.end_time ?? null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
      response.assets = assets.map((a) => ({
        id: a.id,
        ownerType: a.owner_type ?? null,
        ownerId: a.owner_id ?? null,
        mediaType: a.media_type ?? null,
        purpose: a.purpose ?? null,
        fileId: a.file_id ?? null,
        filename: a.filename ?? null,
        mimeType: a.mime_type ?? null,
        size: a.size ?? null,
        status: a.status ?? null,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
      response.styleSummary = styleData.style
        ? {
            id: styleData.style.id,
            projectId: styleData.style.project_id ?? null,
            name: styleData.style.name ?? null,
            description: styleData.style.description ?? null,
            items: styleData.items.map((item) => ({
              id: item.id,
              category: item.category ?? null,
              label: item.label ?? null,
              value: item.value ?? null,
              imageUrl: item.image_url ?? null,
              orderIndex: item.order_index ?? 0,
            })),
          }
        : null;

      response.stats = {
        totalNodes: mappedNodes.length,
        acts: response.timeline.acts.length,
        sequences: response.timeline.sequences.length,
        scenes: response.timeline.scenes.length,
        characters: response.characters.length,
        shots: response.shots.length,
        clips: response.clips.length,
        scriptBlocks: response.scriptBlocks.length,
        sceneAudioTracks: response.sceneAudioTracks.length,
        assets: response.assets.length,
        styleItems: styleData.items.length,
      };
    }

    sendJson(res, 200, response);
  } catch (error) {
    console.error("[editor-readmodel] error:", error);
    sendServerError(res, error);
  }
}
