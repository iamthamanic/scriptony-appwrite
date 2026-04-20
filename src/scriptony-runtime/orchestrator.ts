/**
 * Thin orchestration entry: list tools, run one tool, surface registry errors.
 */

import type { ToolRegistry } from "../scriptony-mcp/registry/registry";
import type { ToolResult } from "../scriptony-mcp/results/envelope";
import type { InternalTool } from "../scriptony-mcp/types/tool";
import type {
  AssistantProfileSummary,
  ProviderRouter,
} from "./provider-router";
import type { ApprovalRequiredPayload } from "./approval";
import { runSingleToolInvocation } from "./tool-loop";
import type { RuntimeContext } from "./runtime-context";

export type McpOrchestratorResult =
  | {
      kind: "list_tools";
      tools: Array<
        Pick<
          InternalTool,
          | "name"
          | "description"
          | "inputSchema"
          | "policy"
          | "riskLevel"
          | "requiresApproval"
        >
      >;
      assistant_profile: AssistantProfileSummary | null;
    }
  | {
      kind: "invoke";
      result: ToolResult | ApprovalRequiredPayload;
      assistant_profile: AssistantProfileSummary | null;
    }
  | { kind: "error"; message: string; code?: string };

export interface OrchestratorRequest {
  action: "list_tools" | "invoke";
  tool?: string;
  input?: unknown;
  approved?: boolean;
}

export async function runMcpOrchestrator(
  registry: ToolRegistry,
  router: ProviderRouter,
  runtime: RuntimeContext,
  req: OrchestratorRequest,
): Promise<McpOrchestratorResult> {
  const assistant_profile = router.getAssistantProfile();

  if (req.action === "list_tools") {
    const tools = registry.list().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      policy: t.policy,
      riskLevel: t.riskLevel,
      requiresApproval: t.requiresApproval,
    }));
    return { kind: "list_tools", tools, assistant_profile };
  }

  if (req.action === "invoke") {
    const toolName = req.tool?.trim();
    if (!toolName) {
      return {
        kind: "error",
        message: "invoke requires tool name",
        code: "MISSING_TOOL",
      };
    }
    const result = await runSingleToolInvocation({
      registry,
      runtime,
      toolName,
      input: req.input ?? {},
      approved: req.approved,
    });
    return { kind: "invoke", result, assistant_profile };
  }

  return { kind: "error", message: "Unknown action", code: "INVALID_ACTION" };
}
