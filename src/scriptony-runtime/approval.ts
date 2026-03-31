/**
 * Approval gate for tools that require explicit user/operator consent.
 */

import type { InternalTool } from "../scriptony-mcp/types/tool";

export interface ApprovalRequiredPayload {
  status: "approval_required";
  tool: string;
  policy: string;
  riskLevel: string;
  message: string;
  /** Safe preview for UI — no secrets. */
  inputSummary: Record<string, unknown>;
}

export function buildApprovalRequiredResponse(
  tool: InternalTool,
  input: unknown,
  message = "This tool requires explicit approval before execution."
): ApprovalRequiredPayload {
  let inputSummary: Record<string, unknown> = {};
  if (input && typeof input === "object" && !Array.isArray(input)) {
    inputSummary = { ...(input as Record<string, unknown>) };
  }
  return {
    status: "approval_required",
    tool: tool.name,
    policy: tool.policy,
    riskLevel: tool.riskLevel,
    message,
    inputSummary,
  };
}

export function isApproved(explicitFlag: boolean | undefined): boolean {
  return explicitFlag === true;
}
