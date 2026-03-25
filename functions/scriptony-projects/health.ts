/**
 * Health endpoint for the projects service.
 */

import { requestGraphql } from "../_shared/graphql-compat";
import { getAppwriteEndpoint, getPublicAppwriteEndpoint } from "../_shared/env";
import { sendJson, sendMethodNotAllowed, sendServerError, type RequestLike, type ResponseLike } from "../_shared/http";

const HEALTH_DB_TIMEOUT_MS = 8000;

function elapsedMs(start: number): number {
  return Date.now() - start;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  const startedAt = Date.now();
  console.log("[projects/health] start", {
    path: req.path || req.url || "/health",
    timeoutMs: HEALTH_DB_TIMEOUT_MS,
  });

  try {
    const graphqlStartedAt = Date.now();
    const result = await withTimeout(
      requestGraphql<{ projects_aggregate: { aggregate: { count: number } } }>(
      `
        query ProjectsHealthcheck {
          projects_aggregate {
            aggregate {
              count
            }
          }
        }
      `
      ),
      HEALTH_DB_TIMEOUT_MS,
      "ProjectsHealthcheck query"
    );

    console.log("[projects/health] graphql complete", {
      elapsedMs: elapsedMs(graphqlStartedAt),
      projectCount: result.projects_aggregate.aggregate.count,
    });

    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-projects",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
      _debug: {
        internalEndpoint: getAppwriteEndpoint(),
        publicEndpoint: getPublicAppwriteEndpoint(),
        envAppwriteEndpoint: process.env.APPWRITE_ENDPOINT || "(not set)",
        envFunctionEndpoint: process.env.APPWRITE_FUNCTION_ENDPOINT || "(not set)",
      },
    });
    console.log("[projects/health] success", { elapsedMs: elapsedMs(startedAt) });
  } catch (error) {
    console.error("[projects/health] failure", {
      elapsedMs: elapsedMs(startedAt),
      message: error instanceof Error ? error.message : String(error),
    });
    sendServerError(res, error);
  }
}
