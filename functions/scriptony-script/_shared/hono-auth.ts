/**
 * Hono middleware for auth + project access.
 * Injects `user` into Hono context.
 */

import type { MiddlewareHandler } from "hono";
import { requireAuthenticatedUser } from "../../_shared/auth";
import "./types";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");
  const user = await requireAuthenticatedUser(authHeader);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
};
