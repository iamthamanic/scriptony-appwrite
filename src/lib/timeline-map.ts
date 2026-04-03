/**
 * Shared mapping from Timeline API V2 batch/ultra responses to FilmDropdown/BookDropdown shapes,
 * plus book word-count enrichment (Tiptap). Used by ProjectsPage patterns and VideoEditorTimeline.
 */

import * as TimelineAPIV2 from "./api/timeline-api-v2";
import * as ShotsAPI from "./api/shots-api";
import { nodeToAct, nodeToSequence, nodeToScene } from "./api/timeline-api";
import type { TimelineData } from "../components/FilmDropdown";
import type { BookTimelineData } from "../components/BookDropdown";
import type { Clip, Shot } from "./types";
import * as ClipsAPI from "./api/clips-api";

export function ultraBatchToTimelineData(
  ultra: Awaited<ReturnType<typeof TimelineAPIV2.ultraBatchLoadProject>>
): TimelineData {
  return {
    acts: (ultra.timeline.acts || []).map(nodeToAct),
    sequences: (ultra.timeline.sequences || []).map(nodeToSequence),
    scenes: (ultra.timeline.scenes || []).map(nodeToScene),
    shots: (ultra.shots || []) as Shot[],
    clips: (ultra.clips || []) as Clip[],
  };
}

export function batchTimelineToTimelineData(
  batch: Awaited<ReturnType<typeof TimelineAPIV2.batchLoadTimeline>>,
  shots: unknown[],
  clips: Clip[] = []
): TimelineData {
  return {
    acts: (batch.acts || []).map(nodeToAct),
    sequences: (batch.sequences || []).map(nodeToSequence),
    scenes: (batch.scenes || []).map(nodeToScene),
    shots: (shots || []) as Shot[],
    clips: clips || [],
  };
}

function extractTextFromTiptap(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  let text = "";
  if (typeof n.text === "string") text += n.text;
  if (Array.isArray(n.content)) {
    n.content.forEach((child: unknown) => {
      text += extractTextFromTiptap(child);
      const c = child as Record<string, unknown> | null;
      if (c && (c.type === "paragraph" || c.type === "heading")) {
        text += " ";
      }
    });
  }
  return text;
}

/** Derive word counts for book timeline (same rules as VideoEditorTimeline). */
export function enrichBookTimelineData(base: BookTimelineData): BookTimelineData {
  const parsedScenes = base.scenes.map((scene) => {
    if (scene.metadata?.wordCount !== undefined && scene.metadata?.wordCount !== null) {
      return { ...scene, wordCount: scene.metadata.wordCount };
    }
    const contentSource = scene.content || scene.metadata?.content;
    if (contentSource && typeof contentSource === "string") {
      try {
        const parsed = JSON.parse(contentSource) as unknown;
        const textContent = extractTextFromTiptap(parsed);
        const wordCount = textContent.trim()
          ? textContent.trim().split(/\s+/).filter((w) => w.length > 0).length
          : 0;
        return { ...scene, content: parsed, wordCount };
      } catch {
        const textContent = typeof contentSource === "string" ? contentSource : "";
        const wordCount = textContent.trim()
          ? textContent.trim().split(/\s+/).filter((w) => w.length > 0).length
          : 0;
        return { ...scene, wordCount };
      }
    }
    return { ...scene, wordCount: 0 };
  });

  const sequencesWithWordCounts = base.sequences.map((seq) => {
    const dbWordCount = seq.metadata?.wordCount;
    if (dbWordCount !== undefined && dbWordCount !== null) {
      return { ...seq, wordCount: dbWordCount };
    }
    const sequenceScenes = parsedScenes.filter((sc) => sc.sequenceId === seq.id);
    const totalWords = sequenceScenes.reduce((sum, sc) => sum + (sc.wordCount || 0), 0);
    return { ...seq, wordCount: totalWords };
  });

  const actsWithWordCounts = base.acts.map((act) => {
    const dbWordCount = act.metadata?.wordCount;
    if (dbWordCount !== undefined && dbWordCount !== null) {
      return { ...act, wordCount: dbWordCount };
    }
    const actSequences = sequencesWithWordCounts.filter((s) => s.actId === act.id);
    const totalWords = actSequences.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    return { ...act, wordCount: totalWords };
  });

  return {
    acts: actsWithWordCounts,
    sequences: sequencesWithWordCounts,
    scenes: parsedScenes,
  };
}

/**
 * Load full timeline for a project (ultra batch, fallback batch+shots).
 * Read-only: does not create acts/structure when empty (explicit user/script flows only).
 */
export async function loadProjectTimelineBundle(
  projectId: string,
  token: string,
  isBook: boolean
): Promise<TimelineData | BookTimelineData> {
  let loadedActs: ReturnType<typeof nodeToAct>[] = [];
  let allSequences: ReturnType<typeof nodeToSequence>[] = [];
  let allScenes: ReturnType<typeof nodeToScene>[] = [];
  let allShots: Shot[] = [];
  let allClips: Clip[] = [];

  try {
    const ultraData = await TimelineAPIV2.ultraBatchLoadProject(projectId, token, {
      includeShots: true,
      excludeContent: true,
    });
    const film = ultraBatchToTimelineData(ultraData);
    loadedActs = film.acts;
    allSequences = film.sequences;
    allScenes = film.scenes;
    allShots = film.shots ?? [];
    allClips = film.clips || [];
  } catch {
    const batchData = await TimelineAPIV2.batchLoadTimeline(projectId, token, {
      excludeContent: true,
    }).catch(() => ({
      acts: [],
      sequences: [],
      scenes: [],
      stats: { totalNodes: 0, acts: 0, sequences: 0, scenes: 0 },
    }));
    let fallbackShots: unknown[] = [];
    try {
      fallbackShots = await ShotsAPI.getAllShotsByProject(projectId, token);
    } catch {
      fallbackShots = [];
    }
    const film = batchTimelineToTimelineData(batchData, fallbackShots);
    loadedActs = film.acts;
    allSequences = film.sequences;
    allScenes = film.scenes;
    allShots = film.shots ?? [];
    try {
      allClips = await ClipsAPI.listClipsByProject(projectId, token);
    } catch {
      allClips = [];
    }
  }

  if (isBook) {
    return enrichBookTimelineData({
      acts: loadedActs,
      sequences: allSequences,
      scenes: allScenes,
    });
  }

  return {
    acts: loadedActs,
    sequences: allSequences,
    scenes: allScenes,
    shots: allShots as Shot[],
    clips: allClips,
  };
}
