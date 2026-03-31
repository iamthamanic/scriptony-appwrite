/**
 * Minimal required-field checks before tool execute (no full JSON-Schema engine).
 * Rules are declarative (Open/Closed): new tools add a map entry, not a switch arm.
 */

import { errResult, type ToolResult } from "../results/envelope";
import { isPlainObject, readString, resolveProjectId } from "./input-helpers";

export interface ToolValidationContext {
  projectId?: string;
}

/** Per-tool validation: extend this map when registering a new tool. */
export interface DeclarativeToolInputRule {
  /** True if project_id must come from input or request context. */
  needsProjectId?: boolean;
  /** Body keys that must be non-empty strings (in addition to needsProjectId). */
  requiredStringKeys?: string[];
}

export const DECLARATIVE_TOOL_INPUT_RULES: Record<string, DeclarativeToolInputRule> = {
  get_project_summary: { needsProjectId: true },
  list_project_scenes: { needsProjectId: true },
  get_scene_details: { requiredStringKeys: ["scene_id"] },
  rename_project: { needsProjectId: true, requiredStringKeys: ["title"] },
  create_scene: { needsProjectId: true, requiredStringKeys: ["template_id", "title"] },
};

/**
 * Returns null if valid, otherwise a ToolResult error envelope.
 */
export function validateToolInput(
  toolName: string,
  input: unknown,
  ctx: ToolValidationContext
): ToolResult | null {
  if (!isPlainObject(input)) {
    return errResult("Tool input must be a JSON object.", {
      code: "VALIDATION",
      message: "expected object",
    });
  }

  const rule = DECLARATIVE_TOOL_INPUT_RULES[toolName];
  if (!rule) {
    return null;
  }

  if (rule.needsProjectId) {
    if (!resolveProjectId(input, ctx)) {
      return errResult("project_id is required (in input or request project_id).", {
        code: "VALIDATION",
        message: "missing project_id",
      });
    }
  }

  for (const key of rule.requiredStringKeys ?? []) {
    if (!readString(input, key)) {
      return errResult(`${key} is required.`, { code: "VALIDATION", message: `missing ${key}` });
    }
  }

  return null;
}
