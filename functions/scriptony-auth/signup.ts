/**
 * Legacy-compatible signup HTTP route (Appwrite-backed data layer).
 *
 * The SPA typically signs up via the Appwrite Web SDK; this route remains for
 * older clients that POST to `/signup`.
 */

import { ensureUserBootstrap } from "../_shared/auth";
import {
  createEmailPasswordUser,
  createJwtSessionForUser,
  isAppwriteConflictError,
  toAuthUser,
} from "../_shared/appwrite-users";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const body = await readJsonBody<{ email?: string; password?: string; name?: string }>(req);
    if (!body.email || !body.password) {
      sendBadRequest(res, "Email and password are required");
      return;
    }

    const displayName = body.name || body.email.split("@")[0];

    let createdUser;
    try {
      createdUser = await createEmailPasswordUser({
        email: body.email,
        password: body.password,
        name: displayName,
      });
    } catch (error) {
      if (isAppwriteConflictError(error)) {
        sendJson(res, 409, { error: "User already exists" });
        return;
      }
      throw error;
    }

    await ensureUserBootstrap(toAuthUser(createdUser));
    const session = await createJwtSessionForUser(createdUser.$id);

    sendJson(res, 200, {
      success: true,
      message: "User created successfully",
      session,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
