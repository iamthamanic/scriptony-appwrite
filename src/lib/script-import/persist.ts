/**
 * Persist parsed segments via Timeline API and return fresh TimelineData for cache.
 */

import type { ScriptProjectKind, ImportSegment, ImportedTimelineData } from './types';
import * as TimelineAPI from '../api/timeline-api';
import * as TimelineAPIV2 from '../api/timeline-api-v2';
import * as ShotsAPI from '../api/shots-api';
import { nodeToAct, nodeToSequence, nodeToScene } from '../api/timeline-api';
import { splitIntoThirds } from './split-thirds';
import { tiptapDocToContentString } from './tiptap-plain';

async function nextSequenceNumber(
  projectId: string,
  actId: string,
  token: string
): Promise<number> {
  const all = await TimelineAPI.getAllSequencesByProject(projectId, token);
  const inAct = all.filter((s) => s.actId === actId);
  if (inAct.length === 0) return 1;
  return Math.max(...inAct.map((s) => s.sequenceNumber ?? 0)) + 1;
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter((w) => w.length > 0).length;
}

async function ensureThreeActs(projectId: string, token: string) {
  let acts = await TimelineAPI.getActs(projectId, token);
  if (!acts.length) {
    await ShotsAPI.initializeTimelineStructureFromNarrative(projectId, token, '3-act');
    acts = await TimelineAPI.getActs(projectId, token);
  }
  return [...acts].sort((a, b) => (a.actNumber ?? 0) - (b.actNumber ?? 0));
}

async function reloadTimeline(projectId: string, token: string): Promise<ImportedTimelineData> {
  try {
    const ultra = await TimelineAPIV2.ultraBatchLoadProject(projectId, token);
    return {
      acts: (ultra.timeline.acts || []).map(nodeToAct),
      sequences: (ultra.timeline.sequences || []).map(nodeToSequence),
      scenes: (ultra.timeline.scenes || []).map(nodeToScene),
      shots: ultra.shots || [],
    };
  } catch {
    const [batch, shotsList] = await Promise.all([
      TimelineAPIV2.batchLoadTimeline(projectId, token),
      ShotsAPI.getAllShotsByProject(projectId, token).catch(() => []),
    ]);
    return {
      acts: (batch.acts || []).map(nodeToAct),
      sequences: (batch.sequences || []).map(nodeToSequence),
      scenes: (batch.scenes || []).map(nodeToScene),
      shots: shotsList || [],
    };
  }
}

async function persistFilmLike(
  projectId: string,
  segments: ImportSegment[],
  token: string
): Promise<void> {
  const acts = await ensureThreeActs(projectId, token);
  const [bucketA, bucketB, bucketC] = splitIntoThirds(segments);
  const buckets = [bucketA, bucketB, bucketC];

  for (let i = 0; i < 3; i++) {
    const bucket = buckets[i];
    if (!bucket.length) continue;
    const act = acts[i];
    if (!act?.id) continue;

    const seqNum = await nextSequenceNumber(projectId, act.id, token);
    const seq = await TimelineAPI.createSequence(
      act.id,
      {
        sequenceNumber: seqNum,
        title: 'Import',
        description: `${bucket.length} Szenen aus Skript-Import`,
      },
      token
    );

    for (let j = 0; j < bucket.length; j++) {
      const seg = bucket[j];
      const title = seg.title.slice(0, 200);
      const description = seg.body.slice(0, 4000);
      await TimelineAPI.createScene(
        seq.id,
        {
          sceneNumber: j + 1,
          title,
          description,
          orderIndex: j,
        },
        token
      );
    }
  }
}

async function persistBook(
  projectId: string,
  segments: ImportSegment[],
  token: string
): Promise<void> {
  const acts = await ensureThreeActs(projectId, token);
  const act = acts[0];
  if (!act?.id) throw new Error('Kein Akt für Buch-Import gefunden.');

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const seqNum = await nextSequenceNumber(projectId, act.id, token);
    const chapterTitle = seg.title.slice(0, 200);
    const seq = await TimelineAPI.createSequence(
      act.id,
      {
        sequenceNumber: seqNum,
        title: chapterTitle,
        description: `Import Kapitel ${i + 1}`,
      },
      token
    );

    const wc = wordCount(seg.body);
    const content = tiptapDocToContentString(seg.body);
    await TimelineAPI.createScene(
      seq.id,
      {
        sceneNumber: 1,
        title: 'Abschnitt 1',
        orderIndex: 0,
        content,
        wordCount: wc,
      },
      token
    );
  }
}

export async function persistImportedSegments(
  projectId: string,
  kind: ScriptProjectKind,
  segments: ImportSegment[],
  token: string
): Promise<ImportedTimelineData> {
  if (!segments.length) {
    throw new Error('Keine Segmente zum Importieren.');
  }

  if (kind === 'book') {
    await persistBook(projectId, segments, token);
  } else {
    await persistFilmLike(projectId, segments, token);
  }

  return reloadTimeline(projectId, token);
}
