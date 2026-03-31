/**
 * Policy category for capability execution (guardrails, analytics, UI).
 */

export type ToolPolicyCategory = "read" | "write" | "destructive" | "external_cost";

export type ToolRiskLevel = "low" | "medium" | "high";
