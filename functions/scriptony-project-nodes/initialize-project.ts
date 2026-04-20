/**
 * Project initialization route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../_shared/auth";
import { requestGraphql } from "../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import { getTimelineNodes, mapNode } from "../_shared/timeline";

interface PredefinedNodeInput {
  number: number;
  title: string;
  description?: string;
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

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<Record<string, any>>(req);
    const projectId = body.project_id ?? body.projectId;
    const templateId = body.template_id ?? body.templateId;
    const structure = body.structure ?? {};
    const predefinedLevelOne = (body.predefinedNodes?.level_1 ??
      body.predefined_nodes?.level_1 ??
      []) as PredefinedNodeInput[];

    if (!projectId || !templateId) {
      sendBadRequest(res, "project_id and template_id are required");
      return;
    }

    const levelOneCount = Number(
      structure.level_1_count ?? predefinedLevelOne.length ?? 0,
    );
    if (levelOneCount <= 0) {
      sendBadRequest(res, "structure.level_1_count must be greater than zero");
      return;
    }

    // Idempotent: same template already has level-1 acts → return them (no second insert).
    // Prevents duplicate acts when clients retry or race after the first batch committed.
    const existingLevel1 = await getTimelineNodes({
      projectId,
      level: 1,
      parentId: null,
    });
    const sameTemplate = existingLevel1.filter(
      (n) => String(n.template_id ?? n.templateId ?? "") === String(templateId),
    );
    if (sameTemplate.length > 0) {
      const sorted = [...sameTemplate].sort(
        (a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0),
      );
      sendJson(res, 200, { nodes: sorted.map(mapNode) });
      return;
    }

    const objects = Array.from({ length: levelOneCount }, (_, index) => {
      const predefined = predefinedLevelOne[index];
      return {
        project_id: projectId,
        template_id: templateId,
        level: 1,
        parent_id: null,
        title: predefined?.title ?? `Act ${index + 1}`,
        summary: predefined?.description ?? null,
        order_index: index,
        metadata_json: JSON.stringify({}),
      };
    });

    const created = await requestGraphql<{
      insert_timeline_nodes: { returning: Array<Record<string, any>> };
    }>(
      `
        mutation InitializeTimelineProject($objects: [timeline_nodes_insert_input!]!) {
          insert_timeline_nodes(objects: $objects) {
            returning {
              id
              project_id
              template_id
              level
              parent_id
              title
              summary
              order_index
              node_type
              scene_id
              metadata_json
              created_at
              updated_at
            }
          }
        }
      `,
      { objects },
    );

    sendJson(res, 201, {
      nodes: created.insert_timeline_nodes.returning.map(mapNode),
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
