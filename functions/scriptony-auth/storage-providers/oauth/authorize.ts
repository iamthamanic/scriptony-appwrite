/**
 * GET /storage-providers/oauth/authorize
 *
 * Redirects the user to the storage provider's OAuth consent page.
 * Query: provider (google_drive | dropbox | onedrive | kdrive), redirect_uri (frontend URL to return to).
 */

import { getOptionalEnv } from "../../../_shared/env";
import { isRedirectUriAllowed } from "../../../_shared/oauth-redirect";
import {
  getQuery,
  sendBadRequest,
  sendMethodNotAllowed,
  sendRedirect,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

const PROVIDERS: Record<
  string,
  { authUrl: string; scope: string; clientIdEnv: string; extraParams?: Record<string, string> }
> = {
  google_drive: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "https://www.googleapis.com/auth/drive.file",
    clientIdEnv: "scriptony_oauth_google_drive_client_id",
    extraParams: { access_type: "offline", prompt: "consent" },
  },
  dropbox: {
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    scope: "",
    clientIdEnv: "scriptony_oauth_dropbox_app_key",
  },
  onedrive: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "https://graph.microsoft.com/Files.ReadWrite.AppFolder",
    clientIdEnv: "scriptony_oauth_onedrive_client_id",
    extraParams: { response_type: "code", response_mode: "query" },
  },
  kdrive: {
    authUrl: "https://api.infomaniak.com/oauth/authorize",
    scope: "drive",
    clientIdEnv: "scriptony_oauth_kdrive_client_id",
  },
};

function buildState(redirectUri: string, provider: string): string {
  return Buffer.from(JSON.stringify({ redirect_uri: redirectUri, provider }), "utf8").toString("base64url");
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  const provider = getQuery(req, "provider");
  const redirectUri = getQuery(req, "redirect_uri");

  if (!provider || !redirect_uri) {
    sendBadRequest(res, "Missing query: provider, redirect_uri");
    return;
  }

  if (!isRedirectUriAllowed(redirectUri)) {
    sendBadRequest(res, "redirect_uri not allowed");
    return;
  }

  const config = PROVIDERS[provider];
  if (!config) {
    sendBadRequest(res, `Unknown provider: ${provider}`);
    return;
  }

  const clientId = getOptionalEnv(config.clientIdEnv);
  if (!clientId) {
    sendServerError(res, new Error("OAuth not configured for this provider"));
    return;
  }

  try {
    const callbackUrl = getOptionalEnv("scriptony_oauth_callback_url");
    if (!callbackUrl) {
      sendServerError(res, new Error("OAuth callback URL is not set"));
      return;
    }

    const state = buildState(redirectUri, provider);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      state,
      ...(config.scope ? { scope: config.scope } : {}),
      ...(config.extraParams || {}),
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    sendRedirect(res, 302, authUrl);
  } catch (error) {
    sendServerError(res, error);
  }
}
