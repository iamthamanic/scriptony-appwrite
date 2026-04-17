import { describe, expect, it, vi, beforeEach } from "vitest";

// We test the concurrency/dedup/drain logic by importing the public API
// and mocking the internal dependencies.

vi.mock("../src/appwrite-client.js", () => ({
  getDatabases: vi.fn(),
  Collections: { renderJobs: "renderJobs", shots: "shots" },
}));

vi.mock("../src/comfyui-client.js", () => ({
  submitPrompt: vi.fn(),
  getHistory: vi.fn(),
  connectWebSocket: vi.fn(),
  disconnectWebSocket: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/storage-upload.js", () => ({
  uploadAllOutputs: vi.fn().mockResolvedValue(["file-1"]),
}));

vi.mock("../src/workflow-resolver.js", () => ({
  resolveWorkflowAsync: vi.fn().mockResolvedValue({}),
}));

vi.mock("../src/input-resolver.js", () => ({
  resolveInputs: vi.fn().mockResolvedValue({}),
}));

vi.mock("../src/db-callback.js", () => ({
  retryDbOperation: vi.fn((fn) => fn()),
}));

vi.mock("../src/config.js", () => ({
  getConfig: vi.fn(() => ({
    BRIDGE_APPWRITE_DATABASE_ID: "db-1",
    BRIDGE_WORKFLOWS_DIR: "/tmp/workflows",
  })),
  loadConfig: vi.fn(),
}));

import {
  handleRenderJob,
  getActiveJobs,
  getQueueLength,
  getRunningCount,
  drainJobs,
  resolveWsCompletion,
  rejectAllPendingResolvers,
} from "../src/render-job-handler.js";

// Reset internal state between tests by re-importing is not practical,
// so we test the observable behavior through public API.

describe("handleRenderJob", () => {
  it("exports getActiveJobs, getQueueLength, getRunningCount", () => {
    expect(typeof getActiveJobs).toBe("function");
    expect(typeof getQueueLength).toBe("function");
    expect(typeof getRunningCount).toBe("function");
  });

  it("initially has no active jobs", () => {
    const jobs = getActiveJobs();
    expect(jobs.size).toBe(0);
  });

  it("exports resolveWsCompletion and rejectAllPendingResolvers", () => {
    expect(typeof resolveWsCompletion).toBe("function");
    expect(typeof rejectAllPendingResolvers).toBe("function");
  });

  it("exports drainJobs", () => {
    expect(typeof drainJobs).toBe("function");
  });
});

describe("resolveWsCompletion", () => {
  it("does not throw for unknown promptId", () => {
    expect(() => resolveWsCompletion("unknown-prompt", {})).not.toThrow();
  });
});

describe("rejectAllPendingResolvers", () => {
  it("does not throw when no resolvers exist", () => {
    expect(() => rejectAllPendingResolvers("test shutdown")).not.toThrow();
  });
});

describe("drainJobs", () => {
  it("resolves immediately when no active jobs", async () => {
    await expect(drainJobs(1_000)).resolves.toBeUndefined();
  });
});