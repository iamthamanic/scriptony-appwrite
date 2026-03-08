/**
 * Demo-user bootstrap endpoint for local testing.
 *
 * This preserves the old helper used by the app's debug and seed utilities.
 */

import { getDemoUserCredentials } from "../_shared/env";
import { ensureUserBootstrap, getUserFromToken } from "../_shared/auth";
import { getAuthBaseUrl } from "../_shared/env";
import { sendJson, sendMethodNotAllowed, sendServerError, type RequestLike, type ResponseLike } from "../_shared/http";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const credentials = getDemoUserCredentials();
    const signupResponse = await fetch(`${getAuthBaseUrl()}/signup/email-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        options: {
          displayName: credentials.displayName,
          allowedRoles: ["user"],
          defaultRole: "user",
          metadata: {
            name: credentials.displayName,
            role: "user",
          },
        },
      }),
    });

    const signupPayload = await signupResponse.json().catch(() => ({}));
    if (!signupResponse.ok && signupResponse.status !== 409) {
      sendJson(res, signupResponse.status, {
        error: signupPayload.message || signupPayload.error || "Demo signup failed",
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
      email: credentials.email,
      password: credentials.password,
      message: "Demo signup requested",
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
