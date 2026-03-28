/**
 * Payload für Konva-basierte 2D-Stage — spiegeln der Engine-Struktur (StageCanvas).
 * Bei Bedarf erweitern; schemaVersion am Envelope erhöhen.
 */
import type { StageAssetRef } from "../assets";

export type Stage2DPoint = [number, number, number];

export interface Stage2DStroke {
  id: string;
  color: string;
  size: number;
  eraser: boolean;
  points: Stage2DPoint[];
}

export interface Stage2DBaseLayer {
  id: string;
  name: string;
  kind: "draw" | "image";
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  fillEnabled: boolean;
  fillColor: string;
  fillStrength: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineStrength: number;
  pressureSensitive?: boolean;
}

export interface Stage2DDrawLayer extends Stage2DBaseLayer {
  kind: "draw";
  strokes: Stage2DStroke[];
}

export interface Stage2DImageLayer extends Stage2DBaseLayer {
  kind: "image";
  /** Temporär (Session): data-/blob-URL; für Persistenz optional assetRef setzen */
  imageUrl: string;
  width: number;
  height: number;
  /** Persistente Referenz nach Upload */
  imageAssetRef?: StageAssetRef;
}

export type Stage2DLayer = Stage2DDrawLayer | Stage2DImageLayer;

export interface Stage2DCameraState {
  x: number;
  y: number;
  scale: number;
}

export interface Stage2DPayloadMeta {
  title?: string;
  /** ISO-8601, wenn beim Export gesetzt */
  exportedAt?: string;
}

/**
 * Vollständiger 2D-Stand für Serialisierung (Shot-Zuweisung, Datei-Export).
 */
export interface Stage2DPayload {
  /** Minor-Version innerhalb schemaVersion 1 (optional) */
  payloadRevision?: number;
  layers: Stage2DLayer[];
  camera?: Stage2DCameraState;
  /**
   * Logische Zeichenfläche in Pixeln (Shot-Frame / festes Seitenverhältnis).
   * Layer-Koordinaten beziehen sich darauf; fehlt bei alten Dateien → `viewport` als Fallback.
   */
  artboard?: { width: number; height: number };
  /** Letzte bekannte Anzeige-Größe der Stage (Metadaten / Legacy-Ersatz für artboard) */
  viewport?: { width: number; height: number };
  meta?: Stage2DPayloadMeta;
}
