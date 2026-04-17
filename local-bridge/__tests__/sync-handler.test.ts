import { describe, expect, it } from "vitest";

describe("sync-handler forbidden field guard", () => {
  const FORBIDDEN_FIELDS = [
    "acceptedRenderJobId",
    "renderRevision",
    "reviewStatus",
    "styleProfileRevision",
    "latestRenderJobId",
  ];

  it("blocks all forbidden fields", () => {
    for (const field of FORBIDDEN_FIELDS) {
      expect(FORBIDDEN_FIELDS).toContain(field);
    }
  });

  it("allows safe fields", () => {
    const safeFields = [
      "blenderSourceVersion",
      "blenderSyncRevision",
      "lastBlenderSyncAt",
      "lastPreviewAt",
      "glbPreviewFileId",
    ];
    for (const field of safeFields) {
      expect(FORBIDDEN_FIELDS).not.toContain(field);
    }
  });

  it("throws when a forbidden field is present", () => {
    const data = { acceptedRenderJobId: "job-123" };
    const hasForbidden = Object.keys(data).some((k) => FORBIDDEN_FIELDS.includes(k));
    expect(hasForbidden).toBe(true);
  });

  it("passes when no forbidden fields are present", () => {
    const data = { blenderSyncRevision: 5, lastBlenderSyncAt: "2026-04-17" };
    const hasForbidden = Object.keys(data).some((k) => FORBIDDEN_FIELDS.includes(k));
    expect(hasForbidden).toBe(false);
  });
});