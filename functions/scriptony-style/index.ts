/**
 * Appwrite function entrypoint: scriptony-style.
 *
 * Puppet-Layer style profile CRUD backed by Appwrite collection `styleProfiles`.
 */

import { requireUserBootstrap } from "../_shared/auth";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { getAccessibleProject, getUserOrganizationIds } from "../_shared/scriptony";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";
import {
  applyStyleProfileBodySchema,
  createStyleProfileBodySchema,
  normalizeApplyStyleProfileBody,
  normalizeStyleProfileCreateBody,
  normalizeStyleProfileUpdateBody,
  updateStyleProfileBodySchema,
} from "../_shared/style-profile-schema";
import {
  applyStyleProfileToShot,
  createStyleProfile,
  getStyleShotById,
  getStyleProfileById,
  listStyleProfilesForProject,
  listStyleProfilesForUser,
  removeStyleProfile,
  resolveShotStyleProfile,
  styleProfileRowToApi,
  updateStyleProfile,
  userCanAccessShotStyle,
  userCanAccessStyleProfile,
} from "./style-service";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) || (typeof req?.url === "string" && req.url) || "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) return new URL(direct).pathname || "/";
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function getQueryParam(req: RequestLike, key: string): string {
  const fromQuery = req?.query?.[key];
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  try {
    const raw = typeof req?.url === "string" ? req.url : "";
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, "http://local");
    return url.searchParams.get(key)?.trim() || "";
  } catch {
    return "";
  }
}

function isClientInputError(error: unknown): boolean {
  return error instanceof Error && /config exceeds/i.test(error.message);
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const pathname = getPathname(req);

    if (pathname === "/" || pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "scriptony-style",
        provider: "appwrite",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }
    const userId = bootstrap.user.id;
    const organizationIds = await getUserOrganizationIds(userId);

    if (pathname === "/ai/style/profiles") {
      if (req.method === "GET") {
        const projectId = getQueryParam(req, "projectId");
        if (projectId) {
          const project = await getAccessibleProject(projectId, userId, organizationIds);
          if (!project) {
            sendNotFound(res, "Project not found");
            return;
          }
          sendJson(res, 200, { profiles: await listStyleProfilesForProject(projectId) });
          return;
        }
        sendJson(res, 200, { profiles: await listStyleProfilesForUser(userId) });
        return;
      }

      if (req.method === "POST") {
        const body = normalizeStyleProfileCreateBody(
          createStyleProfileBodySchema.parse(await readJsonBody(req))
        );
        if (body.projectId) {
          const project = await getAccessibleProject(body.projectId, userId, organizationIds);
          if (!project) {
            sendNotFound(res, "Project not found");
            return;
          }
        }
        try {
          const profile = await createStyleProfile({
            userId,
            name: body.name,
            projectId: body.projectId,
            previewImageId: body.previewImageId,
            config: body.config,
          });
          sendJson(res, 201, { profile });
        } catch (error) {
          if (isClientInputError(error)) {
            sendBadRequest(res, error.message);
            return;
          }
          throw error;
        }
        return;
      }

      sendMethodNotAllowed(res, ["GET", "POST"]);
      return;
    }

    if (pathname === "/ai/style/apply") {
      if (req.method !== "POST") {
        sendMethodNotAllowed(res, ["POST"]);
        return;
      }

      const body = normalizeApplyStyleProfileBody(
        applyStyleProfileBodySchema.parse(await readJsonBody(req))
      );
      const shotRow = await getStyleShotById(body.shotId);
      if (!shotRow) {
        sendNotFound(res, "Shot not found");
        return;
      }
      if (!(await userCanAccessShotStyle(shotRow, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }

      let profileRow = null;
      if (body.styleProfileId) {
        profileRow = await getStyleProfileById(body.styleProfileId);
        if (!profileRow) {
          sendNotFound(res, "Style profile not found");
          return;
        }
        if (!(await userCanAccessStyleProfile(profileRow, userId, organizationIds))) {
          sendNotFound(res, "Style profile not found");
          return;
        }
        const profileProjectId =
          typeof profileRow.projectId === "string" && profileRow.projectId.trim()
            ? profileRow.projectId.trim()
            : null;
        const shotProjectId =
          typeof shotRow.project_id === "string" && shotRow.project_id.trim()
            ? shotRow.project_id.trim()
            : null;
        if (profileProjectId && shotProjectId && profileProjectId !== shotProjectId) {
          sendBadRequest(res, "Style profile belongs to a different project");
          return;
        }
      }

      const assignment = await applyStyleProfileToShot(shotRow, profileRow);
      sendJson(res, 200, assignment);
      return;
    }

    const shotProfileMatch = pathname.match(/^\/ai\/style\/shot\/([^/]+)\/profile$/);
    if (shotProfileMatch) {
      const shotId = shotProfileMatch[1];
      const shotRow = await getStyleShotById(shotId);
      if (!shotRow) {
        sendNotFound(res, "Shot not found");
        return;
      }
      if (!(await userCanAccessShotStyle(shotRow, userId, organizationIds))) {
        sendNotFound(res, "Shot not found");
        return;
      }
      sendJson(res, 200, await resolveShotStyleProfile(shotRow, userId, organizationIds));
      return;
    }

    const profileMatch = pathname.match(/^\/ai\/style\/profiles\/([^/]+)$/);
    if (profileMatch) {
      const profileId = profileMatch[1];
      const row = await getStyleProfileById(profileId);
      if (!row) {
        sendNotFound(res, "Style profile not found");
        return;
      }
      if (!(await userCanAccessStyleProfile(row, userId, organizationIds))) {
        sendNotFound(res, "Style profile not found");
        return;
      }

      if (req.method === "GET") {
        sendJson(res, 200, { profile: styleProfileRowToApi(row) });
        return;
      }

      if (req.method === "PUT") {
        const body = normalizeStyleProfileUpdateBody(
          updateStyleProfileBodySchema.parse(await readJsonBody(req))
        );
        const hasUpdate =
          body.name !== undefined ||
          body.projectId !== undefined ||
          body.previewImageId !== undefined ||
          body.config !== undefined;
        if (!hasUpdate) {
          sendBadRequest(res, "No fields to update");
          return;
        }
        if (body.projectId) {
          const project = await getAccessibleProject(body.projectId, userId, organizationIds);
          if (!project) {
            sendNotFound(res, "Project not found");
            return;
          }
        }
        try {
          const profile = await updateStyleProfile(row, {
            name: body.name,
            projectId: body.projectId,
            previewImageId: body.previewImageId,
            config: body.config,
          });
          sendJson(res, 200, { profile });
        } catch (error) {
          if (isClientInputError(error)) {
            sendBadRequest(res, error.message);
            return;
          }
          throw error;
        }
        return;
      }

      if (req.method === "DELETE") {
        await removeStyleProfile(profileId);
        sendJson(res, 200, { success: true, id: profileId });
        return;
      }

      sendMethodNotAllowed(res, ["GET", "PUT", "DELETE"]);
      return;
    }

    sendNotFound(res, `Route not found in scriptony-style: ${pathname}`);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      sendBadRequest(res, "Invalid request body");
      return;
    }
    sendServerError(res, error);
  }
}

export default createAppwriteHandler(dispatch);
