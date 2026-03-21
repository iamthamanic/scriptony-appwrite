/**
 * Project initialization route for the Scriptony HTTP API.
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { mapNode } from "../../_shared/timeline";

interface PredefinedNodeInput {
  number: number;
  title: string;
  description?: string;
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
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

    const levelOneCount = Number(structure.level_1_count ?? predefinedLevelOne.length ?? 0);
    if (levelOneCount <= 0) {
      sendBadRequest(res, "structure.level_1_count must be greater than zero");
      return;
    }

    const objects = Array.from({ length: levelOneCount }, (_, index) => {
      const predefined = predefinedLevelOne[index];
      return {
        project_id: projectId,
        template_id: templateId,
        level: 1,
        parent_id: null,
        node_number: predefined?.number ?? index + 1,
        title: predefined?.title ?? `Act ${index + 1}`,
        description: predefined?.description ?? null,
        color: null,
        order_index: index,
        metadata: {},
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
        }
      `,
      { objects }
    );

    sendJson(res, 201, { nodes: created.insert_timeline_nodes.returning.map(mapNode) });
  } catch (error) {
    sendServerError(res, error);
  }
}
