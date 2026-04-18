import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing
vi.mock("../src/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../src/render-job-handler.js", () => ({
  getActiveJobs: () => new Map(),
  getQueueLength: () => 0,
  getRunningCount: () => 0,
}));

vi.mock("../src/comfyui-client.js", () => ({
  healthCheck: () => Promise.resolve(true),
}));

vi.mock("../src/blender-client.js", () => ({
  healthCheck: () => Promise.resolve(false),
}));

vi.mock("../src/realtime-subscriber.js", () => ({
  isRealtimeConnected: () => true,
  getReconnectAttempts: () => 0,
}));

vi.mock("../src/config.js", () => ({
  getConfig: () => ({
    BRIDGE_APPWRITE_ENDPOINT: "http://appwrite:80/v1",
    BRIDGE_APPWRITE_PROJECT_ID: "test-project-id",
  }),
  loadConfig: () => ({
    BRIDGE_APPWRITE_ENDPOINT: "http://appwrite:80/v1",
    BRIDGE_APPWRITE_PROJECT_ID: "test-project-id",
  }),
}));

import { startHealthServer, stopHealthServer } from "../src/health.js";

async function fetchFromServer(port: number, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

describe("Health server", () => {
  const port = 19877;

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      startHealthServer(port);
      setTimeout(resolve, 200);
    });
  });

  afterEach(() => {
    stopHealthServer();
  });

  it("GET /health returns status report", async () => {
    const { status, body } = await fetchFromServer(port, "/health");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("scriptony-local-bridge");
    expect(data.connections).toBeDefined();
  });

  it("GET /bridge/config returns Appwrite connection info", async () => {
    const { status, body } = await fetchFromServer(port, "/bridge/config");
    expect(status).toBe(200);
    const data = body as Record<string, string>;
    expect(data.appwriteEndpoint).toBe("http://appwrite:80/v1");
    expect(data.appwriteProjectId).toBe("test-project-id");
  });

  it("returns 404 for unknown paths", async () => {
    const { status } = await fetchFromServer(port, "/unknown");
    expect(status).toBe(404);
  });

  it("POST /health returns 404", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { method: "POST" });
    expect(res.status).toBe(404);
  });
});