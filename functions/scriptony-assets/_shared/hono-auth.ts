import { createHonoAppwriteHandler } from "../../_shared/hono-appwrite-handler";
import { requireAuthenticatedUser } from "../../_shared/auth";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export async function authMiddleware(c: Context, next: Next) {
  const req = c.req.raw;
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  c.set("user", user);
  await next();
}

export function createAppwriteHandler(app: {
  fetch: (request: Request) => Promise<Response> | Response;
}) {
  return createHonoAppwriteHandler(app);
}
