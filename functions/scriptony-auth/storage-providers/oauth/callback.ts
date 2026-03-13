/**
 * GET /storage-providers/oauth/callback
 *
 * Receives the OAuth code from the provider, exchanges it for access/refresh tokens,
 * and redirects the user back to the frontend with tokens in the URL hash (client-only).
 */

import { getOptionalEnv } from "../../../_shared/env";
import { getAppBaseUrl, isRedirectUriAllowed } from "../../../_shared/oauth-redirect";
import {
  getQuery,
  sendBadRequest,
  sendMethodNotAllowed,
  sendRedirect,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

interface StatePayload {
  redirect_uri: string;
  provider: string;
}

function decodeState(state: string): StatePayload | null {
  try {
    const json = Buffer.from(state, "base64url").toString("utf8");
    return JSON.parse(json) as StatePayload;
  } catch {
    return null;
  }
}

async function exchangeGoogleDriveCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string }> {
  const clientId = getOptionalEnv("scriptony_oauth_google_drive_client_id");
  const clientSecret = getOptionalEnv("scriptony_oauth_google_drive_client_secret");
  if (!clientId || !clientSecret) throw new Error("Google Drive OAuth not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string };
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function exchangeDropboxCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string }> {
  const appKey = getOptionalEnv("scriptony_oauth_dropbox_app_key");
  const appSecret = getOptionalEnv("scriptony_oauth_dropbox_app_secret");
  if (!appKey || !appSecret) throw new Error("Dropbox OAuth not configured");

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${appKey}:${appSecret}`).toString("base64"),
    },
    body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dropbox token exchange failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string };
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

function sendErrorRedirect(res: ResponseLike, message: string): void {
  const base = getAppBaseUrl();
  if (!base) {
    sendServerError(res, new Error("App URL not configured"));
    return;
  }
  const redirectUri = `${base.replace(/\/+$/, "")}/settings?storage_oauth=error&error=${encodeURIComponent(message)}`;
  sendRedirect(res, 302, redirectUri);
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  const code = getQuery(req, "code");
  const state = getQuery(req, "state");
  const errorParam = getQuery(req, "error");

  if (errorParam) {
    const errorDesc = getQuery(req, "error_description") || errorParam;
    sendErrorRedirect(res, errorDesc);
    return;
  }

  if (!code || !state) {
    sendBadRequest(res, "Missing code or state");
    return;
  }

  const statePayload = decodeState(state);
  if (!statePayload?.redirect_uri) {
    sendBadRequest(res, "Invalid state");
    return;
  }

  if (!isRedirectUriAllowed(statePayload.redirect_uri)) {
    sendBadRequest(res, "Invalid state");
    return;
  }

  const callbackUrl = getOptionalEnv("scriptony_oauth_callback_url");
  if (!callbackUrl) {
    sendServerError(res, new Error("OAuth callback URL is not set"));
    return;
  }

  try {
    let tokens: { access_token: string; refresh_token?: string };
    switch (statePayload.provider) {
      case "google_drive":
        tokens = await exchangeGoogleDriveCode(code, callbackUrl);
        break;
      case "dropbox":
        tokens = await exchangeDropboxCode(code, callbackUrl);
        break;
      case "onedrive":
      case "kdrive":
        sendServerError(res, new Error(`OAuth for ${statePayload.provider} not implemented yet`));
        return;
      default:
        sendBadRequest(res, `Unknown provider: ${statePayload.provider}`);
        return;
    }

    const hash = new URLSearchParams({
      storage_oauth: "success",
      provider: statePayload.provider,
      access_token: tokens.access_token,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    }).toString();

    const targetUrl = statePayload.redirect_uri.includes("#")
      ? statePayload.redirect_uri + "&" + hash
      : statePayload.redirect_uri + "#" + hash;
    sendRedirect(res, 302, targetUrl);
  } catch (err) {
    console.error("[storage-providers/oauth/callback]", err);
    sendErrorRedirect(res, "Token exchange failed");
  }
}
