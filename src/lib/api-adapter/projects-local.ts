/**
 * projects-local.ts — local project CRUD operations.
 * Extracted from projects-adapter.ts to respect the 300-line file limit (T26).
 */

import { LocalProjectContext } from "@/backend/local/LocalProjectContext";
import {
  apiPayloadToLocalSettings,
  localSettingsToLegacyFields,
  parseLoglineFromPayload,
  parseProjectTypeFromPayload,
  readProjectSettings,
  writeProjectSettings,
} from "@/local/project-settings";
import {
  createTauriWorkspaceFs,
  getWorkspaceRoot,
  listWorkspaceProjects,
  restoreWorkspaceScope,
} from "@/local/workspace";
import { readProjectManifest } from "@/local/project-folder";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { requireLocalBackend } from "./runtime-dispatch";
import {
  isLocalDeleteConfirmationValid,
  localDeleteConfirmationErrorMessage,
} from "@/lib/local-project-delete-confirmation";
import { removeLocalProjectByProjectId } from "./local-project-resolve";
import {
  toLegacyProject,
  workspaceEntryToLegacyProject,
  type LegacyProject,
} from "./legacy-shape-mappers";

export async function mergeLocalLegacyProject(
  base: LegacyProject,
  dirPath: string,
): Promise<LegacyProject> {
  const settings = await readProjectSettings(dirPath);
  const type = base.type ?? base.projectType ?? "film";
  const projectType = base.projectType ?? base.type ?? "film";
  const logline =
    settings?.logline ?? parseLoglineFromPayload(base) ?? base.description;

  let cloudSyncEnabled = false;
  if (isDesktopShell()) {
    try {
      const manifest = await readProjectManifest(dirPath);
      cloudSyncEnabled = manifest.sync.enabled === true;
    } catch {
      cloudSyncEnabled = false;
    }
  }

  return {
    ...base,
    ...localSettingsToLegacyFields(settings),
    description: base.description ?? logline,
    logline,
    project_type: projectType,
    projectType,
    type,
    localDirPath: dirPath,
    cloudSyncEnabled,
    linkedWorldId:
      settings?.linkedWorldId ?? base.linkedWorldId ?? `local-world-${base.id}`,
    world_id:
      settings?.linkedWorldId ?? base.world_id ?? `local-world-${base.id}`,
  };
}

export function legacyFromCreateContext(
  ctx: LocalProjectContext,
): LegacyProject {
  const type = ctx.manifest.projectType ?? "film";
  return {
    id: ctx.projectId,
    title: ctx.manifest.title,
    description: ctx.manifest.description,
    logline: ctx.manifest.description,
    project_type: type,
    projectType: type,
    type,
    localDirPath: ctx.dirPath,
    linkedWorldId: `local-world-${ctx.projectId}`,
    world_id: `local-world-${ctx.projectId}`,
    createdAt: ctx.manifest.createdAt,
    updatedAt: ctx.manifest.updatedAt,
    lastEdited: ctx.manifest.updatedAt,
    last_edited: ctx.manifest.updatedAt,
    organizationId: "local",
  };
}

function parseCreatePayload(project: Record<string, unknown>): {
  title: string;
  projectType: string;
  description?: string;
} {
  const title =
    typeof project.title === "string" && project.title.trim()
      ? project.title.trim()
      : "Neues Projekt";
  const projectType = parseProjectTypeFromPayload(project);
  const description = parseLoglineFromPayload(project);
  return { title, projectType, description };
}

export async function listLocalProjects(): Promise<LegacyProject[]> {
  const root = await getWorkspaceRoot();
  if (!root) return [];

  // Re-apply Rust fs_scope for the trusted workspace root (same as LocalWorkspaceProvider).
  await restoreWorkspaceScope();

  const fs = await createTauriWorkspaceFs();
  const entries = await listWorkspaceProjects(root, fs);
  let list = await Promise.all(
    entries.map(async (entry) =>
      mergeLocalLegacyProject(
        workspaceEntryToLegacyProject(entry),
        entry.dirPath,
      ),
    ),
  );

  try {
    const backend = requireLocalBackend();
    const openId = backend.localProject.projectId;
    const idx = list.findIndex((p) => p.id === openId);
    if (idx < 0) return list;

    const fromDb = await backend.projects.list();
    const dbProject = fromDb.find((p) => p.$id === openId);
    if (dbProject) {
      list[idx] = await mergeLocalLegacyProject(
        toLegacyProject(dbProject, {
          localDirPath: backend.localProject.dirPath,
        }),
        backend.localProject.dirPath,
      );
    }
  } catch {
    // No open project — workspace scan only.
  }

  return list;
}

export async function getLocalProject(
  id: string,
): Promise<LegacyProject | null> {
  try {
    const backend = requireLocalBackend(id);
    const p = await backend.projects.get(id);
    if (p) {
      return mergeLocalLegacyProject(
        toLegacyProject(p, { localDirPath: backend.localProject.dirPath }),
        backend.localProject.dirPath,
      );
    }
  } catch {
    // continue with workspace scan
  }

  const root = await getWorkspaceRoot();
  if (!root) return null;
  await restoreWorkspaceScope();
  const fs = await createTauriWorkspaceFs();
  const entries = await listWorkspaceProjects(root, fs);
  const hit = entries.find((e) => e.projectId === id);
  return hit
    ? mergeLocalLegacyProject(workspaceEntryToLegacyProject(hit), hit.dirPath)
    : null;
}

export async function createLocalProject(
  project: Record<string, unknown>,
): Promise<LegacyProject> {
  const root = await getWorkspaceRoot();
  if (!root) {
    throw new Error(
      "Kein Workspace-Ordner gewählt. Bitte unter Einstellungen → Speicher einen Workspace festlegen.",
    );
  }
  // Re-apply Rust fs_scope for the trusted workspace root (same as listLocalProjects).
  await restoreWorkspaceScope();
  const { title, projectType, description } = parseCreatePayload(project);
  const ctx = await LocalProjectContext.create({
    parentDir: root,
    title,
    projectType,
    description,
  });
  await writeProjectSettings(ctx.dirPath, apiPayloadToLocalSettings(project));
  return mergeLocalLegacyProject(legacyFromCreateContext(ctx), ctx.dirPath);
}

export async function updateLocalProject(
  id: string,
  project: Record<string, unknown>,
): Promise<LegacyProject> {
  const backend = requireLocalBackend(id);
  const ctx = backend.localProject;
  const dirPath = ctx.dirPath;

  const updatePayload: {
    name?: string;
    description?: string;
    projectType?: string;
  } = {};
  if (typeof project.title === "string") updatePayload.name = project.title;
  const logline = parseLoglineFromPayload(project);
  if (logline !== undefined) updatePayload.description = logline;
  if (
    typeof project.type === "string" ||
    typeof project.project_type === "string" ||
    typeof project.projectType === "string"
  ) {
    updatePayload.projectType = parseProjectTypeFromPayload(project);
  }

  const updated = await backend.projects.update(id, updatePayload);

  if (updatePayload.name !== undefined) ctx.manifest.title = updatePayload.name;
  if (updatePayload.description !== undefined) {
    ctx.manifest.description = updatePayload.description;
  }
  if (updatePayload.projectType !== undefined) {
    ctx.manifest.projectType = updatePayload.projectType;
  }

  const existing = (await readProjectSettings(dirPath)) ?? {};
  await writeProjectSettings(dirPath, {
    ...existing,
    ...apiPayloadToLocalSettings(project),
  });
  await ctx.persist();

  return mergeLocalLegacyProject(
    toLegacyProject(updated, {
      localDirPath: dirPath,
      cover_image_url:
        typeof project.cover_image_url === "string"
          ? project.cover_image_url
          : undefined,
    }),
    dirPath,
  );
}

export async function deleteLocalProject(
  id: string,
  confirmationPhrase: string,
): Promise<void> {
  if (!isLocalDeleteConfirmationValid(confirmationPhrase)) {
    throw new Error(localDeleteConfirmationErrorMessage());
  }
  await removeLocalProjectByProjectId(id, confirmationPhrase);
}
