/**
 * Laufzeit-Validierung ohne externe Schema-Library (KISS).
 * Liefert strukturierte Fehlerstrings für UI/Logs.
 */
import {
  STAGE_KIND_2D,
  STAGE_KIND_3D,
  STAGE_SCHEMA_VERSION_LATEST,
  STAGE_SCHEMA_VERSIONS,
  type StageSchemaVersion,
} from "./constants";
import type { StageDocument } from "./envelope";
import type { Stage2DLayer, Stage2DPayload } from "./kinds/stage2d";
import type { Stage3DPayload } from "./kinds/stage3d";

export type StageDocumentParseResult =
  | { ok: true; document: StageDocument }
  | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function err(path: string, msg: string): string {
  return `${path}: ${msg}`;
}

function validateSchemaVersion(v: unknown, path: string): string[] {
  if (!isFiniteNumber(v) || !Number.isInteger(v)) {
    return [err(path, "schemaVersion muss eine ganze Zahl sein")];
  }
  if (!STAGE_SCHEMA_VERSIONS.includes(v as StageSchemaVersion)) {
    return [err(path, `schemaVersion ${v} wird nicht unterstützt`)];
  }
  return [];
}

function validatePoint(v: unknown, path: string): string[] {
  if (!Array.isArray(v) || v.length !== 3) {
    return [err(path, "Punkt muss [number, number, number] sein")];
  }
  for (let i = 0; i < 3; i++) {
    if (!isFiniteNumber(v[i])) {
      return [err(`${path}[${i}]`, "Zahl erwartet")];
    }
  }
  return [];
}

function validateStroke(v: unknown, path: string): string[] {
  if (!isRecord(v)) return [err(path, "Stroke muss ein Objekt sein")];
  const e: string[] = [];
  if (typeof v.id !== "string" || !v.id)
    e.push(err(`${path}.id`, "string nötig"));
  if (typeof v.color !== "string") e.push(err(`${path}.color`, "string nötig"));
  if (!isFiniteNumber(v.size)) e.push(err(`${path}.size`, "Zahl nötig"));
  if (typeof v.eraser !== "boolean")
    e.push(err(`${path}.eraser`, "boolean nötig"));
  if (!Array.isArray(v.points)) e.push(err(`${path}.points`, "Array nötig"));
  else
    v.points.forEach((p, i) =>
      e.push(...validatePoint(p, `${path}.points[${i}]`)),
    );
  return e;
}

function validateBaseLayerFields(
  v: Record<string, unknown>,
  path: string,
): string[] {
  const e: string[] = [];
  const nums = [
    "opacity",
    "x",
    "y",
    "scaleX",
    "scaleY",
    "rotation",
    "fillStrength",
    "outlineStrength",
  ] as const;
  for (const k of nums) {
    if (!isFiniteNumber(v[k])) e.push(err(`${path}.${k}`, "Zahl nötig"));
  }
  const str = ["id", "name", "fillColor", "outlineColor"] as const;
  for (const k of str) {
    if (typeof v[k] !== "string") e.push(err(`${path}.${k}`, "string nötig"));
  }
  const bool = ["visible", "locked", "fillEnabled", "outlineEnabled"] as const;
  for (const k of bool) {
    if (typeof v[k] !== "boolean") e.push(err(`${path}.${k}`, "boolean nötig"));
  }
  if (
    v.pressureSensitive !== undefined &&
    typeof v.pressureSensitive !== "boolean"
  ) {
    e.push(err(`${path}.pressureSensitive`, "boolean oder weglassen"));
  }
  if (v.kind !== "draw" && v.kind !== "image") {
    e.push(err(`${path}.kind`, '"draw" oder "image"'));
  }
  return e;
}

function validateImageAssetRef(v: unknown, path: string): string[] {
  if (v === undefined) return [];
  if (!isRecord(v)) return [err(path, "imageAssetRef muss ein Objekt sein")];
  const e: string[] = [];
  if (v.storageFileId !== undefined && typeof v.storageFileId !== "string") {
    e.push(err(`${path}.storageFileId`, "string oder weglassen"));
  }
  if (v.url !== undefined && typeof v.url !== "string") {
    e.push(err(`${path}.url`, "string oder weglassen"));
  }
  if (v.mimeType !== undefined && typeof v.mimeType !== "string") {
    e.push(err(`${path}.mimeType`, "string oder weglassen"));
  }
  if (v.originalName !== undefined && typeof v.originalName !== "string") {
    e.push(err(`${path}.originalName`, "string oder weglassen"));
  }
  return e;
}

function validateLayer(v: unknown, path: string): string[] {
  if (!isRecord(v)) return [err(path, "Layer muss ein Objekt sein")];
  const e = validateBaseLayerFields(v, path);
  if (v.kind === "draw") {
    if (!Array.isArray(v.strokes))
      e.push(err(`${path}.strokes`, "Array nötig"));
    else
      (v.strokes as unknown[]).forEach((s, i) =>
        e.push(...validateStroke(s, `${path}.strokes[${i}]`)),
      );
  } else if (v.kind === "image") {
    if (typeof v.imageUrl !== "string")
      e.push(err(`${path}.imageUrl`, "string nötig"));
    if (!isFiniteNumber(v.width)) e.push(err(`${path}.width`, "Zahl nötig"));
    if (!isFiniteNumber(v.height)) e.push(err(`${path}.height`, "Zahl nötig"));
    e.push(...validateImageAssetRef(v.imageAssetRef, `${path}.imageAssetRef`));
  }
  return e;
}

function validateStage2DPayload(v: unknown, path: string): string[] {
  if (!isRecord(v)) return [err(path, "payload muss ein Objekt sein")];
  const e: string[] = [];
  if (v.payloadRevision !== undefined) {
    if (
      !isFiniteNumber(v.payloadRevision) ||
      !Number.isInteger(v.payloadRevision)
    ) {
      e.push(err(`${path}.payloadRevision`, "ganze Zahl oder weglassen"));
    }
  }
  if (!Array.isArray(v.layers)) e.push(err(`${path}.layers`, "Array nötig"));
  else
    (v.layers as unknown[]).forEach((layer, i) =>
      e.push(...validateLayer(layer, `${path}.layers[${i}]`)),
    );

  if (v.camera !== undefined) {
    if (!isRecord(v.camera))
      e.push(err(`${path}.camera`, "Objekt oder weglassen"));
    else {
      const c = v.camera as Record<string, unknown>;
      ["x", "y", "scale"].forEach((k) => {
        if (!isFiniteNumber(c[k]))
          e.push(err(`${path}.camera.${k}`, "Zahl nötig"));
      });
    }
  }
  if (v.artboard !== undefined) {
    if (!isRecord(v.artboard))
      e.push(err(`${path}.artboard`, "Objekt oder weglassen"));
    else {
      const ab = v.artboard as Record<string, unknown>;
      if (!isFiniteNumber(ab.width) || (ab.width as number) <= 0) {
        e.push(err(`${path}.artboard.width`, "positive Zahl nötig"));
      }
      if (!isFiniteNumber(ab.height) || (ab.height as number) <= 0) {
        e.push(err(`${path}.artboard.height`, "positive Zahl nötig"));
      }
    }
  }
  if (v.viewport !== undefined) {
    if (!isRecord(v.viewport))
      e.push(err(`${path}.viewport`, "Objekt oder weglassen"));
    else {
      const vp = v.viewport as Record<string, unknown>;
      if (!isFiniteNumber(vp.width))
        e.push(err(`${path}.viewport.width`, "Zahl nötig"));
      if (!isFiniteNumber(vp.height))
        e.push(err(`${path}.viewport.height`, "Zahl nötig"));
    }
  }
  if (v.meta !== undefined) {
    if (!isRecord(v.meta)) e.push(err(`${path}.meta`, "Objekt oder weglassen"));
    else {
      const m = v.meta as Record<string, unknown>;
      if (m.title !== undefined && typeof m.title !== "string") {
        e.push(err(`${path}.meta.title`, "string oder weglassen"));
      }
      if (m.exportedAt !== undefined && typeof m.exportedAt !== "string") {
        e.push(err(`${path}.meta.exportedAt`, "string oder weglassen"));
      }
    }
  }
  return e;
}

function validateStage3DPayload(v: unknown, path: string): string[] {
  if (!isRecord(v)) return [err(path, "payload muss ein Objekt sein")];
  const e: string[] = [];
  if (v.payloadRevision !== undefined) {
    if (
      !isFiniteNumber(v.payloadRevision) ||
      !Number.isInteger(v.payloadRevision)
    ) {
      e.push(err(`${path}.payloadRevision`, "ganze Zahl oder weglassen"));
    }
  }
  if (!Array.isArray(v.nodes)) e.push(err(`${path}.nodes`, "Array nötig"));
  else {
    (v.nodes as unknown[]).forEach((node, i) => {
      if (!isRecord(node)) {
        e.push(err(`${path}.nodes[${i}]`, "Objekt nötig"));
        return;
      }
      if (typeof node.id !== "string" || !node.id)
        e.push(err(`${path}.nodes[${i}].id`, "string nötig"));
      if (typeof node.type !== "string" || !node.type)
        e.push(err(`${path}.nodes[${i}].type`, "string nötig"));
      if (
        node.data !== undefined &&
        (!isRecord(node.data) || node.data === null)
      ) {
        e.push(err(`${path}.nodes[${i}].data`, "Objekt oder weglassen"));
      }
    });
  }
  if (v.meta !== undefined) {
    if (!isRecord(v.meta)) e.push(err(`${path}.meta`, "Objekt oder weglassen"));
  }
  return e;
}

/**
 * Prüft ein beliebiges JSON-kompatibles Objekt.
 * @returns { ok: true, document } oder Fehlerliste (kein Throw).
 */
export function validateStageDocument(raw: unknown): StageDocumentParseResult {
  if (!isRecord(raw)) {
    return { ok: false, errors: ["Root muss ein Objekt sein"] };
  }

  const errors: string[] = [];
  errors.push(...validateSchemaVersion(raw.schemaVersion, "schemaVersion"));

  if (raw.kind !== STAGE_KIND_2D && raw.kind !== STAGE_KIND_3D) {
    errors.push(
      err("kind", `muss "${STAGE_KIND_2D}" oder "${STAGE_KIND_3D}" sein`),
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  if (raw.kind === STAGE_KIND_2D) {
    errors.push(...validateStage2DPayload(raw.payload, "payload"));
  } else {
    errors.push(...validateStage3DPayload(raw.payload, "payload"));
  }

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, document: raw as unknown as StageDocument };
}

/**
 * JSON-String parsen und validieren.
 */
export function parseStageDocumentJson(text: string): StageDocumentParseResult {
  try {
    const data: unknown = JSON.parse(text);
    return validateStageDocument(data);
  } catch {
    return { ok: false, errors: ["Ungültiges JSON"] };
  }
}

/** Typ-Hilfe: Engine-State → serialisierbares Payload (ohne Runtime-Check). */
export function createStage2DPayloadFromState(state: {
  layers: Stage2DLayer[];
  camera?: Stage2DPayload["camera"];
  artboard?: Stage2DPayload["artboard"];
  viewport?: Stage2DPayload["viewport"];
  meta?: Stage2DPayload["meta"];
}): Stage2DPayload {
  return {
    payloadRevision: 1,
    layers: state.layers,
    camera: state.camera,
    artboard: state.artboard,
    viewport: state.viewport,
    meta: state.meta,
  };
}

/** Root-Dokument für Export/Speichern bauen. */
export function createStage2DDocument(
  payload: Stage2DPayload,
): import("./envelope").StageDocumentStage2D {
  return {
    schemaVersion: STAGE_SCHEMA_VERSION_LATEST,
    kind: STAGE_KIND_2D,
    payload,
  };
}
