/**
 * Standalone: no Scriptony projects — satisfies ProjectBridgePort.
 * Location: src/modules/creative-gym/adapters/standalone/null-project-bridge.ts
 */

import type { ProjectBridgePort } from "../../domain/ports/project-bridge-port";
import type {
  ProjectContext,
  ProjectSummary,
  TransferArtifactToProjectInput,
  TransferResult,
} from "../../domain/types";

export class NullProjectBridge implements ProjectBridgePort {
  async listProjects(): Promise<ProjectSummary[]> {
    return [];
  }

  async getProjectContext(): Promise<ProjectContext | null> {
    return null;
  }

  async transferArtifact(_params: TransferArtifactToProjectInput): Promise<TransferResult> {
    return {
      ok: false,
      message: "Projekt-Transfer ist im Standalone-Modus nicht verfügbar. Nutze Capsules.",
    };
  }
}
