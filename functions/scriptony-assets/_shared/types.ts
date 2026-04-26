import type { AuthUser } from "../../_shared/auth";

export interface QueryValidationResult {
  projectId: string;
  user: AuthUser;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
