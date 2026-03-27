import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { StageLayerStylingDialog } from "./StageLayerStylingDialog";
import { toast } from "sonner@2.0.3";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import { getAllShotsByProject, uploadShotImage } from "../../lib/api/shots-api";
import { uploadWorldImage } from "../../lib/api/image-upload-api";
import { itemsApi, projectsApi, worldsApi } from "../../utils/api";

type StageTool = "draw" | "erase" | "pan";
type StagePoint = [number, number, number];
type ExportMode = "download" | "assign";
type AssignTarget = "project" | "world";

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
    smoothing: 0.55,
    streamline: 0.5,
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

export function StageCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<KonvaStageType | null>(null);
  const transformerRef = useRef<KonvaTransformerType | null>(null);
  const layerNodeRefs = useRef<Record<string, KonvaNode>>({});

  const [viewport, setViewport] = useState({ width: 1200, height: 720 });
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
    x: 220,
    y: 120,
    scale: 1,
  });
  const [cursorPoint, setCursorPoint] = useState<CursorPoint>({
    x: 380,
    y: 240,
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("download");
  const [assignTarget, setAssignTarget] = useState<AssignTarget>("project");
  const [isExporting, setIsExporting] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; title?: string; name?: string }>>([]);
  const [availableShots, setAvailableShots] = useState<
    Array<{ id: string; shot_number?: string; title?: string; description?: string }>
  >([]);
  const [availableWorlds, setAvailableWorlds] = useState<Array<{ id: string; name?: string; title?: string }>>([]);
  const [availableAssets, setAvailableAssets] = useState<
    Array<{ id: string; name?: string; title?: string; world_category_id?: string; category_id?: string }>
  >([]);
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
    if (stylingLayerId && !layers.some((l) => l.id === stylingLayerId)) {
      setStylingLayerId(null);
    }
  }, [layers, stylingLayerId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      setViewport({
        width: Math.max(320, Math.round(entry.contentRect.width)),
        height: Math.max(180, Math.round(entry.contentRect.height)),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

    return {
      x: (pointer.x - camera.x) / camera.scale,
      y: (pointer.y - camera.y) / camera.scale,
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

    setDraftStroke((current) => {
      if (!current) return current;
      return {
        ...current,
        points: [...current.points, [localPoint.x, localPoint.y, 0.5]],
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
      x: 220,
      y: 120,
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

    const pointTo = {
      x: (pointer.x - camera.x) / camera.scale,
      y: (pointer.y - camera.y) / camera.scale,
    };

    setCamera({
      scale: nextScale,
      x: pointer.x - pointTo.x * nextScale,
      y: pointer.y - pointTo.y * nextScale,
    });
  };

  const getStagePngDataUrl = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    return stage.toDataURL({
      pixelRatio: 2,
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

  const loadShotsForProject = async (projectId: string) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Nicht eingeloggt.");
    }
    const shots = await getAllShotsByProject(projectId, token);
    const normalized = (shots || []).map((shot: any) => ({
      id: String(shot.id),
      shot_number: shot.shot_number ?? shot.shotNumber ?? undefined,
      title: shot.title ?? undefined,
      description: shot.description ?? undefined,
    }));
    setAvailableShots(normalized);
  };

  const loadAssetsForWorld = async (worldId: string) => {
    const items = await itemsApi.getAllForWorld(worldId);
    const normalized = (items || []).map((item: any) => ({
      id: String(item.id),
      name: item.name ?? item.title ?? undefined,
      title: item.title ?? undefined,
      world_category_id: item.world_category_id ?? item.worldCategoryId ?? undefined,
      category_id: item.category_id ?? item.world_category_id ?? item.worldCategoryId ?? undefined,
    }));
    setAvailableAssets(normalized);
  };

  const openExportDialog = async () => {
    setIsExportDialogOpen(true);
    try {
      const [projects, worlds] = await Promise.all([projectsApi.getAll(), worldsApi.getAll()]);
      const normalizedProjects = (projects || []).map((project: any) => ({
        id: String(project.id),
        title: project.title ?? project.name ?? "Unbenanntes Projekt",
      }));
      const normalizedWorlds = (worlds || []).map((world: any) => ({
        id: String(world.id),
        name: world.name ?? world.title ?? "Unbenannte Welt",
      }));
      setAvailableProjects(normalizedProjects);
      setAvailableWorlds(normalizedWorlds);
      if (!selectedProjectId && normalizedProjects.length > 0) {
        const firstProjectId = normalizedProjects[0].id;
        setSelectedProjectId(firstProjectId);
        void loadShotsForProject(firstProjectId);
      }
      if (!selectedWorldId && normalizedWorlds.length > 0) {
        const firstWorldId = normalizedWorlds[0].id;
        setSelectedWorldId(firstWorldId);
        void loadAssetsForWorld(firstWorldId);
      }
    } catch (error) {
      console.error("Failed to load export targets:", error);
      toast.error("Export-Ziele konnten nicht geladen werden.");
    }
  };

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
        if (!selectedShotId) {
          toast.error("Bitte einen Shot auswählen.");
          return;
        }
        const token = await getAuthToken();
        if (!token) {
          throw new Error("Nicht eingeloggt.");
        }
        await uploadShotImage(selectedShotId, file, token);
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
        const imageUrl = await uploadWorldImage(selectedWorldId, file);
        await itemsApi.update(selectedWorldId, categoryId, selectedAssetId, { image_url: imageUrl });
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

  const handlePointerMove = () => {
    updateCursorPoint();
    extendStroke();
  };

  const canUndo = !!activeDrawLayer && activeDrawLayer.strokes.length > 0;
  const canRedo = redoStack.length > 0 && !!activeDrawLayer;
  const canClear = canUndo;

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

            <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo}>
              <Undo2 className="mr-2 size-4" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo}>
              <Redo2 className="mr-2 size-4" />
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="mr-2 size-4" />
              Reset View
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={!canClear}>
              Clear Draw Layer
            </Button>
            <Button size="sm" onClick={openExportDialog}>
              <ArrowUpFromLine className="mr-2 size-4" />
              Export
            </Button>

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
                backgroundSize: `${32 * camera.scale}px ${32 * camera.scale}px`,
                backgroundPosition: `${camera.x}px ${camera.y}px`,
                cursor: tool === "pan" ? "grab" : "none",
              }}
            >
              <KonvaStage
                ref={stageRef}
                width={viewport.width}
                height={viewport.height}
                onMouseDown={beginStroke}
                onTouchStart={beginStroke}
                onMouseMove={handlePointerMove}
                onTouchMove={handlePointerMove}
                onMouseUp={finishStroke}
                onTouchEnd={finishStroke}
                onMouseLeave={finishStroke}
                onWheel={handleWheel}
              >
                <Layer>
                  <Group
                    x={camera.x}
                    y={camera.y}
                    scaleX={camera.scale}
                    scaleY={camera.scale}
                    draggable={tool === "pan"}
                    onDragMove={(event) => {
                      setCamera((current) => ({
                        ...current,
                        x: event.target.x(),
                        y: event.target.y(),
                      }));
                    }}
                  >
                    <Rect
                      x={-6000}
                      y={-6000}
                      width={12000}
                      height={12000}
                      fill="rgba(0,0,0,0.001)"
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
        <DialogContent className="sm:max-w-[560px]">
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
                    <Select
                      value={selectedProjectId}
                      onValueChange={(value) => {
                        setSelectedProjectId(value);
                        setSelectedShotId("");
                        void loadShotsForProject(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Projekt auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title || project.name || "Unbenanntes Projekt"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedShotId} onValueChange={setSelectedShotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Shot auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShots.map((shot) => (
                          <SelectItem key={shot.id} value={shot.id}>
                            {(shot.shot_number ? `${shot.shot_number} - ` : "") + (shot.title || shot.description || "Untitled Shot")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            {world.name || world.title || "Unbenannte Welt"}
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
}
