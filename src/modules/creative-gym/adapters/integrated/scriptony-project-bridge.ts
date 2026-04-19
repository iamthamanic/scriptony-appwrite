/**
 * Scriptony adapter: projects list + transfer via scenes / project update.
 * Location: src/modules/creative-gym/adapters/integrated/scriptony-project-bridge.ts
 */

import type { ProjectBridgePort } from "../../domain/ports/project-bridge-port";
import type {
  ProjectContext,
  ProjectSummary,
  TransferArtifactToProjectInput,
  TransferResult,
} from "../../domain/types";
import { projectsApi, scenesApi } from "../../../../utils/api";

const MARK = (id: string) =>
  `[Creative Gym · ${id} · created_in_creative_gym=true]\n\n`;

export class ScriptonyProjectBridge implements ProjectBridgePort {
  async listProjects(_userId: string): Promise<ProjectSummary[]> {
    const list = await projectsApi.getAll();
    return (Array.isArray(list) ? list : []).map(
      (p: { id: string; title?: string; type?: string }) => ({
        id: p.id,
        title: p.title ?? "Ohne Titel",
        type: p.type,
      }),
    );
  }

  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    try {
      const p = await projectsApi.getOne(projectId);
      if (!p?.id) return null;
      return {
        projectId: p.id,
        title: p.title ?? "Projekt",
        type: p.type,
      };
    } catch {
      return null;
    }
  }

  async transferArtifact(
    params: TransferArtifactToProjectInput,
  ): Promise<TransferResult> {
    const { projectId, target, artifactId, title, content } = params;
    const body = `${MARK(artifactId)}${content}`;

    try {
      if (
        target === "scene_list" ||
        target === "project" ||
        target === "outline_area"
      ) {
        const scene = await scenesApi.create(projectId, {
          title: title.slice(0, 120) || "Creative Gym",
          content: body,
        });
        return {
          ok: true,
          externalId: scene?.id,
          message: "Als Szene im Projekt gespeichert.",
        };
      }

      if (
        target === "idea_bank" ||
        target === "character_area" ||
        target === "worldbuilding_area" ||
        target === "production_board"
      ) {
        const scene = await scenesApi.create(projectId, {
          title: `[CG ${target}] ${title.slice(0, 80)}`,
          content: body,
        });
        return {
          ok: true,
          externalId: scene?.id,
          message: "Als Szene mit Ziel-Markierung gespeichert.",
        };
      }

      return { ok: false, message: "Unbekanntes Transfer-Ziel." };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Transfer fehlgeschlagen.",
      };
    }
  }
}
