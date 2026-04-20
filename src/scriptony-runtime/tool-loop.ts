/**
 * Single-step tool loop — deterministic invocation when tool name is explicit.
 */

import {
  ToolNotFoundError,
  type ToolRegistry,
} from "../scriptony-mcp/registry/registry";
import type { ToolResult } from "../scriptony-mcp/results/envelope";
import { validateToolInput } from "../scriptony-mcp/schemas/validate";
import {
  buildApprovalRequiredResponse,
  isApproved,
  type ApprovalRequiredPayload,
} from "./approval";
import { toMcpToolContext, type RuntimeContext } from "./runtime-context";

export interface SingleToolRunOptions {
  registry: ToolRegistry;
  runtime: RuntimeContext;
  toolName: string;
  input: unknown;
  /** When true, tools with requiresApproval may run. */
  approved?: boolean;
}

export async function runSingleToolInvocation(
  opts: SingleToolRunOptions,
): Promise<ToolResult | ApprovalRequiredPayload> {
  const { registry, runtime, toolName, input, approved } = opts;
  let tool;
  try {
    tool = registry.get(toolName);
  } catch (e) {
    if (e instanceof ToolNotFoundError) {
      return {
        success: false,
        message: e.message,
        error: { code: "TOOL_NOT_FOUND", message: e.message },
      };
    }
    throw e;
  }

  const validationError = validateToolInput(tool.name, input, {
    projectId: runtime.projectId,
  });
  if (validationError) {
    return validationError;
  }

  if (tool.requiresApproval && !isApproved(approved)) {
    return buildApprovalRequiredResponse(tool, input);
  }

  const mcpCtx = toMcpToolContext(runtime);
  return tool.execute(mcpCtx, input);
}
