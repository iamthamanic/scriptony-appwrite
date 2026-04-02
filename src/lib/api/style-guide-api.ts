/**
 * Style Guide API — routes to `scriptony-style-guide` via api-gateway (`/style-guide/*`).
 */

import { apiClient } from "../api-client";

export type StyleGuideItemKind = "image" | "text" | "link";

export interface StyleGuideItem {
  id: string;
  visualStyleId: string;
  projectId: string;
  kind: StyleGuideItemKind;
  title: string;
  caption: string;
  imageUrl: string;
  storageFileId: string;
  sourceUrl: string;
  sourceName: string;
  tags: string[];
  influence: number;
  pinned: boolean;
  orderIndex: number;
  extractedPalette: string[];
  width: number | null;
  height: number | null;
  mimeType: string;
  fileSize: number | null;
  licenseNote: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StyleGuideData {
  id: string;
  projectId: string;
  title: string;
  styleSummary: string;
  toneSummary: string;
  keywords: string[];
  negativeKeywords: string[];
  mustHave: string[];
  avoid: string[];
  palettePrimary: string[];
  paletteSecondary: string[];
  paletteAccent: string[];
  paletteBackground: string[];
  typographyNotes: string;
  compactPrompt: string;
  exportPayload: Record<string, unknown>;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  items: StyleGuideItem[];
}

export interface StyleGuideResponse {
  styleGuide: StyleGuideData;
}

export async function getStyleGuide(projectId: string): Promise<StyleGuideData> {
  const res = await apiClient.get<StyleGuideResponse>(`/style-guide/${projectId}`);
  return res.styleGuide;
}

export type PatchStyleGuidePayload = Partial<{
  title: string;
  style_summary: string;
  tone_summary: string;
  keywords: string[];
  negative_keywords: string[];
  /** Operative Regeln */
  must_have: string[];
  avoid: string[];
  palette_primary: string[];
  palette_secondary: string[];
  palette_accent: string[];
  palette_background: string[];
  typography_notes: string;
  compact_prompt: string;
  status: "draft" | "published";
}>;

export async function patchStyleGuide(projectId: string, body: PatchStyleGuidePayload): Promise<StyleGuideData> {
  const res = await apiClient.patch<StyleGuideResponse>(`/style-guide/${projectId}`, body);
  return res.styleGuide;
}

export type CreateReferencePayload = {
  kind: StyleGuideItemKind;
  title?: string;
  caption?: string;
  image_url?: string;
  source_url?: string;
  source_name?: string;
  tags?: string[];
  influence?: number;
  pinned?: boolean;
  license_note?: string;
  text_body?: string;
  /** Browser: optional base64 for image kind when not using multipart */
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
};

export async function createReference(projectId: string, payload: CreateReferencePayload): Promise<StyleGuideData> {
  const res = await apiClient.post<StyleGuideResponse & { item?: StyleGuideItem }>(
    `/style-guide/${projectId}/references`,
    payload
  );
  return res.styleGuide;
}

export async function updateReference(
  referenceId: string,
  body: Partial<CreateReferencePayload> & { order_index?: number }
): Promise<StyleGuideData> {
  const res = await apiClient.patch<StyleGuideResponse>(`/style-guide/references/${referenceId}`, body);
  return res.styleGuide;
}

export async function deleteReference(referenceId: string): Promise<StyleGuideData> {
  const res = await apiClient.delete<StyleGuideResponse>(`/style-guide/references/${referenceId}`);
  return res.styleGuide;
}

export async function reorderReferences(projectId: string, orderedIds: string[]): Promise<StyleGuideData> {
  const res = await apiClient.post<StyleGuideResponse>(`/style-guide/${projectId}/references/reorder`, {
    ordered_ids: orderedIds,
  });
  return res.styleGuide;
}

export async function extractPalette(referenceId: string, colors: string[]): Promise<StyleGuideData> {
  const res = await apiClient.post<StyleGuideResponse>(
    `/style-guide/references/${referenceId}/extract-palette`,
    { colors }
  );
  return res.styleGuide;
}

export async function buildPrompt(projectId: string): Promise<{ compactPrompt: string; styleGuide: StyleGuideData }> {
  return apiClient.post(`/style-guide/${projectId}/build-prompt`, {});
}

export async function exportStyleGuide(projectId: string): Promise<{
  exportPayload: Record<string, unknown>;
  styleGuide: StyleGuideData;
}> {
  return apiClient.post(`/style-guide/${projectId}/export`, {});
}
