/**
 * Appwrite function entrypoint for the auth service.
 */

import healthRootHandler from "./health-root";
import healthHandler from "./health";
import signupHandler from "./signup";
import profileHandler from "./profile";
import organizationsHandler from "./organizations/index";
import organizationByIdHandler from "./organizations/[id]";
import integrationTokensHandler from "./integration-tokens/index";
import integrationTokenByIdHandler from "./integration-tokens/[id]";
import {
  type RequestLike,
  type ResponseLike,
  sendNotFound,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return new URL(direct).pathname || "/";
    }
  } catch {
    /* fallback */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

function withParams(
  req: RequestLike,
  params: Record<string, string>,
): RequestLike {
  req.params = { ...(req.params || {}), ...params };
  return req;
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/") {
    await healthRootHandler(req, res);
    return;
  }

  if (pathname === "/health") {
    await healthHandler(req, res);
    return;
  }

  if (pathname === "/signup") {
    await signupHandler(req, res);
    return;
  }

  if (pathname === "/profile") {
    await profileHandler(req, res);
    return;
  }

  if (pathname === "/organizations") {
    await organizationsHandler(req, res);
    return;
  }

  const orgByIdMatch = pathname.match(/^\/organizations\/([^/]+)$/);
  if (orgByIdMatch) {
    await organizationByIdHandler(
      withParams(req, { id: orgByIdMatch[1] }),
      res,
    );
    return;
  }

  if (pathname === "/integration-tokens") {
    await integrationTokensHandler(req, res);
    return;
  }

  const tokenByIdMatch = pathname.match(/^\/integration-tokens\/([^/]+)$/);
  if (tokenByIdMatch) {
    await integrationTokenByIdHandler(
      withParams(req, { id: tokenByIdMatch[1] }),
      res,
    );
    return;
  }

  sendNotFound(res, `Route not found in scriptony-auth: ${pathname}`);
}

export default createAppwriteHandler(dispatch);
