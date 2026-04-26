/**
 * Hono context types for scriptony-script.
 */

import type { AuthUser } from "../../_shared/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
