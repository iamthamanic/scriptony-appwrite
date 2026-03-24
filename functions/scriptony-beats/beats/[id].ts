/**
 * Single-beat routes for the Scriptony beats service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { normalizeBeatInput } from "../../_shared/scriptony";

function mapBeatForClient(row: Record<string, any> | null): Record<string, any> | null {
  if (!row) return null;
  return {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    label: row.label ?? row.title ?? "",
    template_abbr: row.template_abbr ?? row.beat_type ?? null,
    description: row.description ?? row.content ?? null,
    from_container_id: row.from_container_id ?? row.parent_beat_id ?? null,
    to_container_id: row.to_container_id ?? null,
    pct_from: row.pct_from ?? 0,
    pct_to: row.pct_to ?? 0,
    color: row.color ?? null,
    notes: row.notes ?? null,
    order_index: row.order_index ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getBeat(beatId: string) {
  const data = await requestGraphql<{
    story_beats_by_pk: Record<string, any> | null;
  }>(
    `
      query GetBeat($beatId: uuid!) {
        story_beats_by_pk(id: $beatId) {
          id
          project_id
        }
      }
    `,
    { beatId }
  );

  return data.story_beats_by_pk;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const beatId = getParam(req, "id");
    if (!beatId) {
      sendBadRequest(res, "Beat ID is required");
      return;
    }

    const beat = await getBeat(beatId);
    if (!beat) {
      sendNotFound(res, "Beat not found");
      return;
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = normalizeBeatInput(body);

      const updated = await requestGraphql<{
        update_story_beats_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateBeat($beatId: uuid!, $changes: story_beats_set_input!) {
            update_story_beats_by_pk(pk_columns: { id: $beatId }, _set: $changes) {
              id
              project_id
              user_id
              title
              beat_type
              content
              parent_beat_id
              label
              template_abbr
              description
              from_container_id
              to_container_id
              pct_from
              pct_to
              color
              notes
              order_index
              created_at
              updated_at
            }
          }
        `,
        {
          beatId,
          changes: {
            ...(changes.label !== undefined ? { title: changes.label, label: changes.label } : {}),
            ...(changes.template_abbr !== undefined
              ? { beat_type: changes.template_abbr, template_abbr: changes.template_abbr }
              : {}),
            ...(changes.description !== undefined
              ? { content: changes.description, description: changes.description }
              : {}),
            ...(changes.from_container_id !== undefined
              ? { parent_beat_id: changes.from_container_id, from_container_id: changes.from_container_id }
              : {}),
            ...(changes.to_container_id !== undefined ? { to_container_id: changes.to_container_id } : {}),
            ...(changes.pct_from !== undefined ? { pct_from: changes.pct_from } : {}),
            ...(changes.pct_to !== undefined ? { pct_to: changes.pct_to } : {}),
            ...(changes.color !== undefined ? { color: changes.color } : {}),
            ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
            ...(changes.order_index !== undefined ? { order_index: changes.order_index } : {}),
          },
        }
      );

      sendJson(res, 200, { beat: mapBeatForClient(updated.update_story_beats_by_pk) });
      return;
    }

    if (req.method === "DELETE") {
      await requestGraphql(
        `
          mutation DeleteBeat($beatId: uuid!) {
            delete_story_beats_by_pk(id: $beatId) {
              id
            }
          }
        `,
        { beatId }
      );

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
