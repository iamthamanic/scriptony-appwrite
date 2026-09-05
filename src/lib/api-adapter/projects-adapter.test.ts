import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  detectRuntime: vi.fn(() => ({
    profile: "local",
    isDesktop: true,
    isBrowser: false,
    isMobile: false,
  })),
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/backend/backend-instance", () => ({
  getBackendInstance: vi.fn(() => null),
}));

const {
  mockCreate,
  mockGetWorkspaceRoot,
  mockListWorkspaceProjects,
  mockInvoke,
  mockRestoreWorkspaceScope,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(async () => ({
    projectId: "local_new",
    dirPath: "/workspace/Film.scriptony",
    manifest: {
      title: "Neues Projekt",
      projectType: "film",
      description: "Logline",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  })),
  mockGetWorkspaceRoot: vi.fn(async () => null as string | null),
  mockListWorkspaceProjects: vi.fn(
    async () =>
      [] as Array<{
        projectId: string;
        title: string;
        dirPath: string;
        updatedAt: string;
        projectType?: string;
      }>,
  ),
  mockInvoke: vi.fn(async () => undefined),
  mockRestoreWorkspaceScope: vi.fn(async () => undefined),
}));

vi.mock("@/local/workspace", () => ({
  getWorkspaceRoot: mockGetWorkspaceRoot,
  createTauriWorkspaceFs: vi.fn(),
  listWorkspaceProjects: mockListWorkspaceProjects,
  restoreWorkspaceScope: mockRestoreWorkspaceScope,
}));

vi.mock("@/backend/local/LocalProjectContext", () => ({
  LocalProjectContext: {
    create: mockCreate,
    open: vi.fn(),
  },
}));

vi.mock("@/local/project-settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/local/project-settings")>();
  return {
    ...actual,
    readProjectSettings: vi.fn(async () => null),
    writeProjectSettings: vi.fn(async () => undefined),
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

import { LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE } from "@/lib/local-project-delete-confirmation";
import { projectsApiAdapter } from "./projects-adapter";

describe("projectsApiAdapter", () => {
  beforeEach(() => {
    mockGetWorkspaceRoot.mockReset();
    mockListWorkspaceProjects.mockReset();
    mockInvoke.mockClear();
    mockRestoreWorkspaceScope.mockClear();
    mockCreate.mockClear();
  });

  it("lists projects from workspace scan when profile is local", async () => {
    mockGetWorkspaceRoot.mockResolvedValueOnce("/workspace");
    mockListWorkspaceProjects.mockResolvedValueOnce([
      {
        projectId: "local_1",
        title: "Test",
        dirPath: "/workspace/Test.scriptony",
        updatedAt: "2026-01-01T00:00:00.000Z",
        projectType: "film",
      },
    ]);
    const list = await projectsApiAdapter.getAll();
    expect(mockListWorkspaceProjects).toHaveBeenCalled();
    expect(list[0]?.id).toBe("local_1");
    expect(list[0]?.title).toBe("Test");
    expect(list[0]?.localDirPath).toBe("/workspace/Test.scriptony");
  });

  it("rejects create when no workspace root is set", async () => {
    mockGetWorkspaceRoot.mockResolvedValueOnce(null);
    await expect(
      projectsApiAdapter.create({
        title: "Neues Projekt",
        type: "film",
      }),
    ).rejects.toThrow(/Workspace-Ordner/);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRestoreWorkspaceScope).not.toHaveBeenCalled();
  });

  it("creates a local project with localDirPath when workspace is set", async () => {
    mockGetWorkspaceRoot.mockResolvedValueOnce("/workspace");
    const created = await projectsApiAdapter.create({
      title: "Neues Projekt",
      type: "film",
      logline: "Logline",
    });
    expect(mockRestoreWorkspaceScope).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        parentDir: "/workspace",
        title: "Neues Projekt",
        projectType: "film",
        description: "Logline",
      }),
    );
    expect(created.id).toBe("local_new");
    expect(created.localDirPath).toBe("/workspace/Film.scriptony");
  });

  it("rejects local delete without confirmation phrase", async () => {
    await expect(
      projectsApiAdapter.delete("local_1", "falsches-passwort"),
    ).rejects.toThrow(/delete/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("deletes locally when confirmation phrase matches", async () => {
    await projectsApiAdapter.delete(
      "local_1",
      LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
    );
    expect(mockInvoke).toHaveBeenCalledWith("delete_workspace_project", {
      projectId: "local_1",
      confirmationPhrase: LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
    });
  });
});
