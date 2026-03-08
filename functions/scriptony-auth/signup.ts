/**
 * Legacy-compatible signup endpoint backed by Nhost Auth.
 *
 * This preserves the old `/signup` route while the frontend moves to the
 * direct Nhost SDK signup flow.
 */

import { ensureUserBootstrap, getUserFromToken } from "../_shared/auth";
import { getAuthBaseUrl } from "../_shared/env";
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

    const signupResponse = await fetch(`${getAuthBaseUrl()}/signup/email-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        options: {
          displayName: body.name || body.email.split("@")[0],
          allowedRoles: ["user"],
          defaultRole: "user",
          metadata: {
            name: body.name || body.email.split("@")[0],
            role: "user",
          },
        },
      }),
    });

    const signupPayload = await signupResponse.json().catch(() => ({}));
    if (!signupResponse.ok) {
      sendJson(res, signupResponse.status, {
        error:
          signupPayload.message ||
          signupPayload.error ||
          "Signup failed",
      });
      return;
    }

    const accessToken = signupPayload.session?.accessToken;
    if (accessToken) {
      const user = await getUserFromToken(accessToken);
      if (user) {
        await ensureUserBootstrap(user);
      }
    }

    sendJson(res, 200, {
      success: true,
      message: "User created successfully",
      session: signupPayload.session || null,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
