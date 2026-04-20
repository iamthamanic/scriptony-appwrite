/**
 * Beat collection routes for the Scriptony beats service.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  getQuery,
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import { normalizeBeatInput, requireProjectAccess } from "../../_shared/scriptony";

function mapBeatForClient(row: Record<string, any>): Record<string, any> {
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

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const projectId = getQuery(req, "project_id") ||
        getQuery(req, "projectId");
      if (!projectId) {
        sendBadRequest(res, "project_id is required");
        return;
      }

      const _project = await requireProjectAccess(projectId, bootstrap.user.id, res);
      if (!_project) return;

      const data = await requestGraphql<{
        story_beats: Array<Record<string, any>>;
      }>(
        `
          query GetStoryBeats($projectId: uuid!) {
            story_beats(
              where: { project_id: { _eq: $projectId } }
              order_by: [{ order_index: asc }, { created_at: asc }]
            ) {
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
        { projectId },
      );

      sendJson(res, 200, { beats: data.story_beats.map(mapBeatForClient) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const projectId = body.project_id ?? body.projectId;
      const beatInput = normalizeBeatInput(body);

      if (!projectId || !beatInput.label) {
        sendBadRequest(res, "Missing required fields: project_id, label");
        return;
      }

      const _project = await requireProjectAccess(projectId, bootstrap.user.id, res);
      if (!_project) return;

      const created = await requestGraphql<{
        insert_story_beats_one: Record<string, any>;
      }>(
        `
          mutation CreateBeat($object: story_beats_insert_input!) {
            insert_story_beats_one(object: $object) {
              id
              project_id
              user_id
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
          object: {
            // Write both canonical and legacy fields for compatibility across UI/API paths.
            title: beatInput.label,
            beat_type: beatInput.template_abbr ?? null,
            content: beatInput.description ?? null,
            parent_beat_id: beatInput.from_container_id ?? null,
            label: beatInput.label,
            template_abbr: beatInput.template_abbr ?? null,
            description: beatInput.description ?? null,
            from_container_id: beatInput.from_container_id ?? null,
            to_container_id: beatInput.to_container_id ?? null,
            pct_from: beatInput.pct_from ?? 0,
            pct_to: beatInput.pct_to ?? 0,
            color: beatInput.color ?? null,
            notes: beatInput.notes ?? null,
            order_index: beatInput.order_index ?? 0,
            project_id: projectId,
            user_id: bootstrap.user.id,
          },
        },
      );

      sendJson(res, 201, {
        beat: mapBeatForClient(created.insert_story_beats_one),
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
