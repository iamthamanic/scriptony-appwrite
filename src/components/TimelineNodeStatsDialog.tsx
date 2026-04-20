/**
 * 📊 TIMELINE NODE STATS & LOGS DIALOG
 *
 * Universal Stats Dialog für Act / Sequence / Scene / Shot
 *
 * Design Pattern: Wie ProjectStatsLogsDialog
 * - 2 Tabs: Statistics, Logs
 * - Container-spezifische Statistiken
 * - Timeline Analytics
 * - Character Analytics (für Scenes/Shots)
 * - Media Analytics (Audio, Images)
 * - Activity Logs mit vollständiger Attribution
 */

import { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  Film,
  BookOpen,
  Users,
  Activity,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Music,
  Image as ImageIcon,
  Camera,
  TrendingUp,
  MapPin,
  Sun,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../lib/api-gateway";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Act, Sequence, Scene, Shot } from "../lib/types";

// =============================================================================
// TYPES
// =============================================================================

type NodeType = "act" | "sequence" | "scene" | "shot";

interface TimelineNodeStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeType: NodeType;
  node: Act | Sequence | Scene | Shot;
  projectId: string;
  projectType?: string; // 🎯 NEW: 'film' | 'book' to determine labels
}

interface NodeStats {
  // Structure
  sequences?: number;
  scenes?: number;
  shots?: number;

  // Duration
  total_duration?: number;
  average_duration?: number;

  // Content
  characters?: number;
  has_dialog?: boolean;
  has_notes?: boolean;
  has_audio?: boolean;
  has_image?: boolean;

  // Camera stats (for shots)
  camera_angle?: string | null;
  framing?: string | null;
  lens?: string | null;
  camera_movement?: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

interface DetailedStats {
  // Shot breakdown by camera settings
  camera_angles?: Record<string, number>;
  framings?: Record<string, number>;
  lenses?: Record<string, number>;
  movements?: Record<string, number>;

  // Duration distribution
  duration_stats?: {
    min: number;
    max: number;
    average: number;
    total: number;
  };

  // Character appearances (for scenes/acts/sequences)
  character_appearances?: Array<{
    character_id: string;
    name: string;
    shot_count: number;
  }>;

  // Media counts
  audio_files?: number;
  images?: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  entity_type: string;
  entity_id: string;
  action: string;
  details: any;
}

// =============================================================================
// CHART COLORS
// =============================================================================

const CHART_COLORS = [
  "#6E59A5", // Primary Purple
  "#8B7BB8", // Light Purple
  "#9B8FC9", // Lighter Purple
  "#ABA3D9", // Lightest Purple
  "#60A5FA", // Blue
  "#34D399", // Green
  "#FBBF24", // Yellow
  "#F87171", // Red
];

// =============================================================================
// COMPONENT
// =============================================================================

export function TimelineNodeStatsDialog({
  open,
  onOpenChange,
  nodeType,
  node,
  projectId,
  projectType,
}: TimelineNodeStatsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats states
  const [basicStats, setBasicStats] = useState<NodeStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(
    null,
  );

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open, node.id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Load basic stats
      const basicRes = await fetch(
        buildFunctionRouteUrl(
          EDGE_FUNCTIONS.STATS,
          `/stats/${nodeType}/${node.id}`,
        ),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!basicRes.ok) {
        throw new Error(`Failed to load ${nodeType} stats`);
      }

      const basic = await basicRes.json();
      setBasicStats(basic || null);

      // Load detailed stats for containers (act, sequence, scene)
      if (nodeType !== "shot") {
        try {
          const detailedRes = await fetch(
            buildFunctionRouteUrl(
              EDGE_FUNCTIONS.STATS,
              `/stats/${nodeType}/${node.id}/detailed`,
            ),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (detailedRes.ok) {
            const detailed = await detailedRes.json();
            setDetailedStats(detailed || null);
          }
        } catch (err) {
          console.log("Detailed stats not available (optional)");
        }
      }
    } catch (error: any) {
      console.error(`Error loading ${nodeType} stats:`, error);
      setError(`Fehler beim Laden der Statistiken: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      console.log(
        "[TimelineNodeStatsDialog] 🔄 loadLogs() called for:",
        nodeType,
        node.id,
      );
      setLogsLoading(true);
      setLogsError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const url = buildFunctionRouteUrl(
        EDGE_FUNCTIONS.LOGS,
        `/logs/${nodeType}/${node.id}/recent`,
      );
      console.log("[TimelineNodeStatsDialog] 📡 Fetching logs from:", url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(
        "[TimelineNodeStatsDialog] 📊 Response status:",
        response.status,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[TimelineNodeStatsDialog] ❌ Error response:",
          errorText,
        );
        throw new Error(
          `Failed to load logs: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("[TimelineNodeStatsDialog] ✅ Logs loaded:", data);
      setLogs(data.logs || []);
    } catch (error: any) {
      console.error(
        "[TimelineNodeStatsDialog] ❌ Error loading activity logs:",
        error,
      );
      setLogsError(`Fehler beim Laden der Activity Logs: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    console.log("[TimelineNodeStatsDialog] Tab changed to:", value);
    console.log("[TimelineNodeStatsDialog] Current logs.length:", logs.length);
    console.log(
      "[TimelineNodeStatsDialog] nodeType:",
      nodeType,
      "node.id:",
      node.id,
    );

    if (value === "logs" && logs.length === 0) {
      console.log("[TimelineNodeStatsDialog] Loading logs...");
      loadLogs();
    }
  };

  // Format helpers
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      ", " +
      date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "gerade eben";
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
    return formatDate(dateString);
  };

  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    switch (lowerAction) {
      case "created":
      case "create":
        return <Plus className="size-4 text-green-600" />;
      case "updated":
      case "update":
        return <Edit className="size-4 text-blue-600" />;
      case "deleted":
      case "delete":
        return <Trash2 className="size-4 text-red-600" />;
      default:
        return <Activity className="size-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
      case "create":
        return "text-green-600";
      case "updated":
      case "update":
        return "text-blue-600";
      case "deleted":
      case "delete":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const formatLogMessage = (log: ActivityLog): string => {
    const userName = log.user?.name || log.user?.email || "Ein Benutzer";
    const action = log.action?.toLowerCase() || "unknown";

    // CREATE action
    if (action === "create" || action === "created") {
      const title = log.details?.title || getNodeTitle();
      return `${userName} hat "${title}" erstellt`;
    }

    // DELETE action
    if (action === "delete" || action === "deleted") {
      const title = log.details?.title || getNodeTitle();
      return `${userName} hat "${title}" gelöscht`;
    }

    // UPDATE action - detect what changed
    if (action === "update" || action === "updated") {
      const changes: string[] = [];

      if (log.details?.new && log.details?.old) {
        const newData = log.details.new;
        const oldData = log.details.old;

        // Title changed
        if (newData.title && oldData.title && newData.title !== oldData.title) {
          changes.push(
            `den Titel von "${oldData.title}" zu "${newData.title}"`,
          );
        }

        // Description changed
        if (
          newData.description &&
          oldData.description &&
          newData.description !== oldData.description
        ) {
          changes.push(`die Beschreibung`);
        }

        // Color changed
        if (newData.color && oldData.color && newData.color !== oldData.color) {
          changes.push(`die Farbe`);
        }

        // Duration changed
        if (
          newData.duration !== undefined &&
          oldData.duration !== undefined &&
          newData.duration !== oldData.duration
        ) {
          changes.push(
            `die Dauer von ${oldData.duration}s auf ${newData.duration}s`,
          );
        }

        // Location changed (for scenes)
        if (
          newData.location &&
          oldData.location &&
          newData.location !== oldData.location
        ) {
          changes.push(
            `den Ort von "${oldData.location}" zu "${newData.location}"`,
          );
        }

        // Time of day changed (for scenes)
        if (
          newData.timeOfDay &&
          oldData.timeOfDay &&
          newData.timeOfDay !== oldData.timeOfDay
        ) {
          changes.push(
            `die Tageszeit von "${oldData.timeOfDay}" zu "${newData.timeOfDay}"`,
          );
        }
      }

      if (changes.length > 0) {
        return `${userName} hat ${changes.join(", ")} geändert`;
      }

      // Fallback for unknown changes
      return `${userName} hat Änderungen vorgenommen`;
    }

    // Fallback
    return `${userName} hat eine Aktion ausgeführt`;
  };

  const getNodeTitle = () => {
    if ("title" in node) return node.title;
    if ("shotNumber" in node) return (node as Shot).shotNumber;
    return "Node";
  };

  const getNodeTypeLabel = () => {
    // 🎯 Dynamic labels based on projectType
    if (projectType === "book") {
      switch (nodeType) {
        case "act":
          return "Act";
        case "sequence":
          return "Kapitel";
        case "scene":
          return "Abschnitt";
        case "shot":
          return "Shot"; // Should not exist in books
      }
    }

    // Film/Series defaults
    switch (nodeType) {
      case "act":
        return "Act";
      case "sequence":
        return "Sequenz";
      case "scene":
        return "Szene";
      case "shot":
        return "Shot";
    }
  };

  const getNodeColor = () => {
    switch (nodeType) {
      case "act":
        return "blue";
      case "sequence":
        return "green";
      case "scene":
        return "pink";
      case "shot":
        return "purple";
    }
  };

  const color = getNodeColor();

  // Chart data helpers
  const getCameraAnglesData = () => {
    if (!detailedStats?.camera_angles) return [];
    return Object.entries(detailedStats.camera_angles).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getFramingsData = () => {
    if (!detailedStats?.framings) return [];
    return Object.entries(detailedStats.framings).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getCharacterAppearancesData = () => {
    if (!detailedStats?.character_appearances) return [];
    return detailedStats.character_appearances.slice(0, 10); // Top 10
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            {getNodeTypeLabel()}: {getNodeTitle()} - Statistics & Locks
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-4">
            <span>
              Statistiken und Aktivitäts-Logs für diesen {getNodeTypeLabel()}
            </span>
            <button
              onClick={() => {
                loadStats();
                if (logs.length > 0) loadLogs();
              }}
              disabled={loading || logsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Statistiken aktualisieren"
            >
              <RefreshCw
                className={`size-4 ${loading || logsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="statistics"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statistics">
              <BarChart3 className="size-4 mr-2" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="size-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/* STATISTICS TAB */}
          {/* ============================================================= */}

          <TabsContent value="statistics" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 text-destructive">
                    <AlertCircle className="size-5 mt-0.5" />
                    <div className="text-sm">{error}</div>
                  </div>
                </CardContent>
              </Card>
            ) : !basicStats ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Keine Statistiken verfügbar
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Basic Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {projectType === "book" ? (
                        <BookOpen className="size-4 text-primary" />
                      ) : (
                        <Film className="size-4 text-primary" />
                      )}
                      {getNodeTypeLabel()} Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Typ
                        </div>
                        <Badge
                          variant="outline"
                          className={`bg-${color}-50 dark:bg-${color}-950/20 border-${color}-200 dark:border-${color}-800`}
                        >
                          {getNodeTypeLabel()}
                        </Badge>
                      </div>

                      {"actNumber" in node && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Act Nummer
                          </div>
                          <div className="font-semibold">
                            {(node as Act).actNumber}
                          </div>
                        </div>
                      )}

                      {"sequenceNumber" in node && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {projectType === "book"
                              ? "Kapitel Nummer"
                              : "Sequenz Nummer"}
                          </div>
                          <div className="font-semibold">
                            {(node as Sequence).sequenceNumber}
                          </div>
                        </div>
                      )}

                      {"sceneNumber" in node && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {projectType === "book"
                              ? "Abschnitt Nummer"
                              : "Szenen Nummer"}
                          </div>
                          <div className="font-semibold">
                            {(node as Scene).sceneNumber}
                          </div>
                        </div>
                      )}
                    </div>

                    {"description" in node && node.description && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Beschreibung
                        </div>
                        <div className="text-sm p-2 bg-muted/50 rounded">
                          {node.description}
                        </div>
                      </div>
                    )}

                    {nodeType === "scene" && (
                      <>
                        {(node as Scene).location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Location
                              </div>
                              <div className="text-sm">
                                {(node as Scene).location}
                              </div>
                            </div>
                          </div>
                        )}
                        {(node as Scene).timeOfDay && (
                          <div className="flex items-center gap-2">
                            <Sun className="size-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Tageszeit
                              </div>
                              <Badge variant="outline">
                                {(node as Scene).timeOfDay}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground mb-1">
                          Erstellt
                        </div>
                        <div>{formatDate(basicStats?.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">
                          Zuletzt bearbeitet
                        </div>
                        <div>{formatDate(basicStats?.updated_at)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Structure Overview (for containers) */}
                {(basicStats.sequences !== undefined ||
                  basicStats.scenes !== undefined ||
                  basicStats.shots !== undefined) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {projectType === "book" ? (
                          <BookOpen className="size-4 text-primary" />
                        ) : (
                          <Film className="size-4 text-primary" />
                        )}
                        Struktur-Übersicht
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Sequences / Kapitel */}
                      {basicStats.sequences !== undefined && (
                        <div className="flex flex-col gap-1 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                          <span className="text-xs text-muted-foreground">
                            {projectType === "book" ? "Kapitel" : "Sequenzen"}
                          </span>
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {basicStats.sequences}
                          </span>
                        </div>
                      )}
                      {/* Scenes / Abschnitte */}
                      {basicStats.scenes !== undefined && (
                        <div className="flex flex-col gap-1 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-100 dark:border-pink-900">
                          <span className="text-xs text-muted-foreground">
                            {projectType === "book" ? "Abschnitte" : "Szenen"}
                          </span>
                          <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                            {basicStats.scenes}
                          </span>
                        </div>
                      )}
                      {/* Shots - nur für Film-Projekte anzeigen */}
                      {basicStats.shots !== undefined &&
                        projectType !== "book" && (
                          <div className="flex flex-col gap-1 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-100 dark:border-yellow-900">
                            <span className="text-xs text-muted-foreground">
                              Shots
                            </span>
                            <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                              {basicStats.shots}
                            </span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}

                {/* Duration Stats */}
                {(basicStats.total_duration !== undefined ||
                  basicStats.average_duration !== undefined ||
                  detailedStats?.duration_stats) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        Dauer-Statistiken
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {basicStats.total_duration !== undefined && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">
                            Gesamt
                          </div>
                          <div className="text-xl font-bold">
                            {Math.floor(basicStats.total_duration / 60)}min{" "}
                            {basicStats.total_duration % 60}s
                          </div>
                        </div>
                      )}
                      {basicStats.average_duration !== undefined && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">
                            Durchschnitt
                          </div>
                          <div className="text-xl font-bold">
                            {basicStats.average_duration}s
                          </div>
                        </div>
                      )}
                      {detailedStats?.duration_stats && (
                        <>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              Minimum
                            </div>
                            <div className="text-xl font-bold">
                              {detailedStats.duration_stats.min}s
                            </div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              Maximum
                            </div>
                            <div className="text-xl font-bold">
                              {detailedStats.duration_stats.max}s
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Shot Analytics (camera settings from detailed stats OR basic shot stats) */}
                {(nodeType === "shot" || detailedStats) && (
                  <>
                    {/* Camera Settings Card (for single shot) */}
                    {nodeType === "shot" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Camera className="size-4 text-primary" />
                            Kamera Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Winkel
                              </div>
                              {basicStats.camera_angle ? (
                                <Badge variant="outline">
                                  {basicStats.camera_angle}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Bildausschnitt
                              </div>
                              {basicStats.framing ? (
                                <Badge variant="outline">
                                  {basicStats.framing}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Linse
                              </div>
                              {basicStats.lens ? (
                                <Badge variant="outline">
                                  {basicStats.lens}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Bewegung
                              </div>
                              {basicStats.camera_movement ? (
                                <Badge variant="outline">
                                  {basicStats.camera_movement}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Content Indicators */}
                          <div className="flex flex-wrap gap-2">
                            {basicStats.has_dialog && (
                              <Badge variant="secondary" className="gap-1">
                                <Edit className="size-3" />
                                Dialog
                              </Badge>
                            )}
                            {basicStats.has_notes && (
                              <Badge variant="secondary" className="gap-1">
                                <Activity className="size-3" />
                                Notes
                              </Badge>
                            )}
                            {basicStats.has_audio && (
                              <Badge variant="secondary" className="gap-1">
                                <Music className="size-3" />
                                Audio
                              </Badge>
                            )}
                            {basicStats.has_image && (
                              <Badge variant="secondary" className="gap-1">
                                <ImageIcon className="size-3" />
                                Image
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Camera Analytics Charts (for containers) */}
                    {detailedStats &&
                      (getCameraAnglesData().length > 0 ||
                        getFramingsData().length > 0) && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Camera className="size-4 text-primary" />
                              Shot Analytics
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Camera Angles Chart */}
                            {getCameraAnglesData().length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-3">
                                  Kamera-Winkel
                                </h4>
                                <ResponsiveContainer width="100%" height={200}>
                                  <BarChart data={getCameraAnglesData()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Bar
                                      dataKey="value"
                                      fill={CHART_COLORS[0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}

                            {/* Framings Chart */}
                            {getFramingsData().length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-3">
                                  Bildausschnitte
                                </h4>
                                <ResponsiveContainer width="100%" height={200}>
                                  <PieChart>
                                    <Pie
                                      data={getFramingsData()}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) =>
                                        `${name} (${(percent * 100).toFixed(0)}%)`
                                      }
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {getFramingsData().map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={
                                            CHART_COLORS[
                                              index % CHART_COLORS.length
                                            ]
                                          }
                                        />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                  </>
                )}

                {/* Character Analytics */}
                {(basicStats.characters !== undefined &&
                  basicStats.characters > 0) ||
                  (getCharacterAppearancesData().length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="size-4 text-primary" />
                          Character Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {basicStats.characters !== undefined &&
                          basicStats.characters > 0 && (
                            <div
                              className={`text-center p-3 bg-${color}-50 dark:bg-${color}-950/20 rounded-lg border border-${color}-100 dark:border-${color}-900`}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                Involvierte Characters
                              </div>
                              <div
                                className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}
                              >
                                {basicStats.characters}
                              </div>
                            </div>
                          )}

                        {/* Character Appearances Chart */}
                        {getCharacterAppearancesData().length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3">
                              Top Characters (by Appearances)
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart
                                data={getCharacterAppearancesData()}
                                layout="vertical"
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" fontSize={12} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={100}
                                  fontSize={12}
                                />
                                <Tooltip />
                                <Bar
                                  dataKey="shot_count"
                                  fill={CHART_COLORS[0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                {/* Media Analytics */}
                {(detailedStats?.audio_files !== undefined ||
                  detailedStats?.images !== undefined) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="size-4 text-primary" />
                        Media Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      {detailedStats?.audio_files !== undefined && (
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900">
                          <Music className="size-5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
                          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {detailedStats.audio_files}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Audio Files
                          </div>
                        </div>
                      )}
                      {detailedStats?.images !== undefined && (
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-100 dark:border-yellow-900">
                          <ImageIcon className="size-5 mx-auto mb-1 text-yellow-600 dark:text-yellow-500" />
                          <div className="text-xl font-bold text-yellow-600 dark:text-yellow-500">
                            {detailedStats.images}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Images
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/* LOGS TAB */}
          {/* ============================================================= */}

          <TabsContent value="logs" className="mt-4">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : logsError ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 text-destructive mb-3">
                    <AlertCircle className="size-5 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-1">{logsError}</div>
                      <div className="text-sm text-muted-foreground">
                        Die Route `scriptony-logs` ist aktuell nicht erreichbar.
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Siehe:{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">
                          DEPLOY_LOGS_TIMELINE_NODE_ROUTES_FIX.md
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Keine Activity Logs vorhanden
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="mt-0.5">
                            {getActionIcon(log.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed">
                                  {formatLogMessage(log)}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(log.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
