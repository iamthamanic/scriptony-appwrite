/**
 * Get Auth Token Helper
 *
 * Central function to retrieve the current user's access token.
 * This is the ONLY function that should be used in the frontend for getting tokens.
 *
 * Usage:
 *   import { getAuthToken } from '@/lib/auth/getAuthToken';
 *   const token = await getAuthToken();
 *   // Use token in Authorization header
 */

import { getAuthClient } from "./getAuthClient";

/**
 * Get the current user's access token
 *
 * @returns Access token string or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  const session = await getAuthClient().getSession();
  const t = session?.accessToken;
  if (typeof t !== "string" || !t.trim()) return null;
  return t.trim();
}
