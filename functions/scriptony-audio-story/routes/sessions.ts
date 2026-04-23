/**
 * Recording Sessions Routes
 * Node.js Handler für Audio Sessions
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  getQuery,
  getParam,
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendServerError,
  sendMethodNotAllowed,
  sendNotFound,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";

async function listSessions(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
  if (!sceneId) {
    sendBadRequest(res, "sceneId is required");
    return;
  }

  try {
    const data = await requestGraphql<{
      audio_sessions: Array<Record<string, unknown>>;
    }>(
      `
      query GetAudioSessions($sceneId: uuid!) {
        audio_sessions(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { created_at: desc }
        ) {
          id
          scene_id
          title
          status
          started_at
          ended_at
          recording_file_id
          recording_duration
          created_at
          updated_at
        }
      }
    `,
      { sceneId },
    );

    sendJson(res, 200, { sessions: data.audio_sessions });
  } catch (error) {
    console.error("[Audio Story] Error fetching sessions:", error);
    sendServerError(res, error);
  }
}

async function createSession(req: RequestLike, res: ResponseLike): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<Record<string, unknown>>(req);
  const { sceneId, title } = body;

  if (!sceneId || !title) {
    sendBadRequest(res, "sceneId and title are required");
    return;
  }

  try {
    const data = await requestGraphql<{
      insert_audio_sessions_one: Record<string, unknown>;
    }>(
      `
      mutation CreateAudioSession($object: audio_sessions_insert_input!) {
        insert_audio_sessions_one(object: $object) {
          id
          scene_id
          title
          status
          created_at
          updated_at
        }
      }
    `,
      {
        object: {
          scene_id: sceneId,
          title,
          created_by: bootstrap.user.id,
          status: "preparing",
        },
      },
    );

    sendJson(res, 201, { session: data.insert_audio_sessions_one });
  } catch (error) {
    console.error("[Audio Story] Error creating session:", error);
    sendServerError(res, error);
  }
}

async function getSession(req: RequestLike, res: ResponseLike, sessionId: string): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  try {
    const data = await requestGraphql<{
      audio_sessions_by_pk: Record<string, unknown> | null;
    }>(
      `
      query GetAudioSession($id: uuid!) {
        audio_sessions_by_pk(id: $id) {
          id
          scene_id
          title
          description
          status
          started_at
          ended_at
          recording_file_id
          recording_duration
          created_at
          updated_at
        }
      }
    `,
      { id: sessionId },
    );

    if (!data.audio_sessions_by_pk) {
      sendNotFound(res, "Session not found");
      return;
    }

    sendJson(res, 200, { session: data.audio_sessions_by_pk });
  } catch (error) {
    console.error("[Audio Story] Error fetching session:", error);
    sendServerError(res, error);
  }
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = (req.path || req.url || "/") as string;

  // GET /sessions?sceneId=xxx
  if (req.method === "GET" && !pathname.match(/sessions\/[\w-]+/)) {
    await listSessions(req, res);
    return;
  }

  // POST /sessions
  if (req.method === "POST") {
    await createSession(req, res);
    return;
  }

  // GET /sessions/:id
  const sessionMatch = pathname.match(/^\/sessions\/([\w-]+)$/);
  if (sessionMatch && req.method === "GET") {
    await getSession(req, res, sessionMatch[1]);
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
}
