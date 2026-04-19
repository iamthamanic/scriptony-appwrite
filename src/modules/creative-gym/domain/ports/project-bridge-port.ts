/**
 * Port: Scriptony project integration (implemented in adapters/integrated only).
 * Location: src/modules/creative-gym/domain/ports/project-bridge-port.ts
 */

import type {
  ProjectContext,
  ProjectSummary,
  TransferArtifactToProjectInput,
  TransferResult,
} from "../types";

export interface ProjectBridgePort {
  listProjects(userId: string): Promise<ProjectSummary[]>;
  getProjectContext(projectId: string): Promise<ProjectContext | null>;
  transferArtifact(
    params: TransferArtifactToProjectInput,
  ): Promise<TransferResult>;
}
