/**
 * Builds a bounded text context from Scriptony projects / worlds / characters for assistant chat.
 * Location: functions/_shared/rag-chat-context.ts
 */

import { requestGraphql } from "./graphql-compat";
import { getCharacterById } from "./timeline";
import { getAccessibleProject, getUserOrganizationIds } from "./scriptony";

const MAX_TOTAL_CHARS = 12_000;
const MAX_BEATS_PER_PROJECT = 24;
const MAX_BEAT_BODY_CHARS = 220;

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Normalize client-supplied id arrays: non-empty strings, deduped. */
export function normalizeRagIdList(raw: unknown): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const id = typeof x === "string" ? x.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function fetchStoryBeats(projectId: string): Promise<
  Array<{
    label?: string | null;
    title?: string | null;
    content?: string | null;
    description?: string | null;
    notes?: string | null;
    order_index?: number | null;
  }>
> {
  const data = await requestGraphql<{
    story_beats: Array<Record<string, unknown>>;
  }>(
    `
      query RagStoryBeats($projectId: uuid!) {
        story_beats(
          where: { project_id: { _eq: $projectId } }
          order_by: [{ order_index: asc }, { created_at: asc }]
        ) {
          label
          title
          content
          description
          notes
          order_index
        }
      }
    `,
    { projectId }
  );
  return data.story_beats || [];
}

async function fetchWorld(worldId: string, organizationId: string): Promise<Record<string, unknown> | null> {
  const data = await requestGraphql<{
    worlds: Array<Record<string, unknown>>;
  }>(
    `
      query RagWorld($worldId: uuid!, $organizationId: uuid!) {
        worlds(
          where: {
            id: { _eq: $worldId }
            organization_id: { _eq: $organizationId }
          }
          limit: 1
        ) {
          id
          name
          description
        }
      }
    `,
    { worldId, organizationId }
  );
  return (data.worlds[0] as Record<string, unknown>) || null;
}

/** Timeline/project characters (same IDs as RAG UI), with project/world access checks. */
async function fetchAccessibleTimelineCharacter(
  characterId: string,
  userId: string,
  organizationId: string,
  orgIds: string[]
): Promise<Record<string, unknown> | null> {
  const ch = await getCharacterById(characterId);
  if (!ch) return null;
  const pid = typeof ch.project_id === "string" ? ch.project_id : "";
  const wid = typeof ch.world_id === "string" ? ch.world_id : "";
  if (pid) {
    const p = await getAccessibleProject(pid, userId, orgIds);
    if (!p || p.is_deleted === true) return null;
    return ch as Record<string, unknown>;
  }
  if (wid) {
    const w = await fetchWorld(wid, organizationId);
    if (!w) return null;
    return ch as Record<string, unknown>;
  }
  return null;
}

export type BuildRagChatContextParams = {
  userId: string;
  organizationId: string;
  projectIds: string[];
  worldIds: string[];
  characterIds: string[];
};

/**
 * Loads accessible project/world/character data and returns a single markdown-ish block for the system prompt.
 */
export async function buildRagChatContext(params: BuildRagChatContextParams): Promise<string> {
  const orgIds = await getUserOrganizationIds(params.userId);
  const sections: string[] = [];

  for (const projectId of params.projectIds) {
    const project = await getAccessibleProject(projectId, params.userId, orgIds);
    if (!project || project.is_deleted === true) continue;

    const beats = await fetchStoryBeats(projectId);
    const seenBeatSignatures = new Set<string>();
    const beatLines = beats
      .map((b) => {
        const label = safeStr(b.label || b.title) || "Beat";
        const body = truncate(
          [safeStr(b.content), safeStr(b.description), safeStr(b.notes)].filter(Boolean).join(" "),
          MAX_BEAT_BODY_CHARS
        );
        const sig = `${label}::${body}`;
        if (seenBeatSignatures.has(sig)) return "";
        seenBeatSignatures.add(sig);
        return body ? `- **${label}:** ${body}` : `- **${label}**`;
      })
      .filter(Boolean)
      .slice(0, MAX_BEATS_PER_PROJECT)
      .join("\n");

    const concept = safeStr(project.concept_blocks);
    const header = [
      `## Projekt: ${safeStr(project.title) || projectId}`,
      project.type ? `- Typ: ${safeStr(project.type)}` : "",
      project.logline ? `- Logline: ${safeStr(project.logline)}` : "",
      project.genre ? `- Genre: ${safeStr(project.genre)}` : "",
      concept ? `- Konzept (Auszug): ${truncate(concept, 4000)}` : "",
      beatLines ? `### Story-Beats\n${beatLines}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    sections.push(header);
  }

  for (const worldId of params.worldIds) {
    const world = await fetchWorld(worldId, params.organizationId);
    if (!world) continue;
    const name = safeStr(world.name) || worldId;
    const desc = safeStr(world.description);
    sections.push(
      [`## Welt: ${name}`, desc ? desc : ""].filter(Boolean).join("\n\n")
    );
  }

  for (const characterId of params.characterIds) {
    const ch = await fetchAccessibleTimelineCharacter(characterId, params.userId, params.organizationId, orgIds);
    if (!ch) continue;
    const name = safeStr(ch.name) || characterId;
    const bits = [
      safeStr(ch.description),
      safeStr(ch.personality),
      safeStr(ch.backstory),
    ].filter(Boolean);
    sections.push(`### Charakter: ${name}\n${bits.join("\n\n")}`);
  }

  const combined = sections.join("\n\n---\n\n");
  return truncate(combined, MAX_TOTAL_CHARS);
}
