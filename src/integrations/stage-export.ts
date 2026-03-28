/**
 * Scriptony: Stage-2D-Export-Adapter (Appwrite, React Query, Timeline-Bundle).
 * Die Engine (`StageCanvas`) kennt nur `Stage2DExportAdapter` — keine direkten API-Imports dort.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { BookTimelineData } from "@/components/BookDropdown";
import type { TimelineData } from "@/components/FilmDropdown";
import { getAuthToken } from "@/lib/auth/getAuthToken";
import { getAllShotsByProject, uploadShotImage, uploadShotStageDocument } from "@/lib/api/shots-api";
import { loadProjectTimelineBundle } from "@/lib/timeline-map";
import { queryKeys } from "@/lib/react-query";
import { uploadWorldImage } from "@/lib/api/image-upload-api";
import { itemsApi, projectsApi, worldsApi } from "@/utils/api";
import type {
  Stage2DExportAdapter,
  StageExportAssetRow,
  StageExportProjectRow,
  StageExportWorldRow,
  StageTimelineBundle,
} from "@/engines/stage-2d/export-adapter";
import type { StageDocumentStage2D } from "@/lib/stage-schema-info";
import { normalizeTimelineShot } from "@/engines/stage-2d/normalize-timeline-shot";
import type { Act, Scene, Sequence, Shot } from "@/lib/types";

const byOrderIndex = <T extends { orderIndex?: number }>(a: T, b: T) =>
  (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

function dedupeShots(shots: Shot[]): Shot[] {
  const m = new Map<string, Shot>();
  for (const sh of shots) {
    if (sh.id && !m.has(sh.id)) m.set(sh.id, sh);
  }
  return [...m.values()].sort(byOrderIndex);
}

async function loadTimelineBundle(projectId: string, projectType: string | undefined): Promise<StageTimelineBundle> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Nicht eingeloggt.");
  }
  const isBook = (projectType || "").toLowerCase() === "book";
  const bundle = await loadProjectTimelineBundle(projectId, token, isBook);

  let acts: Act[] = [];
  let sequences: Sequence[] = [];
  let scenes: Scene[] = [];
  let shotsRaw: unknown[] = [];

  if (isBook) {
    const b = bundle as BookTimelineData;
    acts = b.acts || [];
    sequences = b.sequences || [];
    scenes = b.scenes || [];
    const extra = await getAllShotsByProject(projectId, token);
    shotsRaw = extra || [];
  } else {
    const f = bundle as TimelineData;
    acts = f.acts || [];
    sequences = f.sequences || [];
    scenes = f.scenes || [];
    shotsRaw = f.shots || [];
  }

  const shots = dedupeShots(
    (shotsRaw as Record<string, unknown>[]).map((raw) => normalizeTimelineShot(raw))
  );

  return { acts, sequences, scenes, shots };
}

export function createScriptonyStageExportAdapter(queryClient: QueryClient): Stage2DExportAdapter {
  return {
    async loadExportTargets(): Promise<{ projects: StageExportProjectRow[]; worlds: StageExportWorldRow[] }> {
      const [projects, worlds] = await Promise.all([projectsApi.getAll(), worldsApi.getAll()]);
      const normalizedProjects: StageExportProjectRow[] = (projects || []).map((project: Record<string, unknown>) => ({
        id: String(project.id),
        title: (project.title ?? project.name ?? "Unbenanntes Projekt") as string,
        type:
          typeof project.type === "string"
            ? project.type
            : typeof project.project_type === "string"
              ? (project.project_type as string)
              : undefined,
      }));
      const normalizedWorlds: StageExportWorldRow[] = (worlds || []).map((world: Record<string, unknown>) => ({
        id: String(world.id),
        name: String(world.name ?? world.title ?? "Unbenannte Welt"),
      }));
      return { projects: normalizedProjects, worlds: normalizedWorlds };
    },

    loadTimelineForProject: (projectId: string, projectType?: string) =>
      loadTimelineBundle(projectId, projectType),

    async loadAssetsForWorld(worldId: string): Promise<StageExportAssetRow[]> {
      const items = await itemsApi.getAllForWorld(worldId);
      return (items || []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        name: item.name != null ? String(item.name) : item.title != null ? String(item.title) : undefined,
        title: item.title != null ? String(item.title) : undefined,
        world_category_id:
          item.world_category_id != null
            ? String(item.world_category_id)
            : item.worldCategoryId != null
              ? String(item.worldCategoryId)
              : undefined,
        category_id:
          item.category_id != null
            ? String(item.category_id)
            : item.world_category_id != null
              ? String(item.world_category_id)
              : item.worldCategoryId != null
                ? String(item.worldCategoryId)
                : undefined,
      }));
    },

    async assignToShot(args: {
      projectId: string;
      shotId: string;
      file: File;
      stage2dDocument?: StageDocumentStage2D;
    }): Promise<void> {
      const { projectId, shotId, file, stage2dDocument } = args;
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht eingeloggt.");
      }
      const imageUrl = await uploadShotImage(shotId, file, token);
      if (stage2dDocument) {
        await uploadShotStageDocument(shotId, stage2dDocument, "stage2d", token);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.byProject(projectId),
      });
      queryClient.setQueryData(
        queryKeys.timeline.byProject(projectId),
        (old: { shots?: Record<string, unknown>[] } | undefined) => {
          if (!old?.shots?.length) return old;
          return {
            ...old,
            shots: old.shots.map((sh) =>
              String(sh.id) === String(shotId) ? { ...sh, imageUrl, image_url: imageUrl } : sh
            ),
          };
        }
      );
    },

    async assignToWorldAsset(args: {
      worldId: string;
      categoryId: string;
      assetId: string;
      file: File;
    }): Promise<void> {
      const { worldId, categoryId, assetId, file } = args;
      const imageUrl = await uploadWorldImage(worldId, file);
      await itemsApi.update(worldId, categoryId, assetId, { image_url: imageUrl });
    },
  };
}
