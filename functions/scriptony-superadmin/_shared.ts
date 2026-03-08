/**
 * Shared helpers for superadmin compatibility routes.
 */

import { requireUserBootstrap } from "../_shared/auth";
import {
  sendForbidden,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";

export async function requireSuperadmin(req: RequestLike, res: ResponseLike) {
  const bootstrap = await requireUserBootstrap(req.headers.authorization);
  if (!bootstrap) {
    sendUnauthorized(res);
    return null;
  }

  const role =
    (typeof bootstrap.user.metadata?.role === "string" && bootstrap.user.metadata.role) ||
    bootstrap.user.defaultRole ||
    "user";

  if (role !== "superadmin") {
    sendForbidden(res, "Superadmin access required");
    return null;
  }

  return bootstrap;
}
