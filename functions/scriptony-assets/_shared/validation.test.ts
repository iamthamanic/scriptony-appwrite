import { describe, it, expect } from "vitest";
import { isValidCombination, formatMatrixViolation } from "./validation";

describe("isValidCombination", () => {
  it("returns true when purpose is undefined", () => {
    expect(isValidCombination("project", "image", undefined)).toBe(true);
    expect(isValidCombination(undefined, undefined, undefined)).toBe(true);
  });

  it("returns true for valid owner+media+purpose combos", () => {
    expect(isValidCombination("project", "image", "cover")).toBe(true);
    expect(isValidCombination("shot", "image", "storyboard")).toBe(true);
    expect(isValidCombination("shot", "audio", "dialogue_audio")).toBe(true);
    expect(isValidCombination("character", "image", "avatar")).toBe(true);
    expect(isValidCombination("script", "document", "export_pdf")).toBe(true);
  });

  it("returns false for invalid owner+purpose combo", () => {
    // project + audio + dialogue_audio (invalid per owner matrix)
    expect(isValidCombination("project", "audio", "dialogue_audio")).toBe(
      false,
    );
    // character + document + export_pdf (invalid per owner matrix)
    expect(isValidCombination("character", "document", "export_pdf")).toBe(
      false,
    );
    // world + audio + voiceover (invalid per owner matrix)
    expect(isValidCombination("world", "audio", "voiceover")).toBe(false);
  });

  it("returns false for invalid media+purpose combo", () => {
    // shot + document + font (invalid per media matrix)
    expect(isValidCombination("shot", "document", "font")).toBe(false);
    // script + video + clip (invalid per media matrix)
    expect(isValidCombination("script", "video", "clip")).toBe(false);
  });

  it("returns false when both owner and media disagree with purpose", () => {
    // project + audio + export_pdf: both owner and media reject
    expect(isValidCombination("project", "audio", "export_pdf")).toBe(false);
  });

  it("returns true with partial constraints (only owner_type set)", () => {
    expect(isValidCombination("character", undefined, "avatar")).toBe(true);
    expect(isValidCombination("character", undefined, "export_pdf")).toBe(
      false,
    );
  });

  it("returns true with partial constraints (only media_type set)", () => {
    expect(isValidCombination(undefined, "image", "cover")).toBe(true);
    expect(isValidCombination(undefined, "audio", "cover")).toBe(false);
  });
});

describe("formatMatrixViolation", () => {
  it("returns empty string when purpose is absent", () => {
    expect(formatMatrixViolation("project", "image", undefined)).toBe("");
    expect(formatMatrixViolation("project", "image", null)).toBe("");
  });

  it("reports owner violation", () => {
    const msg = formatMatrixViolation("project", "audio", "dialogue_audio");
    expect(msg).toContain("not allowed for owner_type");
    expect(msg).toContain("project");
    expect(msg).toContain("cover, backdrop, reference");
  });

  it("reports media violation", () => {
    const msg = formatMatrixViolation("style_guide", "image", "font");
    expect(msg).toContain("not allowed for media_type");
    expect(msg).toContain("image");
  });

  it("reports both violations when both apply", () => {
    const msg = formatMatrixViolation("project", "audio", "export_pdf");
    expect(msg).toContain("owner_type");
    expect(msg).toContain("media_type");
  });
});
