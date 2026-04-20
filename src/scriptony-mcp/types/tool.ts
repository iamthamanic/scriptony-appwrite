/**
 * Canonical internal tool contract (MCP-style capability, in-process).
 */

import type {
  ToolPolicyCategory,
  ToolRiskLevel,
} from "../policies/tool-policy";
import type { ToolResult } from "../results/envelope";
import type { JsonSchema } from "./json-schema";
import type { ScriptonyMcpInfra } from "./infra";

/** Narrow context passed into tool execute — built by scriptony-runtime + host. */
export interface McpToolContext {
  userId: string;
  organizationId: string;
  /** Active project from client when scoped. */
  projectId?: string;
  infra: ScriptonyMcpInfra;
  requestId?: string;
}

export interface InternalTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  policy: ToolPolicyCategory;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  execute(ctx: McpToolContext, input: unknown): Promise<ToolResult>;
}
