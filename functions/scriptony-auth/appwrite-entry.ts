import { createAppwriteHandler, getPathname, sendRouteNotFound, withParams } from "../_shared/appwrite-handler";
import rootHandler from "./index";
import healthHandler from "./health";
import signupHandler from "./signup";
import createDemoUserHandler from "./create-demo-user";
import profileHandler from "./profile";
import organizationsHandler from "./organizations/index";
import organizationByIdHandler from "./organizations/[id]";
import integrationTokensHandler from "./integration-tokens/index";
import integrationTokenByIdHandler from "./integration-tokens/[id]";
import storageUploadHandler from "./storage/upload";
import storageUsageHandler from "./storage/usage";
import storageOAuthAuthorizeHandler from "./storage-providers/oauth/authorize";
import storageOAuthCallbackHandler from "./storage-providers/oauth/callback";
import type { RequestLike, ResponseLike } from "../_shared/http";

async function dispatch(req: RequestLike, res: ResponseLike) {
  const pathname = getPathname(req);

  if (pathname === "/") {
    await rootHandler(req, res);
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
  if (pathname === "/create-demo-user") {
    await createDemoUserHandler(req, res);
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
  const organizationByIdMatch = pathname.match(/^\/organizations\/([^/]+)$/);
  if (organizationByIdMatch) {
    await organizationByIdHandler(withParams(req, { id: organizationByIdMatch[1] }), res);
    return;
  }
  if (pathname === "/integration-tokens") {
    await integrationTokensHandler(req, res);
    return;
  }
  const tokenByIdMatch = pathname.match(/^\/integration-tokens\/([^/]+)$/);
  if (tokenByIdMatch) {
    await integrationTokenByIdHandler(withParams(req, { id: tokenByIdMatch[1] }), res);
    return;
  }
  if (pathname === "/storage/upload") {
    await storageUploadHandler(req, res);
    return;
  }
  if (pathname === "/storage/usage") {
    await storageUsageHandler(req, res);
    return;
  }
  if (pathname === "/storage-providers/oauth/authorize") {
    await storageOAuthAuthorizeHandler(req, res);
    return;
  }
  if (pathname === "/storage-providers/oauth/callback") {
    await storageOAuthCallbackHandler(req, res);
    return;
  }

  sendRouteNotFound("scriptony-auth", req, res);
}

export default createAppwriteHandler(dispatch);
