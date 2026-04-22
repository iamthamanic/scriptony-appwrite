/**
 * Compatibility wrapper for legacy image imports.
 * Image auth now resolves through the central shared auth library.
 */

import { requireAuthenticatedUser } from "./auth";

export type { AuthSource, AuthUser } from "./auth";

export async function requireImageFunctionUser(
  authSource?: import("./auth").AuthSource,
) {
  return requireAuthenticatedUser(authSource);
}
