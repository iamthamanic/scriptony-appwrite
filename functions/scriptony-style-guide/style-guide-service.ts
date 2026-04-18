/**
 * Style Guide domain logic: Appwrite rows, prompt compilation, export payload.
 */

import { Query } from "node-appwrite";
import { ID } from "node-appwrite";
import {
  C,
  createDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../_shared/appwrite-db";
import { parseJsonStringArray } from "../_shared/style-guide-schema";

export function styleRowToApi(
  row: Record<string, any>,
): Record<string, unknown> {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title ?? "Style Guide",
    styleSummary: row.style_summary ?? "",
    toneSummary: row.tone_summary ?? "",
    keywords: parseJsonStringArray(row.keywords_json),
    negativeKeywords: parseJsonStringArray(row.negative_keywords_json),
    mustHave: parseJsonStringArray(row.must_have_json),
    avoid: parseJsonStringArray(row.avoid_json),
    palettePrimary: parseJsonStringArray(row.palette_primary_json),
    paletteSecondary: parseJsonStringArray(row.palette_secondary_json),
    paletteAccent: parseJsonStringArray(row.palette_accent_json),
    paletteBackground: parseJsonStringArray(row.palette_background_json),
    typographyNotes: row.typography_notes ?? "",
    compactPrompt: row.compact_prompt ?? "",
    exportPayload: parseExportPayload(row.export_payload_json),
    status: row.status ?? "draft",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseExportPayload(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return typeof v === "object" && v !== null
        ? (v as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function itemRowToApi(
  row: Record<string, any>,
): Record<string, unknown> {
  return {
    id: row.id,
    visualStyleId: row.visual_style_id,
    projectId: row.project_id,
    kind: row.kind ?? "image",
    title: row.title ?? "",
    caption: row.caption ?? "",
    imageUrl: row.image_url ?? "",
    storageFileId: row.storage_file_id ?? "",
    sourceUrl: row.source_url ?? "",
    sourceName: row.source_name ?? "",
    tags: parseJsonStringArray(row.tags_json),
    influence: typeof row.influence === "number" ? row.influence : 3,
    pinned: Boolean(row.pinned),
    orderIndex: typeof row.order_index === "number" ? row.order_index : 0,
    extractedPalette: parseJsonStringArray(row.extracted_palette_json),
    width: row.width ?? null,
    height: row.height ?? null,
    mimeType: row.mime_type ?? "",
    fileSize: row.file_size ?? null,
    licenseNote: row.license_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_STYLE_ROW = (projectId: string, userId: string) => ({
  project_id: projectId,
  user_id: userId,
  title: "Style Guide",
  style_summary: "",
  tone_summary: "",
  keywords_json: "[]",
  negative_keywords_json: "[]",
  must_have_json: "[]",
  avoid_json: "[]",
  palette_primary_json: "[]",
  palette_secondary_json: "[]",
  palette_accent_json: "[]",
  palette_background_json: "[]",
  typography_notes: "",
  compact_prompt: "",
  export_payload_json: "{}",
  status: "draft",
});

export async function getOrCreateStyleRoot(
  projectId: string,
  userId: string,
): Promise<Record<string, any>> {
  const found = await listDocumentsFull(C.project_visual_style, [
    Query.equal("project_id", projectId),
    Query.limit(1),
  ]);
  if (found.length > 0) {
    return found[0];
  }
  return createDocument(
    C.project_visual_style,
    ID.unique(),
    DEFAULT_STYLE_ROW(projectId, userId),
  );
}

export async function listItemsForStyle(
  visualStyleId: string,
): Promise<Record<string, any>[]> {
  return listDocumentsFull(C.project_visual_style_items, [
    Query.equal("visual_style_id", visualStyleId),
    Query.orderAsc("order_index"),
  ]);
}

export async function getItemById(
  itemId: string,
): Promise<Record<string, any> | null> {
  return getDocument(C.project_visual_style_items, itemId);
}

export async function maxOrderIndex(visualStyleId: string): Promise<number> {
  const items = await listItemsForStyle(visualStyleId);
  let max = -1;
  for (const it of items) {
    const o = typeof it.order_index === "number" ? it.order_index : 0;
    if (o > max) max = o;
  }
  return max + 1;
}

export function compileCompactPrompt(
  root: Record<string, any>,
  items: Record<string, any>[],
): string {
  const lines: string[] = [];
  const sum = String(root.style_summary ?? "").trim();
  const tone = String(root.tone_summary ?? "").trim();
  if (sum) lines.push(`Style summary: ${sum}`);
  if (tone) lines.push(`Tone: ${tone}`);
  const kw = parseJsonStringArray(root.keywords_json);
  if (kw.length) lines.push(`Keywords: ${kw.join(", ")}`);
  const neg = parseJsonStringArray(root.negative_keywords_json);
  if (neg.length) lines.push(`Avoid (negative keywords): ${neg.join(", ")}`);
  const must = parseJsonStringArray(root.must_have_json);
  if (must.length) lines.push(`Must-have rules: ${must.join("; ")}`);
  const avoid = parseJsonStringArray(root.avoid_json);
  if (avoid.length) lines.push(`Avoid rules: ${avoid.join("; ")}`);
  const pp = parseJsonStringArray(root.palette_primary_json);
  const ps = parseJsonStringArray(root.palette_secondary_json);
  const pa = parseJsonStringArray(root.palette_accent_json);
  const pb = parseJsonStringArray(root.palette_background_json);
  if (pp.length || ps.length || pa.length || pb.length) {
    lines.push(
      `Palette hints — primary: ${pp.join(", ")}; secondary: ${
        ps.join(
          ", ",
        )
      }; accent: ${pa.join(", ")}; background: ${pb.join(", ")}`,
    );
  }
  const pinned = items.filter((i) => i.pinned).slice(0, 8);
  const rest = items.filter((i) => !i.pinned).slice(0, 8);
  const refs = [...pinned, ...rest].slice(0, 12);
  for (const r of refs) {
    const t = String(r.title ?? "").trim();
    const c = String(r.caption ?? "").trim();
    const k = String(r.kind ?? "image");
    if (t || c) {
      lines.push(`Reference (${k}): ${t ? `${t} — ` : ""}${c}`.trim());
    }
  }
  return lines.filter(Boolean).join("\n");
}

export function compileExportPayload(
  root: Record<string, any>,
  items: Record<string, any>[],
): Record<string, unknown> {
  return {
    version: 1,
    title: root.title ?? "Style Guide",
    styleSummary: root.style_summary ?? "",
    toneSummary: root.tone_summary ?? "",
    keywords: parseJsonStringArray(root.keywords_json),
    negativeKeywords: parseJsonStringArray(root.negative_keywords_json),
    mustHave: parseJsonStringArray(root.must_have_json),
    avoid: parseJsonStringArray(root.avoid_json),
    palette: {
      primary: parseJsonStringArray(root.palette_primary_json),
      secondary: parseJsonStringArray(root.palette_secondary_json),
      accent: parseJsonStringArray(root.palette_accent_json),
      background: parseJsonStringArray(root.palette_background_json),
    },
    typographyNotes: root.typography_notes ?? "",
    compactPrompt: compileCompactPrompt(root, items),
    references: items.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      caption: r.caption,
      imageUrl: r.image_url,
      tags: parseJsonStringArray(r.tags_json),
      pinned: Boolean(r.pinned),
      influence: typeof r.influence === "number" ? r.influence : 3,
    })),
  };
}

export async function persistCompiledOutputs(
  styleId: string,
  root: Record<string, any>,
  items: Record<string, any>[],
): Promise<Record<string, any>> {
  const compact = compileCompactPrompt(root, items);
  const exportObj = compileExportPayload(root, items);
  return updateDocument(C.project_visual_style, styleId, {
    compact_prompt: compact,
    export_payload_json: JSON.stringify(exportObj),
  });
}
