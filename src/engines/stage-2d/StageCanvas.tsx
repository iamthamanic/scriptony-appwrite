/**
 * StageCanvas — 2D-Zeichenfläche (Konva) mit Layern, Export und Zuweisung zu Shot/Welt-Asset.
 * Engine-Modul: src/engines/stage-2d/ — Host-App bindet API/Router ein (siehe index.ts).
 */
import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUpFromLine,
  Brush,
  ChevronRight,
  CircleOff,
  Eraser,
  Eye,
  EyeOff,
  GripVertical,
  Hand,
  Image as ImageIcon,
  ImagePlus,
  Layers3,
  Lock,
  LockOpen,
  Plus,
  Redo2,
  RotateCw,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage as KonvaStage,
  Transformer,
} from "react-konva";
import { getStroke } from "perfect-freehand";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Node as KonvaNode } from "konva/lib/Node";
import type { Stage as KonvaStageType } from "konva/lib/Stage";
import type { Transformer as KonvaTransformerType } from "konva/lib/shapes/Transformer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { StageLayerStylingDialog } from "./StageLayerStylingDialog";
import { toast } from "sonner@2.0.3";
import type { Act, Scene, Sequence, Shot } from "@/lib/types";
import type {
  Stage2DExportAdapter,
  StageExportAssetRow,
  StageExportProjectRow,
  StageExportWorldRow,
} from "./export-adapter";
import {
  createStage2DDocument,
  createStage2DPayloadFromState,
  type Stage2DLayer,
  type Stage2DPayload,
} from "@/lib/stage-schema-info";

type StageTool = "draw" | "erase" | "pan";
type StagePoint = [number, number, number];
type ExportMode = "download" | "assign";
type AssignTarget = "project" | "world";

const byOrderIndex = <T extends { orderIndex?: number }>(a: T, b: T) =>
  (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

function shotSceneId(sh: { sceneId?: string; scene_id?: string }): string {
  return String(sh.sceneId ?? sh.scene_id ?? "");
}

function formatActLabel(act: Act): string {
  return `Akt ${act.actNumber ?? act.orderIndex ?? "?"}${act.title ? ` – ${act.title}` : ""}`;
}

function formatSequenceLabel(seq: Sequence): string {
  return `Sequenz ${seq.sequenceNumber ?? seq.orderIndex ?? "?"}${seq.title ? ` – ${seq.title}` : ""}`;
}

function formatSceneLabel(scene: Scene): string {
  return `Szene ${scene.sceneNumber ?? scene.number ?? "?"}${scene.title ? ` – ${scene.title}` : ""}`;
}

function formatShotLabel(sh: Shot): string {
  const n = sh.shotNumber || "";
  const tail = sh.description?.trim() || "Ohne Titel";
  const idShort = sh.id.length > 10 ? `${sh.id.slice(0, 8)}…` : sh.id;
  return n ? `Shot ${n} – ${tail} (${idShort})` : `${tail} (${idShort})`;
}

function getClientXYFromPointerEvent(evt: MouseEvent | TouchEvent): { x: number; y: number } {
  if ("touches" in evt && evt.touches && evt.touches.length > 0) {
    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
  }
  if ("changedTouches" in evt && evt.changedTouches && evt.changedTouches.length > 0) {
    return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
  }
  const me = evt as MouseEvent;
  return { x: me.clientX, y: me.clientY };
}

/** Imperative API for StagePage toolbar (Undo/Redo/Export row beside 2D/3D tabs). */
export type StageCanvasHandle = {
  undo: () => void;
  redo: () => void;
  resetView: () => void;
  clearDrawLayer: () => void;
  openExport: () => void;
};

export interface StageCanvasProps {
  /** Host liefert Laden/Zuweisung (Scriptony: `createScriptonyStageExportAdapter`). */
  exportAdapter: Stage2DExportAdapter;
  /** Nach Laden vom Shot: hydratisiert Layer + Kamera (einmalig bei Änderung). */
  initialStage2DPayload?: Stage2DPayload | null;
  /** Shot hat nur Rasterbild: als eine Image-Layer laden (optional). */
  initialRasterImageUrl?: string | null;
  /**
   * Ohne gespeichertes Stage-Dokument: logische Artboard-Größe aus Shot-Vorschaubild (Seitenverhältnis).
   * Wird von der Host-Seite aus Bildabmessungen abgeleitet.
   */
  shotArtboardHint?: { width: number; height: number } | null;
  /** If false, Cmd/Ctrl+Z shortcuts are not handled (e.g. 3D tab active). */
  shortcutsActive?: boolean;
  onToolbarCapabilitiesChange?: (c: {
    canUndo: boolean;
    canRedo: boolean;
    canClear: boolean;
  }) => void;
}

interface StageStroke {
  id: string;
  color: string;
  size: number;
  eraser: boolean;
  points: StagePoint[];
}

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface CursorPoint {
  x: number;
  y: number;
}

interface BaseStageLayer {
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
  /** true = variable Strichbreite (Druck/perfect-freehand); false = gleichmäßig */
  pressureSensitive?: boolean;
}

interface DrawStageLayer extends BaseStageLayer {
  kind: "draw";
  strokes: StageStroke[];
}

interface ImageStageLayer extends BaseStageLayer {
  kind: "image";
  imageUrl: string;
  width: number;
  height: number;
}

type StageLayer = DrawStageLayer | ImageStageLayer;

function createStrokeId() {
  return `stroke_${Math.random().toString(36).slice(2, 10)}`;
}

function createLayerId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatLayerName(index: number): string {
  return `Layer ${String(index).padStart(2, "0")}`;
}

/**
 * Klick-/Drag-Fläche für Draw-Layer im Pan-Modus: alle Stroke-Shapes haben `listening={false}`,
 * daher wäre die Group sonst nicht greifbar (Konva-Hittest).
 */
function getDrawLayerHitBoundsFromStrokes(strokes: StageStroke[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    const pad = Math.max(6, stroke.size / 2 + 6);
    for (const pt of stroke.points) {
      const px = pt[0];
      const py = pt[1];
      minX = Math.min(minX, px - pad);
      minY = Math.min(minY, py - pad);
      maxX = Math.max(maxX, px + pad);
      maxY = Math.max(maxY, py + pad);
    }
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 200, height: 150 };
  }
  const outer = 16;
  return {
    x: minX - outer,
    y: minY - outer,
    width: Math.max(80, maxX - minX + outer * 2),
    height: Math.max(80, maxY - minY + outer * 2),
  };
}

/** Fill/Outline-Slider: Standard 100 %; 60/40 = frühere Defaults (Migration in withLayerStrengthDefaults). */
const LAYER_STRENGTH_DEFAULT = 100;
const LEGACY_FILL_STRENGTH = 60;
const LEGACY_OUTLINE_STRENGTH = 40;

function createDrawLayer(index: number, id = `draw_layer_${index}`): DrawStageLayer {
  return {
    id,
    name: formatLayerName(index),
    kind: "draw",
    visible: true,
    locked: false,
    opacity: 1,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    fillEnabled: false,
    fillColor: "#a78bfa",
    fillStrength: LAYER_STRENGTH_DEFAULT,
    outlineEnabled: false,
    outlineColor: "#a78bfa",
    outlineStrength: LAYER_STRENGTH_DEFAULT,
    pressureSensitive: true,
    strokes: [],
  };
}

function withLayerStrengthDefaults(layer: StageLayer): StageLayer {
  let fillStrength = layer.fillStrength;
  let outlineStrength = layer.outlineStrength;
  let changed = false;
  if (fillStrength == null || fillStrength === LEGACY_FILL_STRENGTH) {
    fillStrength = LAYER_STRENGTH_DEFAULT;
    changed = true;
  }
  if (outlineStrength == null || outlineStrength === LEGACY_OUTLINE_STRENGTH) {
    outlineStrength = LAYER_STRENGTH_DEFAULT;
    changed = true;
  }
  if (!changed) return layer;
  return { ...layer, fillStrength, outlineStrength };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Zwischen zwei Layer-lokalen Stützpunkten interpolieren, wenn der Abstand zu groß ist.
 * Ohne das wirken Striche nach Artboard-Skalierung „eckig“, weil die Polylinie zu grob ist
 * (wenige Samples pro Bildschirm-Pixel).
 */
function interpolateStrokeSegmentLayer(
  from: [number, number, number],
  to: [number, number, number],
  maxStepLayer: number
): [number, number, number][] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStepLayer || dist < 1e-10) {
    return [[to[0], to[1], to[2]]];
  }
  const n = Math.ceil(dist / maxStepLayer);
  const out: [number, number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    out.push([from[0] + dx * t, from[1] + dy * t, from[2] + (to[2] - from[2]) * t]);
  }
  return out;
}

/** Ziel: ~1 px Schritt auf dem Screen → max. Abstand in Layer-Lokal-Koordinaten. */
function maxStepLayerForScreenPx(
  layer: DrawStageLayer,
  cameraScale: number,
  worldToDisplayScale: number
): number {
  const layerScale = Math.max(Math.abs(layer.scaleX), Math.abs(layer.scaleY), 1e-6);
  const screenToWorld = 1 / (cameraScale * worldToDisplayScale);
  return Math.max(0.12, screenToWorld / layerScale);
}

function hexToRgba(hex: string, alpha01: number): string {
  const a = clamp(alpha01, 0, 1);
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Konva fill/stroke aus Layer-Fill/Outline-Checkboxen und Slidern (nur Nicht-Eraser). */
function konvaPaintForStroke(
  layerStyle: Pick<
    BaseStageLayer,
    | "fillEnabled"
    | "fillColor"
    | "fillStrength"
    | "outlineEnabled"
    | "outlineColor"
    | "outlineStrength"
  >,
  stroke: StageStroke
): { fill: string; stroke: string; strokeWidth: number } {
  if (stroke.eraser) {
    return { fill: "#000000", stroke: "#000000", strokeWidth: 1 };
  }

  const fillA = clamp(layerStyle.fillStrength / 100, 0, 1);
  const outlineA = clamp(layerStyle.outlineStrength / 100, 0, 1);
  const fill = layerStyle.fillEnabled ? hexToRgba(layerStyle.fillColor, fillA) : stroke.color;

  if (layerStyle.outlineEnabled) {
    return {
      fill,
      stroke: hexToRgba(layerStyle.outlineColor, outlineA),
      strokeWidth: Math.max(0.75, 0.5 + (layerStyle.outlineStrength / 100) * 5),
    };
  }

  if (layerStyle.fillEnabled) {
    return { fill, stroke: "transparent", strokeWidth: 0 };
  }

  return { fill, stroke: stroke.color, strokeWidth: 1 };
}

function getStrokeOutlinePoints(stroke: StageStroke, pressureSensitive: boolean) {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: pressureSensitive ? 0.6 : 0,
    smoothing: 0.62,
    streamline: 0.58,
    simulatePressure: pressureSensitive,
    last: true,
  });

  return outline.flatMap(([x, y]) => [x, y]);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(imageUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = reject;
    image.src = imageUrl;
  });
}

/** Feste Zeichenfläche: gespeichertes Artboard, sonst Legacy-Viewport, sonst Shot-Hint, sonst 16:9-HD. */
function resolveStageArtboard(
  payload: Stage2DPayload | null | undefined,
  shotHint: { width: number; height: number } | null | undefined
): { width: number; height: number } {
  const fromPayload =
    payload?.artboard && payload.artboard.width > 0 && payload.artboard.height > 0
      ? payload.artboard
      : payload?.viewport && payload.viewport.width > 0 && payload.viewport.height > 0
        ? payload.viewport
        : null;
  if (fromPayload) {
    return {
      width: Math.max(64, Math.round(fromPayload.width)),
      height: Math.max(64, Math.round(fromPayload.height)),
    };
  }
  if (shotHint && shotHint.width > 0 && shotHint.height > 0) {
    return {
      width: Math.max(64, Math.round(shotHint.width)),
      height: Math.max(64, Math.round(shotHint.height)),
    };
  }
  return { width: 1920, height: 1080 };
}

export const StageCanvas = forwardRef<StageCanvasHandle, StageCanvasProps>(function StageCanvas(
  {
    exportAdapter,
    initialStage2DPayload = null,
    initialRasterImageUrl = null,
    shotArtboardHint = null,
    shortcutsActive = true,
    onToolbarCapabilitiesChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<KonvaStageType | null>(null);
  const transformerRef = useRef<KonvaTransformerType | null>(null);
  const layerNodeRefs = useRef<Record<string, KonvaNode>>({});

  const [artboard, setArtboard] = useState({ width: 1920, height: 1080 });
  const artboardRef = useRef(artboard);
  artboardRef.current = artboard;
  const [displaySize, setDisplaySize] = useState({ width: 1200, height: 720 });
  const [tool, setTool] = useState<StageTool>("draw");
  const [color, setColor] = useState("#b69cff");
  const [brushSize, setBrushSize] = useState(12);
  const [layers, setLayers] = useState<StageLayer[]>(() => [
    withLayerStrengthDefaults(createDrawLayer(1, "draw_layer_1")),
  ]);
  const [activeLayerId, setActiveLayerId] = useState("draw_layer_1");
  const [redoStack, setRedoStack] = useState<StageStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<StageStroke | null>(null);
  const [draftLayerId, setDraftLayerId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isImportingImages, setIsImportingImages] = useState(false);
  const [nextLayerNumber, setNextLayerNumber] = useState(2);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetLayerId, setDropTargetLayerId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"above" | "below" | null>(null);
  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [cursorPoint, setCursorPoint] = useState<CursorPoint>({
    x: 380,
    y: 240,
  });
  /** Viewport-Pan (Hintergrund ziehen) — getrennt von Layer-Drag; nie die Kamera-Group draggable machen. */
  const viewportPanRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("download");
  const [assignTarget, setAssignTarget] = useState<AssignTarget>("project");
  const [isExporting, setIsExporting] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<StageExportProjectRow[]>([]);
  const [timelineActs, setTimelineActs] = useState<Act[]>([]);
  const [timelineSequences, setTimelineSequences] = useState<Sequence[]>([]);
  const [timelineScenes, setTimelineScenes] = useState<Scene[]>([]);
  const [timelineShots, setTimelineShots] = useState<Shot[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedActId, setSelectedActId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const [availableWorlds, setAvailableWorlds] = useState<StageExportWorldRow[]>([]);
  const [availableAssets, setAvailableAssets] = useState<StageExportAssetRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedShotId, setSelectedShotId] = useState<string>("");
  const [selectedWorldId, setSelectedWorldId] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [layerThumbs, setLayerThumbs] = useState<Record<string, string>>({});
  const [stylingLayerId, setStylingLayerId] = useState<string | null>(null);

  const stylingLayer = useMemo(
    () => layers.find((l) => l.id === stylingLayerId) ?? null,
    [layers, stylingLayerId]
  );

  const worldToDisplayScale = useMemo(
    () => (artboard.width > 0 ? displaySize.width / artboard.width : 1),
    [artboard.width, displaySize.width, displaySize.height]
  );

  useEffect(() => {
    setArtboard(resolveStageArtboard(initialStage2DPayload, shotArtboardHint ?? null));
  }, [initialStage2DPayload, shotArtboardHint]);

  useEffect(() => {
    setLayers((current) => {
      const next = current.map(withLayerStrengthDefaults);
      const unchanged =
        next.length === current.length &&
        next.every(
          (l, i) =>
            l.fillStrength === current[i]?.fillStrength &&
            l.outlineStrength === current[i]?.outlineStrength
        );
      return unchanged ? current : next;
    });
  }, []);

  useEffect(() => {
    if (!initialStage2DPayload?.layers?.length) return;
    const mapped = initialStage2DPayload.layers.map((layer) =>
      withLayerStrengthDefaults(layer as unknown as StageLayer)
    );
    setLayers(mapped);
    setActiveLayerId(mapped[mapped.length - 1]?.id ?? "draw_layer_1");
    setRedoStack([]);
    if (initialStage2DPayload.camera) {
      setCamera({
        x: initialStage2DPayload.camera.x,
        y: initialStage2DPayload.camera.y,
        scale: initialStage2DPayload.camera.scale,
      });
    }
  }, [initialStage2DPayload]);

  useEffect(() => {
    if (!initialRasterImageUrl?.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const dims = await readImageDimensions(initialRasterImageUrl);
        if (cancelled) return;
        const scale = Math.min(1, 560 / Math.max(dims.width, dims.height));
        const width = Math.max(96, Math.round(dims.width * scale));
        const height = Math.max(96, Math.round(dims.height * scale));
        const ab = resolveStageArtboard(initialStage2DPayload, shotArtboardHint ?? null);
        const x = Math.max(0, (ab.width - width) / 2);
        const y = Math.max(0, (ab.height - height) / 2);
        const newLayer = withLayerStrengthDefaults({
          id: createLayerId("image"),
          name: "Shot image",
          kind: "image",
          visible: true,
          locked: false,
          opacity: 1,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          fillEnabled: false,
          fillColor: "#a78bfa",
          fillStrength: LAYER_STRENGTH_DEFAULT,
          outlineEnabled: false,
          outlineColor: "#a78bfa",
          outlineStrength: LAYER_STRENGTH_DEFAULT,
          pressureSensitive: true,
          imageUrl: initialRasterImageUrl,
          width,
          height,
        } as StageLayer);
        setLayers([newLayer]);
        setActiveLayerId(newLayer.id);
        setNextLayerNumber(2);
        setRedoStack([]);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRasterImageUrl, initialStage2DPayload, shotArtboardHint]);

  useEffect(() => {
    if (stylingLayerId && !layers.some((l) => l.id === stylingLayerId)) {
      setStylingLayerId(null);
    }
  }, [layers, stylingLayerId]);

  const fitDisplayToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cw = Math.max(320, Math.round(rect.width));
    const ch = Math.max(180, Math.round(rect.height));
    const ab = artboardRef.current;
    const fit = Math.min(cw / ab.width, ch / ab.height);
    setDisplaySize({
      width: Math.max(320, Math.round(ab.width * fit)),
      height: Math.max(180, Math.round(ab.height * fit)),
    });
  }, []);

  useEffect(() => {
    fitDisplayToContainer();
  }, [artboard.width, artboard.height, fitDisplayToContainer]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => fitDisplayToContainer());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitDisplayToContainer]);

  useEffect(() => {
    if (!layers.some((layer) => layer.id === activeLayerId) && layers.length > 0) {
      setActiveLayerId(layers[layers.length - 1].id);
    }
  }, [activeLayerId, layers]);

  useEffect(() => {
    setRedoStack([]);
  }, [activeLayerId]);

  useEffect(() => {
    const imageLayers = layers.filter((layer): layer is ImageStageLayer => layer.kind === "image");
    imageLayers.forEach((layer) => {
      if (loadedImages[layer.imageUrl]) return;
      const element = document.createElement("img");
      element.onload = () => {
        setLoadedImages((current) => ({ ...current, [layer.imageUrl]: element }));
      };
      element.src = layer.imageUrl;
    });
  }, [layers, loadedImages]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (tool !== "pan") {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const activeLayer = layers.find((layer) => layer.id === activeLayerId);
    const node = activeLayer ? layerNodeRefs.current[activeLayer.id] : undefined;
    if (!node || !activeLayer || activeLayer.locked || !activeLayer.visible) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [activeLayerId, layers, tool]);

  const activeLayer = useMemo(() => {
    return layers.find((layer) => layer.id === activeLayerId) ?? null;
  }, [activeLayerId, layers]);

  const panelLayers = useMemo(() => {
    return [...layers].reverse();
  }, [layers]);

  /** Insertion slot index in the layer panel (0 = before first row, n = after last). */
  const layerPanelActiveDropSlot = useMemo(() => {
    if (!draggedLayerId || !dropTargetLayerId || !dropPosition) return null;
    const i = panelLayers.findIndex((l) => l.id === dropTargetLayerId);
    if (i < 0) return null;
    return dropPosition === "above" ? i : i + 1;
  }, [draggedLayerId, dropTargetLayerId, dropPosition, panelLayers]);

  const activeDrawLayer =
    activeLayer?.kind === "draw" && activeLayer.visible && !activeLayer.locked
      ? activeLayer
      : null;

  const activeLabel =
    tool === "draw" ? "Pen" : tool === "erase" ? "Eraser" : "Pan";

  const showBrushCursor = tool !== "pan" && !!activeDrawLayer;

  const getWorldPointer = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const w = camera.scale * worldToDisplayScale;
    return {
      x: (pointer.x - camera.x) / w,
      y: (pointer.y - camera.y) / w,
    };
  };

  const worldToLayerPoint = (point: { x: number; y: number }, layer: StageLayer) => {
    const safeScaleX = Math.abs(layer.scaleX) < 0.0001 ? 1 : layer.scaleX;
    const safeScaleY = Math.abs(layer.scaleY) < 0.0001 ? 1 : layer.scaleY;
    const dx = point.x - layer.x;
    const dy = point.y - layer.y;
    const radians = (-layer.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(radians) - dy * Math.sin(radians);
    const ry = dx * Math.sin(radians) + dy * Math.cos(radians);
    return {
      x: rx / safeScaleX,
      y: ry / safeScaleY,
    };
  };

  const updateCursorPoint = () => {
    const point = getWorldPointer();
    if (!point) return null;

    setCursorPoint(point);
    return point;
  };

  const refreshLayerThumbnail = useCallback((layerId: string) => {
    requestAnimationFrame(() => {
      const node = layerNodeRefs.current[layerId];
      if (!node) return;
      const rect = node.getClientRect({
        skipShadow: true,
        skipStroke: false,
      });
      if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
        setLayerThumbs((current) => {
          if (!(layerId in current)) return current;
          const next = { ...current };
          delete next[layerId];
          return next;
        });
        return;
      }
      const padding = 8;
      const width = Math.max(24, Math.ceil(rect.width + padding * 2));
      const height = Math.max(24, Math.ceil(rect.height + padding * 2));
      const dataUrl = node.toDataURL({
        x: rect.x - padding,
        y: rect.y - padding,
        width,
        height,
        pixelRatio: 1,
        mimeType: "image/png",
      });
      setLayerThumbs((current) => {
        if (current[layerId] === dataUrl) return current;
        return {
          ...current,
          [layerId]: dataUrl,
        };
      });
    });
  }, []);

  useEffect(() => {
    layers.forEach((layer) => {
      refreshLayerThumbnail(layer.id);
    });
    const ids = new Set(layers.map((layer) => layer.id));
    setLayerThumbs((current) => {
      const next = { ...current };
      let changed = false;
      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [layers, refreshLayerThumbnail]);

  const ensureActiveDrawLayer = () => {
    const currentLayer = layers.find((layer) => layer.id === activeLayerId);
    if (
      currentLayer?.kind === "draw" &&
      currentLayer.visible &&
      !currentLayer.locked
    ) {
      return currentLayer.id;
    }

    const fallbackLayer = [...layers]
      .reverse()
      .find((layer) => layer.kind === "draw" && layer.visible && !layer.locked);

    if (fallbackLayer) {
      setActiveLayerId(fallbackLayer.id);
      return fallbackLayer.id;
    }

    const newLayer = withLayerStrengthDefaults(
      createDrawLayer(nextLayerNumber, createLayerId("draw"))
    );
    setLayers((current) => [...current, newLayer]);
    setActiveLayerId(newLayer.id);
    setNextLayerNumber((current) => current + 1);
    return newLayer.id;
  };

  const updateLayer = (layerId: string, updater: (layer: StageLayer) => StageLayer) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === layerId ? updater(layer) : layer))
    );
  };

  const updateDrawLayer = (
    layerId: string,
    updater: (layer: DrawStageLayer) => DrawStageLayer
  ) => {
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId && layer.kind === "draw" ? updater(layer) : layer
      )
    );
  };

  const handleActivateTool = (nextTool: StageTool) => {
    setTool(nextTool);

    if (nextTool !== "pan") {
      ensureActiveDrawLayer();
    }
  };

  const handleAddDrawLayer = () => {
    const newLayer = withLayerStrengthDefaults(
      createDrawLayer(nextLayerNumber, createLayerId("draw"))
    );
    setLayers((current) => [...current, newLayer]);
    setActiveLayerId(newLayer.id);
    setNextLayerNumber((current) => current + 1);
    setRedoStack([]);
  };

  const handleImageImport = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    setIsImportingImages(true);

    try {
      const newLayers: ImageStageLayer[] = [];
      let localLayerNumber = nextLayerNumber;

      for (const [index, file] of imageFiles.entries()) {
        const imageUrl = await readFileAsDataUrl(file);
        const dimensions = await readImageDimensions(imageUrl);
        const scale = Math.min(1, 560 / Math.max(dimensions.width, dimensions.height));
        const width = Math.max(96, Math.round(dimensions.width * scale));
        const height = Math.max(96, Math.round(dimensions.height * scale));

        newLayers.push(
          withLayerStrengthDefaults({
            id: createLayerId("image"),
            name: formatLayerName(localLayerNumber + index),
            kind: "image",
            visible: true,
            locked: false,
            opacity: 1,
            x: 120 + index * 24,
            y: 120 + index * 24,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            fillEnabled: false,
            fillColor: "#a78bfa",
            fillStrength: LAYER_STRENGTH_DEFAULT,
            outlineEnabled: false,
            outlineColor: "#a78bfa",
            outlineStrength: LAYER_STRENGTH_DEFAULT,
            pressureSensitive: true,
            imageUrl,
            width,
            height,
          }) as ImageStageLayer
        );
      }

      setLayers((current) => [...current, ...newLayers]);
      setActiveLayerId(newLayers[newLayers.length - 1]?.id ?? activeLayerId);
      setNextLayerNumber((current) => current + newLayers.length);
    } finally {
      setIsImportingImages(false);
    }
  };

  const beginStroke = () => {
    if (tool === "pan") return;

    const targetLayerId = ensureActiveDrawLayer();
    const point = updateCursorPoint();
    if (!point) return;
    const targetLayer = layers.find(
      (layer): layer is DrawStageLayer => layer.id === targetLayerId && layer.kind === "draw"
    );
    if (!targetLayer) return;
    const localPoint = worldToLayerPoint(point, targetLayer);

    setIsDrawing(true);
    setRedoStack([]);
    setDraftLayerId(targetLayerId);
    setDraftStroke({
      id: createStrokeId(),
      color,
      size: brushSize,
      eraser: tool === "erase",
      points: [
        [localPoint.x, localPoint.y, 0.5],
        [localPoint.x + 0.001, localPoint.y + 0.001, 0.5],
      ],
    });
  };

  const extendStroke = () => {
    if (!isDrawing || tool === "pan") return;

    const point = updateCursorPoint();
    if (!point) return;
    const targetLayer = layers.find(
      (layer): layer is DrawStageLayer => layer.id === draftLayerId && layer.kind === "draw"
    );
    if (!targetLayer) return;
    const localPoint = worldToLayerPoint(point, targetLayer);
    const to: [number, number, number] = [localPoint.x, localPoint.y, 0.5];
    const maxStep = maxStepLayerForScreenPx(targetLayer, camera.scale, worldToDisplayScale);

    setDraftStroke((current) => {
      if (!current) return current;
      const last = current.points[current.points.length - 1];
      if (!last) {
        return { ...current, points: [...current.points, to] };
      }
      const inserted = interpolateStrokeSegmentLayer(last, to, maxStep);
      return {
        ...current,
        points: [...current.points, ...inserted],
      };
    });
  };

  const finishStroke = () => {
    if (!isDrawing || !draftStroke || !draftLayerId) return;

    const committedStroke = draftStroke;
    const targetLayerId = draftLayerId;

    setIsDrawing(false);
    setDraftStroke(null);
    setDraftLayerId(null);

    updateDrawLayer(targetLayerId, (layer) => ({
      ...layer,
      strokes: [...layer.strokes, committedStroke],
    }));
  };

  const handleUndo = () => {
    if (!activeDrawLayer) return;

    updateDrawLayer(activeDrawLayer.id, (layer) => {
      const nextStrokes = [...layer.strokes];
      const removed = nextStrokes.pop();

      if (removed) {
        setRedoStack((current) => [...current, removed]);
      }

      return {
        ...layer,
        strokes: nextStrokes,
      };
    });
  };

  const handleRedo = () => {
    if (!activeDrawLayer) return;

    setRedoStack((current) => {
      const next = [...current];
      const restored = next.pop();

      if (restored) {
        updateDrawLayer(activeDrawLayer.id, (layer) => ({
          ...layer,
          strokes: [...layer.strokes, restored],
        }));
      }

      return next;
    });
  };

  const handleResetView = () => {
    setCamera({
      x: 0,
      y: 0,
      scale: 1,
    });
  };

  const handleClear = () => {
    if (!activeDrawLayer) return;

    updateDrawLayer(activeDrawLayer.id, (layer) => ({
      ...layer,
      strokes: [],
    }));
    setRedoStack([]);
    setDraftStroke(null);
    setDraftLayerId(null);
  };

  const handleDeleteLayer = (layerId: string) => {
    const remainingLayers = layers.filter((layer) => layer.id !== layerId);

    if (remainingLayers.length > 0) {
      setLayers(remainingLayers);

      if (activeLayerId === layerId) {
        setActiveLayerId(remainingLayers[remainingLayers.length - 1].id);
      }

      return;
    }

    const replacementId = createLayerId("draw");
    setLayers([
      withLayerStrengthDefaults(createDrawLayer(nextLayerNumber, replacementId)),
    ]);
    setActiveLayerId(replacementId);
    setNextLayerNumber((current) => current + 1);
  };

  const moveLayerBefore = (draggedId: string, targetId: string) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setLayers((current) => {
      const fromIndex = current.findIndex((layer) => layer.id === draggedId);
      const toIndex = current.findIndex((layer) => layer.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const moveLayerAfter = (draggedId: string, targetId: string) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setLayers((current) => {
      const fromIndex = current.findIndex((layer) => layer.id === draggedId);
      const targetIndex = current.findIndex((layer) => layer.id === targetId);
      if (fromIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      // After removal, insert after target's current position
      const adjustedTargetIndex = next.findIndex((layer) => layer.id === targetId);
      next.splice(adjustedTargetIndex + 1, 0, moved);
      return next;
    });
  };

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();

    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.08;
    const nextScale = clamp(
      direction > 0 ? camera.scale * scaleBy : camera.scale / scaleBy,
      0.35,
      4
    );

    const w = camera.scale * worldToDisplayScale;
    const pointTo = {
      x: (pointer.x - camera.x) / w,
      y: (pointer.y - camera.y) / w,
    };

    setCamera({
      scale: nextScale,
      x: pointer.x - pointTo.x * nextScale * worldToDisplayScale,
      y: pointer.y - pointTo.y * nextScale * worldToDisplayScale,
    });
  };

  const getStagePngDataUrl = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pr = Math.min(
      4,
      Math.max(1, artboard.width > 0 && displaySize.width > 0 ? artboard.width / displaySize.width : 2)
    );
    return stage.toDataURL({
      pixelRatio: pr,
      mimeType: "image/png",
    });
  };

  const downloadDataUrl = (dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "stage-sketch.png";
    link.click();
  };

  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const mimeType = blob.type || "image/png";
    return new File([blob], filename, { type: mimeType });
  };

  const applyHierarchyDefaults = useCallback(
    (acts: Act[], sequences: Sequence[], scenes: Scene[], shots: Shot[]) => {
      const actList = [...acts].sort(byOrderIndex);
      const pickAct = actList[0];
      if (!pickAct) {
        setSelectedActId("");
        setSelectedSequenceId("");
        setSelectedSceneId("");
        setSelectedShotId("");
        return;
      }
      setSelectedActId(pickAct.id);
      const seqList = sequences.filter((s) => s.actId === pickAct.id).sort(byOrderIndex);
      const pickSeq = seqList[0];
      if (!pickSeq) {
        setSelectedSequenceId("");
        setSelectedSceneId("");
        setSelectedShotId("");
        return;
      }
      setSelectedSequenceId(pickSeq.id);
      const sceneList = scenes.filter((sc) => sc.sequenceId === pickSeq.id).sort(byOrderIndex);
      const pickScene = sceneList[0];
      if (!pickScene) {
        setSelectedSceneId("");
        setSelectedShotId("");
        return;
      }
      setSelectedSceneId(pickScene.id);
      const shotList = shots
        .filter((sh) => shotSceneId(sh) === pickScene.id)
        .sort(byOrderIndex);
      const byShotId = new Map<string, Shot>();
      for (const sh of shotList) {
        if (sh.id && !byShotId.has(sh.id)) byShotId.set(sh.id, sh);
      }
      const dedupedShots = [...byShotId.values()];
      const pickShot = dedupedShots[0];
      setSelectedShotId(pickShot?.id ?? "");
    },
    []
  );

  const loadTimelineForProject = async (projectId: string, projectType?: string) => {
    setTimelineLoading(true);
    try {
      const bundle = await exportAdapter.loadTimelineForProject(projectId, projectType);
      const { acts, sequences, scenes, shots } = bundle;

      setTimelineActs(acts);
      setTimelineSequences(sequences);
      setTimelineScenes(scenes);
      setTimelineShots(shots);

      applyHierarchyDefaults(acts, sequences, scenes, shots);
    } catch (error) {
      console.error("[StageCanvas] Timeline load failed:", error);
      setTimelineActs([]);
      setTimelineSequences([]);
      setTimelineScenes([]);
      setTimelineShots([]);
      setSelectedActId("");
      setSelectedSequenceId("");
      setSelectedSceneId("");
      setSelectedShotId("");
      toast.error("Projekt-Struktur konnte nicht geladen werden.");
    } finally {
      setTimelineLoading(false);
    }
  };

  const sortedActs = useMemo(() => [...timelineActs].sort(byOrderIndex), [timelineActs]);

  const sequencesForSelectedAct = useMemo(
    () => timelineSequences.filter((s) => s.actId === selectedActId).sort(byOrderIndex),
    [timelineSequences, selectedActId]
  );

  const scenesForSelectedSequence = useMemo(
    () => timelineScenes.filter((sc) => sc.sequenceId === selectedSequenceId).sort(byOrderIndex),
    [timelineScenes, selectedSequenceId]
  );

  const shotsForSelectedScene = useMemo(() => {
    const list = timelineShots.filter((sh) => shotSceneId(sh) === selectedSceneId).sort(byOrderIndex);
    const m = new Map<string, Shot>();
    for (const sh of list) {
      if (sh.id && !m.has(sh.id)) m.set(sh.id, sh);
    }
    return [...m.values()];
  }, [timelineShots, selectedSceneId]);

  const handleActChange = useCallback(
    (actId: string) => {
      setSelectedActId(actId);
      const seqs = timelineSequences.filter((s) => s.actId === actId).sort(byOrderIndex);
      const fs = seqs[0];
      setSelectedSequenceId(fs?.id ?? "");
      if (!fs) {
        setSelectedSceneId("");
        setSelectedShotId("");
        return;
      }
      const scs = timelineScenes.filter((sc) => sc.sequenceId === fs.id).sort(byOrderIndex);
      const fsc = scs[0];
      setSelectedSceneId(fsc?.id ?? "");
      if (!fsc) {
        setSelectedShotId("");
        return;
      }
      const shs = timelineShots
        .filter((sh) => shotSceneId(sh) === fsc.id)
        .sort(byOrderIndex);
      const byShotId = new Map<string, Shot>();
      for (const sh of shs) {
        if (sh.id && !byShotId.has(sh.id)) byShotId.set(sh.id, sh);
      }
      const deduped = [...byShotId.values()];
      setSelectedShotId(deduped[0]?.id ?? "");
    },
    [timelineSequences, timelineScenes, timelineShots]
  );

  const handleSequenceChange = useCallback(
    (sequenceId: string) => {
      setSelectedSequenceId(sequenceId);
      const scs = timelineScenes.filter((sc) => sc.sequenceId === sequenceId).sort(byOrderIndex);
      const fsc = scs[0];
      setSelectedSceneId(fsc?.id ?? "");
      if (!fsc) {
        setSelectedShotId("");
        return;
      }
      const shs = timelineShots
        .filter((sh) => shotSceneId(sh) === fsc.id)
        .sort(byOrderIndex);
      const byShotId = new Map<string, Shot>();
      for (const sh of shs) {
        if (sh.id && !byShotId.has(sh.id)) byShotId.set(sh.id, sh);
      }
      const deduped = [...byShotId.values()];
      setSelectedShotId(deduped[0]?.id ?? "");
    },
    [timelineScenes, timelineShots]
  );

  const handleSceneChange = useCallback(
    (sceneId: string) => {
      setSelectedSceneId(sceneId);
      const shs = timelineShots
        .filter((sh) => shotSceneId(sh) === sceneId)
        .sort(byOrderIndex);
      const byShotId = new Map<string, Shot>();
      for (const sh of shs) {
        if (sh.id && !byShotId.has(sh.id)) byShotId.set(sh.id, sh);
      }
      const deduped = [...byShotId.values()];
      setSelectedShotId(deduped[0]?.id ?? "");
    },
    [timelineShots]
  );

  const loadAssetsForWorld = async (worldId: string) => {
    const assets = await exportAdapter.loadAssetsForWorld(worldId);
    setAvailableAssets(assets);
  };

  const openExportDialog = async () => {
    setIsExportDialogOpen(true);
    try {
      const { projects, worlds } = await exportAdapter.loadExportTargets();
      setAvailableProjects(projects);
      setAvailableWorlds(worlds);
      if (projects.length > 0) {
        const match = selectedProjectId
          ? projects.find((p) => p.id === selectedProjectId)
          : undefined;
        if (match) {
          void loadTimelineForProject(match.id, match.type);
        } else {
          const first = projects[0];
          setSelectedProjectId(first.id);
          void loadTimelineForProject(first.id, first.type);
        }
      }
      if (!selectedWorldId && worlds.length > 0) {
        const firstWorldId = worlds[0].id;
        setSelectedWorldId(firstWorldId);
        void loadAssetsForWorld(firstWorldId);
      }
    } catch (error) {
      console.error("Failed to load export targets:", error);
      toast.error("Export-Ziele konnten nicht geladen werden.");
    }
  };

  const stageActionsRef = useRef({
    handleUndo,
    handleRedo,
    handleResetView,
    handleClear,
    openExportDialog,
  });
  stageActionsRef.current = {
    handleUndo,
    handleRedo,
    handleResetView,
    handleClear,
    openExportDialog,
  };

  useImperativeHandle(
    ref,
    () => ({
      undo: () => stageActionsRef.current.handleUndo(),
      redo: () => stageActionsRef.current.handleRedo(),
      resetView: () => stageActionsRef.current.handleResetView(),
      clearDrawLayer: () => stageActionsRef.current.handleClear(),
      openExport: () => {
        void stageActionsRef.current.openExportDialog();
      },
    }),
    []
  );

  useEffect(() => {
    onToolbarCapabilitiesChange?.({
      canUndo: !!activeDrawLayer && activeDrawLayer.strokes.length > 0,
      canRedo: redoStack.length > 0 && !!activeDrawLayer,
      canClear: !!activeDrawLayer && activeDrawLayer.strokes.length > 0,
    });
  }, [activeDrawLayer, redoStack.length, onToolbarCapabilitiesChange]);

  useEffect(() => {
    if (!shortcutsActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "z" || e.key === "Z") {
        if (e.shiftKey) {
          e.preventDefault();
          stageActionsRef.current.handleRedo();
        } else {
          e.preventDefault();
          stageActionsRef.current.handleUndo();
        }
        return;
      }

      if (e.key === "y" && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        stageActionsRef.current.handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsActive]);

  const executeExport = async () => {
    const dataUrl = getStagePngDataUrl();
    if (!dataUrl) {
      toast.error("Stage konnte nicht exportiert werden.");
      return;
    }

    if (exportMode === "download") {
      downloadDataUrl(dataUrl);
      toast.success("PNG wurde heruntergeladen.");
      setIsExportDialogOpen(false);
      return;
    }

    setIsExporting(true);
    try {
      const file = await dataUrlToFile(dataUrl, "stage-sketch.png");
      if (assignTarget === "project") {
        if (!selectedProjectId || !selectedShotId) {
          toast.error("Bitte Projekt und Shot auswählen.");
          return;
        }
        const payload = createStage2DPayloadFromState({
          layers: layers as unknown as Stage2DLayer[],
          camera: { x: camera.x, y: camera.y, scale: camera.scale },
          artboard: { width: artboard.width, height: artboard.height },
          viewport: { width: displaySize.width, height: displaySize.height },
        });
        const stage2dDocument = createStage2DDocument(payload);
        await exportAdapter.assignToShot({
          projectId: selectedProjectId,
          shotId: selectedShotId,
          file,
          stage2dDocument,
        });
        toast.success("Stage erfolgreich dem Shot zugewiesen.");
      } else {
        if (!selectedWorldId || !selectedAssetId) {
          toast.error("Bitte Welt und Asset auswählen.");
          return;
        }
        const targetAsset = availableAssets.find((asset) => asset.id === selectedAssetId);
        const categoryId = targetAsset?.world_category_id || targetAsset?.category_id;
        if (!targetAsset || !categoryId) {
          throw new Error("Asset hat keine gültige Kategorie-ID.");
        }
        await exportAdapter.assignToWorldAsset({
          worldId: selectedWorldId,
          categoryId,
          assetId: selectedAssetId,
          file,
        });
        toast.success("Stage erfolgreich dem Asset zugewiesen.");
      }
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Export assign failed:", error);
      toast.error(error instanceof Error ? error.message : "Zuweisung fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleStagePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== "pan") {
      beginStroke();
      return;
    }
    if (e.target.name() === "viewport-bg") {
      const { x, y } = getClientXYFromPointerEvent(e.evt);
      viewportPanRef.current = { lastX: x, lastY: y };
    }
  };

  const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool === "pan" && viewportPanRef.current) {
      const { x, y } = getClientXYFromPointerEvent(e.evt);
      const prev = viewportPanRef.current;
      const dx = x - prev.lastX;
      const dy = y - prev.lastY;
      viewportPanRef.current = { lastX: x, lastY: y };
      setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      return;
    }
    updateCursorPoint();
    extendStroke();
  };

  const handleStagePointerUpLeave = () => {
    viewportPanRef.current = null;
    finishStroke();
  };

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-[#3b355a] bg-[#1c1a2d] text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] dark:text-white">
      <div
        className="grid h-full min-h-0 gap-0"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}
      >
        <div className="min-w-0 min-h-0 border-b border-[#312c4b] p-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1">
            <Button
              variant={tool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => handleActivateTool("draw")}
            >
              <Brush className="mr-2 size-4" />
              Draw
            </Button>
            <Button
              variant={tool === "erase" ? "default" : "outline"}
              size="sm"
              onClick={() => handleActivateTool("erase")}
            >
              <Eraser className="mr-2 size-4" />
              Erase
            </Button>
            <Button
              variant={tool === "pan" ? "default" : "outline"}
              size="sm"
              onClick={() => handleActivateTool("pan")}
            >
              <Hand className="mr-2 size-4" />
              Pan
            </Button>

            <div className="mx-2 hidden h-8 w-px bg-[#3b355a] md:block" />

            <div className="ml-auto rounded-full border border-[#3b355a] bg-[#221f35] px-3 py-1 text-xs text-slate-700 dark:text-[#c7c0de]">
              Tool: {activeLabel}
            </div>
            {tool === "pan" && (
              <div className="rounded-full border border-[#3b355a] bg-[#221f35] px-3 py-1 text-xs text-slate-700 inline-flex items-center gap-1.5 dark:text-[#c7c0de]">
                <RotateCw className="size-3.5 text-primary" />
                Handles aktiv
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 rounded-2xl border border-[#3b355a] bg-[#221f35] p-3 flex flex-col gap-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-[#f4f1ff]">Stroke Size</label>
                <Slider
                  value={[brushSize]}
                  min={2}
                  max={48}
                  step={1}
                  onValueChange={(value) => setBrushSize(value[0] ?? 12)}
                />
                <p className="text-xs text-slate-500 dark:text-[#b6aecf]">{brushSize}px</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-[#f4f1ff]">Stroke Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-12 w-full cursor-pointer rounded-lg border border-[#3b355a] bg-[#181629] p-1"
                  disabled={tool === "erase"}
                />
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#3b355a] bg-white"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
                backgroundSize: `${32 * camera.scale * worldToDisplayScale}px ${32 * camera.scale * worldToDisplayScale}px`,
                backgroundPosition: `${camera.x}px ${camera.y}px`,
                cursor: tool === "pan" ? "grab" : "none",
              }}
            >
              <KonvaStage
                ref={stageRef}
                width={displaySize.width}
                height={displaySize.height}
                onMouseDown={handleStagePointerDown}
                onTouchStart={handleStagePointerDown}
                onMouseMove={handlePointerMove}
                onTouchMove={handlePointerMove}
                onMouseUp={handleStagePointerUpLeave}
                onTouchEnd={handleStagePointerUpLeave}
                onMouseLeave={handleStagePointerUpLeave}
                onWheel={handleWheel}
              >
                <Layer>
                  <Group
                    x={camera.x}
                    y={camera.y}
                    scaleX={camera.scale * worldToDisplayScale}
                    scaleY={camera.scale * worldToDisplayScale}
                  >
                    <Rect
                      name="viewport-bg"
                      x={-6000}
                      y={-6000}
                      width={12000}
                      height={12000}
                      fill="rgba(0,0,0,0.001)"
                    />

                    <Rect
                      x={0}
                      y={0}
                      width={artboard.width}
                      height={artboard.height}
                      stroke="rgba(124,58,237,0.45)"
                      strokeWidth={1 / (camera.scale * worldToDisplayScale)}
                      dash={[6, 4]}
                      listening={false}
                    />

                    {layers.map((layer) => {
                      if (!layer.visible) return null;
                      const strokesToRender =
                        layer.kind === "draw" && draftStroke && draftLayerId === layer.id
                          ? [...layer.strokes, draftStroke]
                          : layer.kind === "draw"
                            ? layer.strokes
                            : [];
                      const isInteractive = tool === "pan" && !layer.locked;
                      const isActive = activeLayerId === layer.id;
                      const image = layer.kind === "image" ? loadedImages[layer.imageUrl] ?? null : null;

                      return (
                        <Group
                          key={layer.id}
                          ref={(node) => {
                            if (node) {
                              layerNodeRefs.current[layer.id] = node;
                            } else {
                              delete layerNodeRefs.current[layer.id];
                            }
                          }}
                          x={layer.x}
                          y={layer.y}
                          scaleX={layer.scaleX}
                          scaleY={layer.scaleY}
                          rotation={layer.rotation}
                          opacity={layer.opacity}
                          draggable={isInteractive}
                          onMouseDown={(event) => {
                            event.cancelBubble = true;
                            setActiveLayerId(layer.id);
                          }}
                          onTouchStart={(event) => {
                            event.cancelBubble = true;
                            setActiveLayerId(layer.id);
                          }}
                          onDragEnd={(event) => {
                            const node = event.target;
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              x: node.x(),
                              y: node.y(),
                            }));
                          }}
                          onTransformEnd={(event) => {
                            const node = event.target;
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              x: node.x(),
                              y: node.y(),
                              scaleX: node.scaleX(),
                              scaleY: node.scaleY(),
                              rotation: node.rotation(),
                            }));
                          }}
                        >
                          {layer.kind === "image" ? (
                            <>
                              {image ? (
                                <KonvaImage image={image} width={layer.width} height={layer.height} />
                              ) : (
                                <Rect width={layer.width} height={layer.height} fill="#e2e8f0" stroke="#94a3b8" />
                              )}
                              {isActive && tool !== "pan" && (
                                <Rect width={layer.width} height={layer.height} stroke="#7c3aed" strokeWidth={1.5} dash={[8, 4]} listening={false} />
                              )}
                            </>
                          ) : (
                            <>
                              {tool === "pan" && !layer.locked && (
                                <Rect
                                  {...getDrawLayerHitBoundsFromStrokes(strokesToRender)}
                                  fill="rgba(0,0,0,0.02)"
                                  listening
                                />
                              )}
                              {strokesToRender.map((stroke) => {
                                const pressureSensitive = layer.pressureSensitive ?? true;
                                const outlinePoints = getStrokeOutlinePoints(stroke, pressureSensitive);
                                const paint =
                                  layer.kind === "draw"
                                    ? konvaPaintForStroke(layer, stroke)
                                    : {
                                        fill: stroke.color,
                                        stroke: stroke.color,
                                        strokeWidth: 1,
                                      };

                                if (stroke.eraser && outlinePoints.length === 0) {
                                  const [x, y] = stroke.points[0] ?? [0, 0, 0.5];
                                  return (
                                    <Circle
                                      key={stroke.id}
                                      x={x}
                                      y={y}
                                      radius={Math.max(1, stroke.size / 2)}
                                      fill="#fcfbf7"
                                      listening={false}
                                      globalCompositeOperation="destination-out"
                                    />
                                  );
                                }

                                if (outlinePoints.length === 0) {
                                  const [x, y] = stroke.points[0] ?? [0, 0, 0.5];

                                  return (
                                    <Circle
                                      key={stroke.id}
                                      x={x}
                                      y={y}
                                      radius={Math.max(1, stroke.size / 2)}
                                      fill={paint.fill}
                                      stroke={paint.stroke}
                                      strokeWidth={paint.strokeWidth}
                                      listening={false}
                                      globalCompositeOperation="source-over"
                                    />
                                  );
                                }

                                if (stroke.eraser) {
                                  return (
                                    <Line
                                      key={stroke.id}
                                      points={outlinePoints}
                                      closed
                                      fill="#000000"
                                      stroke="#000000"
                                      strokeWidth={1}
                                      lineJoin="round"
                                      lineCap="round"
                                      listening={false}
                                      globalCompositeOperation="destination-out"
                                    />
                                  );
                                }

                                return (
                                  <Line
                                    key={stroke.id}
                                    points={outlinePoints}
                                    closed
                                    fill={paint.fill}
                                    stroke={paint.stroke}
                                    strokeWidth={paint.strokeWidth}
                                    lineJoin="round"
                                    lineCap="round"
                                    listening={false}
                                    globalCompositeOperation="source-over"
                                  />
                                );
                              })}
                            </>
                          )}
                        </Group>
                      );
                    })}
                    <Transformer
                      ref={transformerRef}
                      enabledAnchors={[
                        "top-left",
                        "top-center",
                        "top-right",
                        "middle-left",
                        "middle-right",
                        "bottom-left",
                        "bottom-center",
                        "bottom-right",
                      ]}
                      rotateEnabled
                      keepRatio={false}
                      borderStroke="#7c3aed"
                      anchorStroke="#7c3aed"
                      anchorFill="#ffffff"
                      anchorSize={8}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 24 || newBox.height < 24) return oldBox;
                        return newBox;
                      }}
                    />

                    {showBrushCursor && (
                      <Circle
                        x={cursorPoint.x}
                        y={cursorPoint.y}
                        radius={Math.max(2, brushSize / 2)}
                        fill={tool === "erase" ? "rgba(255,255,255,0.55)" : `${color}22`}
                        stroke={tool === "erase" ? "#111827" : color}
                        strokeWidth={1.5}
                        listening={false}
                      />
                    )}
                  </Group>
                </Layer>
              </KonvaStage>
            </div>
          </div>
        </div>

        <aside className="w-[360px] min-h-0 overflow-y-auto border-l border-[#312c4b] bg-[#1b1930] p-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-[#f4f1ff]">
                <Layers3 className="size-5 text-primary" />
                Layers
              </div>
              <div className="text-xs text-slate-500 dark:text-[#b6aecf]">{layers.length} Layer</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleAddDrawLayer}>
                <Plus className="mr-2 size-4" />
                Layer
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImportingImages}
              >
                <ImagePlus className="mr-2 size-4" />
                {isImportingImages ? "Importing..." : "Import"}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                if (!event.target.files?.length) return;
                await handleImageImport(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="flex flex-col gap-2">
              {panelLayers.map((layer, panelIndex) => {
                const isActive = activeLayerId === layer.id;
                const opacityValue = Math.round(layer.opacity * 100);

                return (
                  <Fragment key={layer.id}>
                    {draggedLayerId ? (
                      <div
                        role="presentation"
                        aria-hidden
                        className={cn(
                          "shrink-0 rounded-lg border-2 border-dashed transition-all duration-150",
                          layerPanelActiveDropSlot === panelIndex
                            ? "min-h-3 border-primary bg-primary/25 shadow-[0_0_14px_rgba(139,92,246,0.35)]"
                            : "min-h-2.5 border-[#5a537f]/40 bg-[#232140]/50"
                        )}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const targetId = layer.id;
                          if (draggedLayerId && draggedLayerId !== targetId) {
                            setDropTargetLayerId(targetId);
                            setDropPosition("above");
                          }
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const sourceId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                          if (sourceId && sourceId !== layer.id) {
                            moveLayerBefore(sourceId, layer.id);
                          }
                          setDraggedLayerId(null);
                          setDropTargetLayerId(null);
                          setDropPosition(null);
                        }}
                      />
                    ) : null}
                    <div
                  draggable
                  style={{
                    border: isActive ? "1px solid rgba(255, 255, 255, 0.92)" : "1px solid var(--primary)",
                  }}
                  onDragStart={(event) => {
                    setDraggedLayerId(layer.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", layer.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedLayerId && draggedLayerId !== layer.id) {
                      setDropTargetLayerId(layer.id);
                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      const isAbove = event.clientY < rect.top + rect.height / 2;
                      setDropPosition(isAbove ? "above" : "below");
                    }
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragLeave={() => {
                    if (dropTargetLayerId === layer.id) {
                      setDropTargetLayerId(null);
                      setDropPosition(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                    if (sourceId) {
                      if (dropPosition === "below") {
                        moveLayerAfter(sourceId, layer.id);
                      } else {
                        moveLayerBefore(sourceId, layer.id);
                      }
                    }
                    setDraggedLayerId(null);
                    setDropTargetLayerId(null);
                    setDropPosition(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDropTargetLayerId(null);
                    setDropPosition(null);
                  }}
                  className={`relative box-border overflow-hidden rounded-xl bg-transparent p-3 transition-colors ${
                    isActive ? "bg-primary/5" : ""
                  } ${draggedLayerId === layer.id ? "opacity-60" : ""}`}
                >
                  <div className="grid min-h-0 min-w-0 grid-cols-2 gap-3 items-stretch">
                    <div className="flex min-h-0 min-w-0 flex-col justify-between gap-2">
                      <div
                        onClick={() => setActiveLayerId(layer.id)}
                        className="flex min-w-0 w-full items-center gap-2 overflow-hidden"
                      >
                        <div className="inline-flex shrink-0 text-slate-500 dark:text-[#b6aecf]">
                          <GripVertical className="size-4 shrink-0" />
                        </div>
                        <input
                          type="text"
                          value={layer.name}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveLayerId(layer.id);
                          }}
                          onFocus={() => setActiveLayerId(layer.id)}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              name: nextName,
                            }));
                          }}
                          className="h-9 min-h-0 min-w-0 flex-1 basis-0 rounded-[10px] border border-solid border-primary/50 bg-[#17152a]/60 px-2.5 text-xs font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-primary/70 dark:text-[#f4f1ff]"
                          placeholder="Layer Name"
                        />
                      </div>

                      <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-3 text-xs">
                        <span className="text-left text-slate-500 dark:text-[#b6aecf]">Styling</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-full justify-between gap-2 rounded-lg border-[#5a537f] bg-[#17152a]/60 px-3 text-xs text-slate-800 dark:text-[#f4f1ff]"
                          onClick={() => {
                            setActiveLayerId(layer.id);
                            setStylingLayerId(layer.id);
                          }}
                        >
                          Styling…
                          <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
                        </Button>

                        <span className="text-left text-slate-500 dark:text-[#b6aecf]">Opacity</span>
                        <div className="relative min-w-0 py-0.5">
                          <Slider
                            className="[&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-slate-300 dark:[&_[data-slot=slider-track]]:bg-[#3b355a] [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-violet-500 [&_[data-slot=slider-thumb]]:bg-white"
                            rangeClassName="!bg-violet-500 dark:!bg-primary"
                            value={[opacityValue]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(value) => {
                              updateLayer(layer.id, (current) => ({
                                ...current,
                                opacity: (value[0] ?? 100) / 100,
                              }));
                            }}
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-semibold leading-none text-black dark:text-white/90">
                            {opacityValue}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0 rounded-full"
                          onClick={() =>
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              visible: !current.visible,
                            }))
                          }
                        >
                          {layer.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            "size-8 shrink-0 rounded-full",
                            layer.locked &&
                              "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 dark:hover:text-primary"
                          )}
                          onClick={() =>
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              locked: !current.locked,
                            }))
                          }
                        >
                          {layer.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0 rounded-full"
                          onClick={() => handleDeleteLayer(layer.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="relative flex min-h-0 min-w-0 items-center justify-center self-stretch">
                      <div
                        className="aspect-square w-full max-w-full overflow-hidden rounded-lg border border-primary bg-white"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
                          backgroundSize: "16px 16px",
                        }}
                      >
                        {layerThumbs[layer.id] ? (
                          <img
                            src={layerThumbs[layer.id]}
                            alt={`${layer.name} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-full min-h-0 w-full bg-transparent"
                            aria-label={`Vorschau ${layer.name}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  </Fragment>
                );
              })}
              {draggedLayerId && panelLayers.length > 0 ? (
                <div
                  role="presentation"
                  aria-hidden
                  className={cn(
                    "shrink-0 rounded-lg border-2 border-dashed transition-all duration-150",
                    layerPanelActiveDropSlot === panelLayers.length
                      ? "min-h-3 border-primary bg-primary/25 shadow-[0_0_14px_rgba(139,92,246,0.35)]"
                      : "min-h-2.5 border-[#5a537f]/40 bg-[#232140]/50"
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const last = panelLayers[panelLayers.length - 1];
                    if (draggedLayerId && last && draggedLayerId !== last.id) {
                      setDropTargetLayerId(last.id);
                      setDropPosition("below");
                    }
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const last = panelLayers[panelLayers.length - 1];
                    const sourceId = event.dataTransfer.getData("text/plain") || draggedLayerId;
                    if (sourceId && last && sourceId !== last.id) {
                      moveLayerAfter(sourceId, last.id);
                    }
                    setDraggedLayerId(null);
                    setDropTargetLayerId(null);
                    setDropPosition(null);
                  }}
                />
              ) : null}
            </div>

            {layers.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                <CircleOff className="mx-auto mb-3 size-5" />
                Noch keine Layer vorhanden.
              </div>
            )}
          </div>
        </aside>
      </div>
      <StageLayerStylingDialog
        key={stylingLayerId ?? "closed"}
        open={stylingLayerId !== null && stylingLayer !== null}
        onOpenChange={(open) => {
          if (!open) setStylingLayerId(null);
        }}
        layerName={stylingLayer?.name ?? ""}
        values={{
          fillEnabled: stylingLayer?.fillEnabled ?? false,
          fillColor: stylingLayer?.fillColor ?? "#a78bfa",
          fillStrength: stylingLayer?.fillStrength ?? LAYER_STRENGTH_DEFAULT,
          outlineEnabled: stylingLayer?.outlineEnabled ?? false,
          outlineColor: stylingLayer?.outlineColor ?? "#a78bfa",
          outlineStrength: stylingLayer?.outlineStrength ?? LAYER_STRENGTH_DEFAULT,
          pressureSensitive: stylingLayer?.pressureSensitive ?? true,
        }}
        onChange={(patch) => {
          if (!stylingLayerId) return;
          updateLayer(stylingLayerId, (current) => ({ ...current, ...patch }));
        }}
      />
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Stage exportieren</DialogTitle>
            <DialogDescription>
              Wähle, ob du die Stage herunterladen oder direkt zuweisen willst.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={exportMode === "download" ? "default" : "outline"}
                onClick={() => setExportMode("download")}
                disabled={isExporting}
              >
                Download
              </Button>
              <Button
                variant={exportMode === "assign" ? "default" : "outline"}
                onClick={() => setExportMode("assign")}
                disabled={isExporting}
              >
                Assign
              </Button>
            </div>

            {exportMode === "assign" && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={assignTarget === "project" ? "default" : "outline"}
                    onClick={() => setAssignTarget("project")}
                    disabled={isExporting}
                  >
                    Projekt
                  </Button>
                  <Button
                    variant={assignTarget === "world" ? "default" : "outline"}
                    onClick={() => setAssignTarget("world")}
                    disabled={isExporting}
                  >
                    Welt
                  </Button>
                </div>

                {assignTarget === "project" ? (
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Projekt</Label>
                      <Select
                        value={selectedProjectId}
                        onValueChange={(value) => {
                          const p = availableProjects.find((x) => x.id === value);
                          setSelectedProjectId(value);
                          void loadTimelineForProject(value, p?.type);
                        }}
                        disabled={isExporting || timelineLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Projekt auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {timelineLoading && (
                      <p className="text-xs text-muted-foreground">Struktur wird geladen…</p>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Akt</Label>
                      <Select
                        value={selectedActId}
                        onValueChange={handleActChange}
                        disabled={isExporting || timelineLoading || sortedActs.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Akt wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedActs.map((act) => (
                            <SelectItem key={act.id} value={act.id}>
                              {formatActLabel(act)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sortedActs.length === 0 && !timelineLoading && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">Keine Akte im Projekt.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sequenz</Label>
                      <Select
                        value={selectedSequenceId}
                        onValueChange={handleSequenceChange}
                        disabled={
                          isExporting || timelineLoading || sequencesForSelectedAct.length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sequenz wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {sequencesForSelectedAct.map((seq) => (
                            <SelectItem key={seq.id} value={seq.id}>
                              {formatSequenceLabel(seq)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedActId && sequencesForSelectedAct.length === 0 && !timelineLoading && (
                        <p className="text-xs text-muted-foreground">Keine Sequenz in diesem Akt.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Szene</Label>
                      <Select
                        value={selectedSceneId}
                        onValueChange={handleSceneChange}
                        disabled={
                          isExporting || timelineLoading || scenesForSelectedSequence.length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Szene wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {scenesForSelectedSequence.map((scene) => (
                            <SelectItem key={scene.id} value={scene.id}>
                              {formatSceneLabel(scene)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSequenceId && scenesForSelectedSequence.length === 0 && !timelineLoading && (
                        <p className="text-xs text-muted-foreground">Keine Szene in dieser Sequenz.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Shot</Label>
                      <Select
                        value={selectedShotId}
                        onValueChange={setSelectedShotId}
                        disabled={
                          isExporting || timelineLoading || shotsForSelectedScene.length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Shot auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {shotsForSelectedScene.map((shot) => (
                            <SelectItem key={shot.id} value={shot.id}>
                              {formatShotLabel(shot)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSceneId && shotsForSelectedScene.length === 0 && !timelineLoading && (
                        <p className="text-xs text-muted-foreground">Keine Shots in dieser Szene.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Select
                      value={selectedWorldId}
                      onValueChange={(value) => {
                        setSelectedWorldId(value);
                        setSelectedAssetId("");
                        void loadAssetsForWorld(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Welt auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWorlds.map((world) => (
                          <SelectItem key={world.id} value={world.id}>
                            {world.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Asset auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAssets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name || asset.title || "Unbenanntes Asset"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>
              Abbrechen
            </Button>
            <Button onClick={executeExport} disabled={isExporting}>
              {isExporting ? "Wird exportiert..." : exportMode === "download" ? "Download" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

StageCanvas.displayName = "StageCanvas";
