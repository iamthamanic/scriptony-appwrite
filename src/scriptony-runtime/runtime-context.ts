/**
 * Execution context for scriptony-runtime (orchestrator, tool loop).
 * Host fills transport-specific fields; capabilities receive McpToolContext subset.
 */

import type { ScriptonyMcpInfra } from "../scriptony-mcp/types/infra";
import type { McpToolContext } from "../scriptony-mcp/types/tool";

export interface RuntimeUser {
  id: string;
  email?: string;
  displayName?: string;
}

export interface RuntimeContext {
  user: RuntimeUser;
  organizationId: string;
  projectId?: string;
  /** Optional LLM routing hints — filled when invoking through assistant flows later. */
  providerHint?: string;
  modelHint?: string;
  infra: ScriptonyMcpInfra;
  /** Per-request id for logs/metrics. */
  requestId?: string;
  requestPath?: string;
  clientMeta?: Record<string, unknown>;
}

export function toMcpToolContext(ctx: RuntimeContext): McpToolContext {
  return {
    userId: ctx.user.id,
    organizationId: ctx.organizationId,
    projectId: ctx.projectId,
    infra: ctx.infra,
    requestId: ctx.requestId,
  };
}
