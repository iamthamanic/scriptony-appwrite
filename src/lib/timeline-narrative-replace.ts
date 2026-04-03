/**
 * Entfernt die gesamte materialisierte Film-/Buch-Timeline für ein Projekt,
 * damit eine neue Narrativ-Struktur ohne alte Acts/Sequenzen/Szenen/Shots angelegt werden kann.
 */

import * as TimelineAPIV2 from './api/timeline-api-v2';
import * as ShotsAPI from './api/shots-api';
import * as ClipsAPI from './api/clips-api';

export async function wipeProjectTimelineForNarrativeReplace(
  projectId: string,
  accessToken: string
): Promise<void> {
  const [clips, shots] = await Promise.all([
    ClipsAPI.listClipsByProject(projectId, accessToken).catch(() => []),
    ShotsAPI.getAllShotsByProject(projectId, accessToken).catch(() => []),
  ]);

  for (const c of clips) {
    await ClipsAPI.deleteClip(c.id, accessToken).catch(() => undefined);
  }
  for (const s of shots) {
    await ShotsAPI.deleteShot(s.id, accessToken).catch(() => undefined);
  }

  const nodes = await TimelineAPIV2.getAllProjectNodes(projectId);
  const sorted = [...nodes].sort((a, b) => b.level - a.level);
  for (const n of sorted) {
    await TimelineAPIV2.deleteNode(n.id);
  }
}
