/**
 * Central capability registry. No provider or transport logic.
 */

import type { InternalTool } from "../types/tool";

export class ToolNotFoundError extends Error {
  readonly toolName: string;

  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = "ToolNotFoundError";
    this.toolName = toolName;
  }
}

export class ToolRegistry {
  private readonly byName = new Map<string, InternalTool>();

  register(tool: InternalTool): void {
    if (this.byName.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.byName.set(tool.name, tool);
  }

  list(): InternalTool[] {
    return [...this.byName.values()];
  }

  get(name: string): InternalTool {
    const t = this.byName.get(name);
    if (!t) {
      throw new ToolNotFoundError(name);
    }
    return t;
  }

  tryGet(name: string): InternalTool | undefined {
    return this.byName.get(name);
  }
}
