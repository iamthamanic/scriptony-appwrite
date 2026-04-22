import { useState, useRef, useCallback, useEffect } from "react";
import {
  TreePine,
  Waves,
  Mountain,
  Home,
  Minus,
  Eraser,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
  Download,
  RotateCcw,
  MapPin,
  Image as ImageIcon,
  Plus,
  X,
  Link2,
  Pipette,
  User,
  Play,
  Pause,
  RotateCw,
  Edit3,
  Presentation,
  MoveHorizontal,
  Maximize2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { cn } from "./ui/utils";
import { useImagePreview } from "./hooks/useImagePreview";
import { RoadIcon } from "./RoadIcon";

export type TileType =
  | "grass"
  | "forest"
  | "water"
  | "mountain"
  | "road"
  | "city"
  | "custom";
export type ToolType =
  | "brush"
  | "eraser"
  | "select"
  | "pin"
  | "character"
  | "path";
export type MapMode = "edit" | "stage";

interface Tile {
  type: TileType;
  color?: string;
  countryId?: string;
  x: number;
  y: number;
}

interface Country {
  id: string;
  name: string;
  color: string;
  assetIds: string[];
}

interface PicturePin {
  id: string;
  x: number;
  y: number;
  imageUrl: string;
  title: string;
}

interface CharacterPin {
  id: string;
  x: number;
  y: number;
  characterId: string;
  name: string;
  color: string;
  imageUrl?: string;
}

interface PathPoint {
  x: number;
  y: number;
}

interface CharacterPath {
  characterId: string;
  points: PathPoint[];
  currentIndex: number;
}

interface ProjectCharacter {
  id: string;
  name: string;
  color: string;
  imageUrl?: string;
}

interface MapBuilderProps {
  worldId: string;
  worldName: string;
  onSave?: (mapData: MapData) => void;
  projectCharacters?: ProjectCharacter[];
  linkedProjectId?: string;
}

interface MapData {
  name: string;
  size: number;
  tiles: Tile[];
  countries: Country[];
  pins: PicturePin[];
  characterPins: CharacterPin[];
  seed: string;
  biome: string;
  climate: string;
}

const PRESET_COLORS: Record<TileType, string> = {
  grass: "#FFFFFF",
  forest: "#2D5F3E",
  water: "#33C3F0",
  mountain: "#A0A0A0",
  road: "#000000",
  city: "#8B4513",
  custom: "#FF6B6B",
};

const TILE_ICONS: Record<TileType, typeof TreePine | typeof RoadIcon | null> = {
  grass: null,
  forest: TreePine,
  water: Waves,
  mountain: Mountain,
  road: RoadIcon as any,
  city: Home,
  custom: null,
};

const BASE_TILE_SIZE = 40; // Base tile size at 100% zoom
const PIN_SIZE = 80; // Fixed pin size (does not scale with zoom)

export function MapBuilder({
  worldId,
  worldName,
  onSave,
  projectCharacters = [],
  linkedProjectId,
}: MapBuilderProps) {
  const [mapName, setMapName] = useState(`${worldName} - Karte`);
  const [mapSize, setMapSize] = useState(50);
  const [seed, setSeed] = useState("");
  const [biome, setBiome] = useState("temperate");
  const [climate, setClimate] = useState("temperate-climate");
  const [mapMode, setMapMode] = useState<MapMode>("edit");
  const [selectedTool, setSelectedTool] = useState<ToolType>("brush");
  const [selectedTileType, setSelectedTileType] = useState<TileType>("grass");
  const [brushColor, setBrushColor] = useState("#65B891");
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(0.85);
  const [tiles, setTiles] = useState<
    Map<string, { type: TileType; color?: string; countryId?: string }>
  >(new Map());
  const [countries, setCountries] = useState<Country[]>([]);
  const [pins, setPins] = useState<PicturePin[]>([]);
  const [characterPins, setCharacterPins] = useState<CharacterPin[]>([]);
  const [history, setHistory] = useState<
    Map<string, { type: TileType; color?: string; countryId?: string }>[]
  >([new Map()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isPainting, setIsPainting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [selectedCountryForPaint, setSelectedCountryForPaint] = useState<
    string | null
  >(null);
  const [showNewCountryDialog, setShowNewCountryDialog] = useState(false);
  const [newCountryName, setNewCountryName] = useState("");
  const [newCountryColor, setNewCountryColor] = useState("#FF6B6B");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingPinPos, setPendingPinPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [newPinTitle, setNewPinTitle] = useState("");
  const [newPinImage, setNewPinImage] = useState<string>("");
  const [selectedCountryForAssets, setSelectedCountryForAssets] = useState<
    string | null
  >(null);
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [pendingCharacterPos, setPendingCharacterPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [characterPaths, setCharacterPaths] = useState<
    Map<string, PathPoint[]>
  >(new Map());
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [selectedCharacterForPath, setSelectedCharacterForPath] = useState<
    string | null
  >(null);
  const [currentPathPoints, setCurrentPathPoints] = useState<PathPoint[]>([]);
  const [showEditPinDialog, setShowEditPinDialog] = useState(false);
  const [editingPin, setEditingPin] = useState<PicturePin | null>(null);
  const [editPinTitle, setEditPinTitle] = useState("");
  const [editPinImage, setEditPinImage] = useState("");
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pinImageInputRef = useRef<HTMLInputElement>(null);
  const editPinImageInputRef = useRef<HTMLInputElement>(null);
  const { openPreview, ImagePreviewOverlay } = useImagePreview();

  // Calculate tile size based on zoom (Google Maps style)
  const tileSize = BASE_TILE_SIZE * zoom;

  // Calculate effective pin size - compensate for zoom to keep pins visually constant
  const effectivePinSize = PIN_SIZE / zoom;

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleSave();
    }, 10000);
    return () => clearInterval(interval);
  }, [
    tiles,
    countries,
    pins,
    characterPins,
    mapName,
    mapSize,
    seed,
    biome,
    climate,
  ]);

  // Reset tool when switching modes
  useEffect(() => {
    if (mapMode === "stage") {
      setSelectedTool("path");
    } else {
      setSelectedTool("brush");
    }
  }, [mapMode]);

  const getTileKey = (x: number, y: number) => `${x},${y}`;

  const getTileData = useCallback(
    (x: number, y: number) => {
      return tiles.get(getTileKey(x, y)) || { type: "grass" as TileType };
    },
    [tiles],
  );

  const setTileData = useCallback(
    (
      x: number,
      y: number,
      data: { type: TileType; color?: string; countryId?: string },
    ) => {
      if (x < 0 || x >= mapSize || y < 0 || y >= mapSize) return;

      const key = getTileKey(x, y);
      setTiles((prev) => {
        const newTiles = new Map(prev);
        if (data.type === "grass" && !data.color && !data.countryId) {
          newTiles.delete(key);
        } else {
          newTiles.set(key, data);
        }
        return newTiles;
      });
    },
    [mapSize],
  );

  const paintTiles = useCallback(
    (centerX: number, centerY: number) => {
      const halfBrush = Math.floor(brushSize / 2);
      for (let dy = -halfBrush; dy <= halfBrush; dy++) {
        for (let dx = -halfBrush; dx <= halfBrush; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= brushSize / 2) {
            if (selectedTool === "brush") {
              setTileData(x, y, {
                type: selectedTileType,
                color: selectedTileType === "custom" ? brushColor : undefined,
                countryId: selectedCountryForPaint || undefined,
              });
            } else if (selectedTool === "eraser") {
              setTileData(x, y, { type: "grass" });
            }
          }
        }
      }
    },
    [
      brushSize,
      selectedTool,
      selectedTileType,
      brushColor,
      selectedCountryForPaint,
      setTileData,
    ],
  );

  const addToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(new Map(tiles));
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    setHistory(newHistory);
  }, [history, historyIndex, tiles]);

  const handleTileMouseEnter = (x: number, y: number) => {
    setCursorPos({ x, y });
    if (isPainting && (selectedTool === "brush" || selectedTool === "eraser")) {
      paintTiles(x, y);
    }
    // Move dragged pins/characters to current tile
    if (draggingPinId) {
      setPins(pins.map((p) => (p.id === draggingPinId ? { ...p, x, y } : p)));
    }
    if (draggingCharId) {
      handleMoveCharacter(draggingCharId, x, y);
    }
  };

  const handleTileMouseLeave = () => {
    setCursorPos(null);
  };

  const handleTileClick = (x: number, y: number) => {
    if (
      mapMode === "stage" &&
      selectedTool === "path" &&
      selectedCharacterForPath
    ) {
      // Add point to path
      setCurrentPathPoints([...currentPathPoints, { x, y }]);
    } else if (selectedTool === "brush" || selectedTool === "eraser") {
      paintTiles(x, y);
      addToHistory();
    } else if (selectedTool === "pin") {
      setPendingPinPos({ x, y });
      setShowPinDialog(true);
    } else if (selectedTool === "character") {
      setPendingCharacterPos({ x, y });
      setShowCharacterDialog(true);
    } else if (selectedTool === "select") {
      // For now, just show which country this tile belongs to
      const tileData = getTileData(x, y);
      if (tileData.countryId) {
        setSelectedCountryForAssets(tileData.countryId);
      }
    }
  };

  const handleMouseDown = () => {
    if (selectedTool === "brush" || selectedTool === "eraser") {
      setIsPainting(true);
    }
  };

  const handleMouseUp = () => {
    if (isPainting) {
      addToHistory();
    }
    setIsPainting(false);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTiles(new Map(history[historyIndex - 1]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTiles(new Map(history[historyIndex + 1]));
    }
  };

  const handleClearAll = () => {
    setTiles(new Map());
    addToHistory();
  };

  const handleFillDefault = () => {
    // Fill entire map with default grass tiles
    const newTiles = new Map<
      string,
      { type: TileType; color?: string; countryId?: string }
    >();
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        // We don't need to add grass tiles explicitly as they are the default
      }
    }
    setTiles(newTiles);
    addToHistory();
  };

  const handleZoomIn = () => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const oldZoom = zoom;
    const newZoom = Math.min(zoom + 0.25, 3);

    // Calculate center of viewport
    const centerX =
      (container.scrollLeft + container.clientWidth / 2) /
      (mapSize * BASE_TILE_SIZE * oldZoom);
    const centerY =
      (container.scrollTop + container.clientHeight / 2) /
      (mapSize * BASE_TILE_SIZE * oldZoom);

    setZoom(newZoom);

    // Adjust scroll to keep center point fixed
    setTimeout(() => {
      container.scrollLeft =
        centerX * (mapSize * BASE_TILE_SIZE * newZoom) -
        container.clientWidth / 2;
      container.scrollTop =
        centerY * (mapSize * BASE_TILE_SIZE * newZoom) -
        container.clientHeight / 2;
    }, 0);
  };

  const handleZoomOut = () => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const oldZoom = zoom;
    const newZoom = Math.max(zoom - 0.25, 0.1);

    // Calculate center of viewport
    const centerX =
      (container.scrollLeft + container.clientWidth / 2) /
      (mapSize * BASE_TILE_SIZE * oldZoom);
    const centerY =
      (container.scrollTop + container.clientHeight / 2) /
      (mapSize * BASE_TILE_SIZE * oldZoom);

    setZoom(newZoom);

    // Adjust scroll to keep center point fixed
    setTimeout(() => {
      container.scrollLeft =
        centerX * (mapSize * BASE_TILE_SIZE * newZoom) -
        container.clientWidth / 2;
      container.scrollTop =
        centerY * (mapSize * BASE_TILE_SIZE * newZoom) -
        container.clientHeight / 2;
    }, 0);
  };

  const handleResetView = () => {
    setZoom(1);
    if (canvasRef.current) {
      canvasRef.current.scrollLeft = 0;
      canvasRef.current.scrollTop = 0;
    }
  };

  const handleSave = () => {
    const mapData: MapData = {
      name: mapName,
      size: mapSize,
      tiles: Array.from(tiles.entries()).map(([key, data]) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y, ...data };
      }),
      countries,
      pins,
      characterPins,
      seed,
      biome,
      climate,
    };
    onSave?.(mapData);
    setLastSaved(new Date());
  };

  const handleExportJSON = () => {
    const mapData: MapData = {
      name: mapName,
      size: mapSize,
      tiles: Array.from(tiles.entries()).map(([key, data]) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y, ...data };
      }),
      countries,
      pins,
      characterPins,
      seed,
      biome,
      climate,
    };
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${mapName.replace(/\s+/g, "_")}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (canvasRef.current) {
      const scrollX =
        x * (mapSize * tileSize) - canvasRef.current.clientWidth / 2;
      const scrollY =
        y * (mapSize * tileSize) - canvasRef.current.clientHeight / 2;
      canvasRef.current.scrollLeft = scrollX;
      canvasRef.current.scrollTop = scrollY;
    }
  };

  const handleCreateCountry = () => {
    if (!newCountryName.trim()) return;
    const newCountry: Country = {
      id: `country-${Date.now()}`,
      name: newCountryName,
      color: newCountryColor,
      assetIds: [],
    };
    setCountries([...countries, newCountry]);
    setNewCountryName("");
    setShowNewCountryDialog(false);
  };

  const handleDeleteCountry = (countryId: string) => {
    setCountries(countries.filter((c) => c.id !== countryId));
    // Remove country from tiles
    setTiles((prev) => {
      const newTiles = new Map(prev);
      newTiles.forEach((data, key) => {
        if (data.countryId === countryId) {
          newTiles.set(key, { ...data, countryId: undefined });
        }
      });
      return newTiles;
    });
  };

  const handleCreatePin = () => {
    if (!pendingPinPos || !newPinTitle.trim()) return;

    const newPin: PicturePin = {
      id: `pin-${Date.now()}`,
      x: pendingPinPos.x,
      y: pendingPinPos.y,
      imageUrl:
        newPinImage ||
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
      title: newPinTitle,
    };
    setPins([...pins, newPin]);
    setNewPinTitle("");
    setNewPinImage("");
    setShowPinDialog(false);
    setPendingPinPos(null);
  };

  const handleDeletePin = (pinId: string) => {
    setPins(pins.filter((p) => p.id !== pinId));
  };

  const handleEditPin = (pin: PicturePin) => {
    setEditingPin(pin);
    setEditPinTitle(pin.title);
    setEditPinImage(pin.imageUrl);
    setShowEditPinDialog(true);
  };

  const handleUpdatePin = () => {
    if (!editingPin || !editPinTitle.trim()) return;

    setPins(
      pins.map((p) =>
        p.id === editingPin.id
          ? { ...p, title: editPinTitle, imageUrl: editPinImage || p.imageUrl }
          : p,
      ),
    );
    setShowEditPinDialog(false);
    setEditingPin(null);
    setEditPinTitle("");
    setEditPinImage("");
  };

  const handlePinDragStart = (pinId: string) => {
    setDraggingPinId(pinId);
  };

  const handlePinDragEnd = () => {
    setDraggingPinId(null);
  };

  const handleCreateCharacterPin = () => {
    if (!pendingCharacterPos || !selectedCharacterId) return;

    const character = projectCharacters.find(
      (c) => c.id === selectedCharacterId,
    );
    if (!character) return;

    const newCharPin: CharacterPin = {
      id: `charpin-${Date.now()}`,
      x: pendingCharacterPos.x,
      y: pendingCharacterPos.y,
      characterId: character.id,
      name: character.name,
      color: character.color,
      imageUrl: character.imageUrl,
    };
    setCharacterPins([...characterPins, newCharPin]);
    setSelectedCharacterId("");
    setShowCharacterDialog(false);
    setPendingCharacterPos(null);
  };

  const handleDeleteCharacterPin = (charPinId: string) => {
    setCharacterPins(characterPins.filter((c) => c.id !== charPinId));
  };

  const handleCharacterDragStart = (charPinId: string) => {
    setDraggingCharId(charPinId);
  };

  const handleCharacterDragEnd = () => {
    setDraggingCharId(null);
  };

  const handleMoveCharacter = (charPinId: string, x: number, y: number) => {
    setCharacterPins(
      characterPins.map((c) => (c.id === charPinId ? { ...c, x, y } : c)),
    );
  };

  const handleSavePath = () => {
    if (!selectedCharacterForPath || currentPathPoints.length === 0) return;

    setCharacterPaths(
      new Map(characterPaths.set(selectedCharacterForPath, currentPathPoints)),
    );
    setCurrentPathPoints([]);
  };

  const handleClearPath = () => {
    setCurrentPathPoints([]);
  };

  const handlePlayAnimation = () => {
    // Animation logic can be implemented here
    setIsAnimating(!isAnimating);
  };

  // Get brush cursor style
  const getBrushCursorStyle = () => {
    if (!cursorPos) return {};
    const size = brushSize * tileSize;
    return {
      position: "absolute" as const,
      left: cursorPos.x * tileSize,
      top: cursorPos.y * tileSize,
      width: size,
      height: size,
      border: `2px solid ${selectedTool === "eraser" ? "#EF4444" : brushColor}`,
      borderRadius: "50%",
      pointerEvents: "none" as const,
      backgroundColor:
        selectedTool === "eraser"
          ? "rgba(239, 68, 68, 0.1)"
          : `${brushColor}33`,
      transform: "translate(-50%, -50%)",
      marginLeft: size / 2,
      marginTop: size / 2,
    };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Top Toolbar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 border-r pr-2">
                <Button
                  variant={mapMode === "edit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMapMode("edit")}
                  className="h-9 px-3"
                  title="Bearbeiten"
                >
                  <Edit3 className="size-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant={mapMode === "stage" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMapMode("stage")}
                  className="h-9 px-3"
                  title="Stage"
                >
                  <Presentation className="size-4 mr-1.5" />
                  Stage
                </Button>
              </div>

              {/* Tools (Edit Mode only) */}
              {mapMode === "edit" && (
                <div className="flex items-center gap-1 border-r pr-2 flex-wrap">
                  <Button
                    variant={selectedTool === "brush" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTool("brush")}
                    className="h-9 w-9 p-0"
                    title="Pinsel"
                  >
                    <TreePine className="size-4" />
                  </Button>
                  <Button
                    variant={selectedTool === "eraser" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTool("eraser")}
                    className="h-9 w-9 p-0"
                    title="Radierer"
                  >
                    <Eraser className="size-4" />
                  </Button>
                  <Button
                    variant={selectedTool === "pin" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTool("pin")}
                    className="h-9 w-9 p-0"
                    title="Bild-Pin"
                  >
                    <MapPin className="size-4" />
                  </Button>
                  <Button
                    variant={selectedTool === "character" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTool("character")}
                    className="h-9 w-9 p-0"
                    title="Charakter"
                  >
                    <User className="size-4" />
                  </Button>
                  <Button
                    variant={selectedTool === "select" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedTool("select")}
                    className="h-9 w-9 p-0"
                    title="Pipette"
                  >
                    <Pipette className="size-4" />
                  </Button>
                </div>
              )}

              {/* Tile Types (only for brush in edit mode) */}
              {mapMode === "edit" && selectedTool === "brush" && (
                <div className="flex items-center gap-1 border-r pr-2 flex-wrap">
                  {Object.entries(PRESET_COLORS)
                    .filter(([key]) => key !== "custom")
                    .map(([type, color]) => {
                      const Icon = TILE_ICONS[type as TileType];
                      return (
                        <Button
                          key={type}
                          variant={
                            selectedTileType === type ? "default" : "ghost"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedTileType(type as TileType);
                            if (type !== "custom") {
                              setBrushColor(color);
                            }
                          }}
                          className="h-9 w-9 p-0"
                          title={type}
                          style={{
                            backgroundColor:
                              selectedTileType === type ? undefined : color,
                          }}
                        >
                          {Icon && (
                            <Icon
                              className="size-4"
                              style={{
                                color:
                                  selectedTileType === type
                                    ? undefined
                                    : "white",
                              }}
                            />
                          )}
                        </Button>
                      );
                    })}
                </div>
              )}

              {/* Brush Color & Size (only for brush/eraser in edit mode) */}
              {mapMode === "edit" &&
                (selectedTool === "brush" || selectedTool === "eraser") && (
                  <>
                    {selectedTool === "brush" && (
                      <div className="flex items-center gap-2 border-r pr-2">
                        <Label className="text-xs text-muted-foreground">
                          Farbe:
                        </Label>
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => {
                            setBrushColor(e.target.value);
                            setSelectedTileType("custom");
                          }}
                          className="w-9 h-9 rounded cursor-pointer border border-border"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 border-r pr-2 min-w-[160px]">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Größe: {brushSize}
                      </Label>
                      <Slider
                        min={1}
                        max={20}
                        step={1}
                        value={[brushSize]}
                        onValueChange={(value) => setBrushSize(value[0])}
                        className="w-20"
                      />
                    </div>
                  </>
                )}

              {/* Stage Mode Controls */}
              {mapMode === "stage" && (
                <div className="flex items-center gap-2 border-r pr-2 flex-wrap">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Charakter:
                  </Label>
                  <Select
                    value={selectedCharacterForPath || ""}
                    onValueChange={setSelectedCharacterForPath}
                  >
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {characterPins.map((char) => (
                        <SelectItem key={char.id} value={char.characterId}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: char.color }}
                            />
                            {char.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSavePath}
                    disabled={currentPathPoints.length === 0}
                    className="h-9"
                  >
                    Pfad speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearPath}
                    disabled={currentPathPoints.length === 0}
                    className="h-9"
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePlayAnimation}
                    disabled={
                      !selectedCharacterForPath ||
                      !characterPaths.get(selectedCharacterForPath || "") ||
                      isAnimating
                    }
                    className="h-9"
                  >
                    {isAnimating ? (
                      <Pause className="size-4 mr-1.5" />
                    ) : (
                      <Play className="size-4 mr-1.5" />
                    )}
                    {isAnimating ? "Stop" : "Play"}
                  </Button>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Speed:
                    </Label>
                    <Slider
                      min={0.5}
                      max={3}
                      step={0.5}
                      value={[animationSpeed]}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      className="w-16"
                    />
                    <span className="text-xs text-muted-foreground">
                      {animationSpeed}x
                    </span>
                  </div>
                </div>
              )}

              {/* Actions (Edit Mode only) */}
              {mapMode === "edit" && (
                <div className="flex items-center gap-1 border-r pr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyIndex === 0}
                    className="h-9 w-9 p-0"
                    title="Rückgängig"
                  >
                    <Undo2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex === history.length - 1}
                    className="h-9 w-9 p-0"
                    title="Wiederherstellen"
                  >
                    <Redo2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-9 w-9 p-0"
                    title="Alles löschen"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFillDefault}
                    className="h-9 w-9 p-0"
                    title="Mit Standard füllen"
                  >
                    <Maximize2 className="size-4" />
                  </Button>
                </div>
              )}

              {/* Zoom */}
              <div className="flex items-center gap-1 border-r pr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-9 w-9 p-0"
                  title="Verkleinern"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="h-9 w-9 p-0"
                  title="Vergrößern"
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetView}
                  className="h-9 w-9 p-0"
                  title="Ansicht zurücksetzen"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>

              {/* Save */}
              <div className="flex items-center gap-2 ml-auto">
                {lastSaved && (
                  <span className="text-xs text-muted-foreground">
                    Gespeichert um{" "}
                    {lastSaved.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <Button size="sm" onClick={handleSave} className="h-9">
                  <Save className="size-4 mr-1.5" />
                  Speichern
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="flex-1 overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full overflow-auto relative bg-muted/20"
            onMouseLeave={handleTileMouseLeave}
          >
            <div className="inline-block p-4">
              <div
                ref={mapContainerRef}
                className="grid gap-0 border-2 border-black dark:border-gray-600 relative bg-background"
                style={{
                  gridTemplateColumns: `repeat(${mapSize}, ${tileSize}px)`,
                  gridTemplateRows: `repeat(${mapSize}, ${tileSize}px)`,
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              >
                {Array.from({ length: mapSize * mapSize }).map((_, idx) => {
                  const x = idx % mapSize;
                  const y = Math.floor(idx / mapSize);
                  const tileData = getTileData(x, y);
                  const Icon = TILE_ICONS[tileData.type];
                  const color = tileData.color || PRESET_COLORS[tileData.type];
                  const country = countries.find(
                    (c) => c.id === tileData.countryId,
                  );
                  const borderColor = country ? country.color : "transparent";

                  const isHovered = cursorPos?.x === x && cursorPos?.y === y;

                  return (
                    <div
                      key={idx}
                      className="border border-black dark:border-gray-600 flex items-center justify-center transition-colors relative group"
                      style={{
                        width: `${tileSize}px`,
                        height: `${tileSize}px`,
                        backgroundColor: color,
                        boxShadow: country
                          ? `inset 0 0 0 2px ${borderColor}`
                          : undefined,
                      }}
                      onClick={() => handleTileClick(x, y)}
                      onMouseEnter={() => handleTileMouseEnter(x, y)}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "opacity-60",
                            tileSize < 20
                              ? "size-2"
                              : tileSize < 30
                                ? "size-3"
                                : "size-4",
                          )}
                          style={{ color: "rgba(255,255,255,0.8)" }}
                        />
                      )}
                      {/* Hover Feedback */}
                      {isHovered && selectedTool !== "select" && (
                        <X
                          className={cn(
                            "absolute text-primary pointer-events-none",
                            tileSize < 20
                              ? "size-3"
                              : tileSize < 30
                                ? "size-4"
                                : "size-6",
                          )}
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Brush Cursor Preview */}
                {cursorPos &&
                  (selectedTool === "brush" || selectedTool === "eraser") && (
                    <div style={getBrushCursorStyle()} />
                  )}

                {/* Picture Pins */}
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    data-pin-id={pin.id}
                    className="absolute z-10 group cursor-move"
                    style={{
                      left: pin.x * tileSize + tileSize / 2,
                      top: pin.y * tileSize + tileSize / 2,
                      transform: "translate(-50%, -100%)",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handlePinDragStart(pin.id);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      handlePinDragEnd();
                    }}
                  >
                    {/* Pin */}
                    <div className="relative">
                      <MapPin
                        className="text-destructive fill-destructive drop-shadow-lg"
                        style={{
                          width: `${effectivePinSize * 0.4}px`,
                          height: `${effectivePinSize * 0.4}px`,
                        }}
                      />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
                        <div className="relative flex flex-col items-center">
                          <HoverCard openDelay={300}>
                            <HoverCardTrigger asChild>
                              <img
                                src={pin.imageUrl}
                                alt={pin.title}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPreview(pin.imageUrl);
                                }}
                                style={{
                                  width: `${effectivePinSize}px`,
                                  height: `${effectivePinSize}px`,
                                  objectFit: "cover",
                                }}
                                className="rounded-lg border-2 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                              />
                            </HoverCardTrigger>
                            <HoverCardContent className="w-60">
                              <div className="space-y-2">
                                <h4 className="font-medium">{pin.title}</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPin(pin);
                                    }}
                                  >
                                    <Edit3 className="size-3 mr-1" />
                                    Bearbeiten
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePin(pin.id);
                                    }}
                                  >
                                    <Trash2 className="size-3 mr-1" />
                                    Löschen
                                  </Button>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Character Pins */}
                {characterPins.map((char) => (
                  <div
                    key={char.id}
                    className="absolute z-10 group cursor-move"
                    style={{
                      left: char.x * tileSize + tileSize / 2,
                      top: char.y * tileSize + tileSize / 2,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleCharacterDragStart(char.id);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      handleCharacterDragEnd();
                    }}
                  >
                    <HoverCard openDelay={300}>
                      <HoverCardTrigger asChild>
                        <div className="relative">
                          {char.imageUrl ? (
                            <img
                              src={char.imageUrl}
                              alt={char.name}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (char.imageUrl) openPreview(char.imageUrl);
                              }}
                              style={{
                                width: `${effectivePinSize}px`,
                                height: `${effectivePinSize}px`,
                                objectFit: "cover",
                                borderColor: char.color,
                              }}
                              className="rounded-full border-4 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Avatar
                              style={{
                                width: `${effectivePinSize}px`,
                                height: `${effectivePinSize}px`,
                                borderColor: char.color,
                              }}
                              className="border-4 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                            >
                              <AvatarFallback
                                style={{ backgroundColor: char.color }}
                              >
                                {char.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-60">
                        <div className="space-y-2">
                          <h4 className="font-medium">{char.name}</h4>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCharacterPin(char.id);
                            }}
                          >
                            <Trash2 className="size-3 mr-1" />
                            Entfernen
                          </Button>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                ))}

                {/* Current Path Preview */}
                {mapMode === "stage" && currentPathPoints.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                      width: mapSize * tileSize,
                      height: mapSize * tileSize,
                    }}
                  >
                    <polyline
                      points={currentPathPoints
                        .map(
                          (p) =>
                            `${p.x * tileSize + tileSize / 2},${p.y * tileSize + tileSize / 2}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#6E59A5"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                    {currentPathPoints.map((point, idx) => (
                      <circle
                        key={idx}
                        cx={point.x * tileSize + tileSize / 2}
                        cy={point.y * tileSize + tileSize / 2}
                        r="5"
                        fill="#6E59A5"
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Map Properties */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Karten-Eigenschaften</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-name" className="text-sm">
                Kartenname
              </Label>
              <Input
                id="map-name"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map-size" className="text-sm">
                Kartengröße: {mapSize}×{mapSize}
              </Label>
              <Slider
                id="map-size"
                min={10}
                max={100}
                step={5}
                value={[mapSize]}
                onValueChange={(value) => setMapSize(value[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seed" className="text-sm">
                Seed
              </Label>
              <Input
                id="seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="z.B. 12345"
                className="h-9"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full h-9"
                disabled
                title="Coming soon"
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                Aus Seed generieren
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biome" className="text-sm">
                Biom
              </Label>
              <Select value={biome} onValueChange={setBiome}>
                <SelectTrigger id="biome" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperate">Gemäßigt</SelectItem>
                  <SelectItem value="tropical">Tropisch</SelectItem>
                  <SelectItem value="desert">Wüste</SelectItem>
                  <SelectItem value="arctic">Arktis</SelectItem>
                  <SelectItem value="savanna">Savanne</SelectItem>
                  <SelectItem value="steppe">Steppe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="climate" className="text-sm">
                Klimazone
              </Label>
              <Select value={climate} onValueChange={setClimate}>
                <SelectTrigger id="climate" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polar">Polar</SelectItem>
                  <SelectItem value="subpolar">Subpolar</SelectItem>
                  <SelectItem value="temperate-climate">Gemäßigt</SelectItem>
                  <SelectItem value="subtropical">Subtropisch</SelectItem>
                  <SelectItem value="tropical-climate">Tropisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Länder / Regionen</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowNewCountryDialog(true)}
              className="h-8"
            >
              <Plus className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {countries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine Länder erstellt
              </p>
            ) : (
              countries.map((country) => (
                <div
                  key={country.id}
                  className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: country.color }}
                  />
                  <span className="flex-1 text-sm">{country.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCountryForPaint(country.id)}
                    className={cn(
                      "h-7 px-2",
                      selectedCountryForPaint === country.id &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    <TreePine className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCountry(country.id)}
                    className="h-7 px-2"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Minimap */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Minimap</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              ref={minimapRef}
              onClick={handleMinimapClick}
              className="w-full aspect-square border border-border rounded overflow-hidden cursor-pointer bg-muted/20"
            >
              <div
                className="grid gap-0"
                style={{
                  gridTemplateColumns: `repeat(${mapSize}, 1fr)`,
                  gridTemplateRows: `repeat(${mapSize}, 1fr)`,
                  width: "100%",
                  height: "100%",
                }}
              >
                {Array.from({ length: mapSize * mapSize }).map((_, idx) => {
                  const x = idx % mapSize;
                  const y = Math.floor(idx / mapSize);
                  const tileData = getTileData(x, y);
                  const color = tileData.color || PRESET_COLORS[tileData.type];
                  return <div key={idx} style={{ backgroundColor: color }} />;
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExportJSON}
            >
              <Download className="size-4 mr-2" />
              Als JSON exportieren
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}

      {/* New Country Dialog */}
      <Dialog
        open={showNewCountryDialog}
        onOpenChange={setShowNewCountryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Land / Region</DialogTitle>
            <DialogDescription>
              Erstelle ein neues Land oder eine Region für deine Karte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country-name">Name</Label>
              <Input
                id="country-name"
                value={newCountryName}
                onChange={(e) => setNewCountryName(e.target.value)}
                placeholder="z.B. Königreich des Nordens"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-color">Farbe</Label>
              <input
                type="color"
                id="country-color"
                value={newCountryColor}
                onChange={(e) => setNewCountryColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer border border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewCountryDialog(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreateCountry}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Pin Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Bild-Pin</DialogTitle>
            <DialogDescription>
              Füge einen Bild-Pin zur Karte hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-title">Titel</Label>
              <Input
                id="pin-title"
                value={newPinTitle}
                onChange={(e) => setNewPinTitle(e.target.value)}
                placeholder="z.B. Schloss Ravencrest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-image">Bild-URL</Label>
              <Input
                id="pin-image"
                value={newPinImage}
                onChange={(e) => setNewPinImage(e.target.value)}
                placeholder="https://..."
              />
              <input
                ref={pinImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) =>
                      setNewPinImage(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => pinImageInputRef.current?.click()}
              >
                <ImageIcon className="size-4 mr-2" />
                Bild hochladen
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreatePin}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pin Dialog */}
      <Dialog open={showEditPinDialog} onOpenChange={setShowEditPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bild-Pin bearbeiten</DialogTitle>
            <DialogDescription>
              Ändere die Eigenschaften des Bild-Pins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pin-title">Titel</Label>
              <Input
                id="edit-pin-title"
                value={editPinTitle}
                onChange={(e) => setEditPinTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pin-image">Bild-URL</Label>
              <Input
                id="edit-pin-image"
                value={editPinImage}
                onChange={(e) => setEditPinImage(e.target.value)}
              />
              <input
                ref={editPinImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) =>
                      setEditPinImage(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => editPinImageInputRef.current?.click()}
              >
                <ImageIcon className="size-4 mr-2" />
                Bild hochladen
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditPinDialog(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleUpdatePin}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Character Pin Dialog */}
      <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Charakter zur Karte hinzufügen</DialogTitle>
            <DialogDescription>
              Wähle einen Charakter aus dem verknüpften Projekt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {projectCharacters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Charaktere verfügbar. Verknüpfe ein Projekt mit dieser
                Welt.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Charakter wählen</Label>
                <Select
                  value={selectedCharacterId}
                  onValueChange={setSelectedCharacterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle einen Charakter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectCharacters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: char.color }}
                          />
                          {char.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCharacterDialog(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateCharacterPin}
              disabled={!selectedCharacterId}
            >
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Overlay */}
      <ImagePreviewOverlay />
    </div>
  );
}
