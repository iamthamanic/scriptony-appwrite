/**
 * 🌍 WORLD STATS & LOGS DIALOG
 *
 * Modal mit 2 Tabs:
 * - Statistics: Categories, Assets, Connections
 * - Logs: Activity Tracking für World Changes
 *
 * Analog zu ProjectStatsLogsDialogEnhanced, aber für Worlds
 */

import { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  Globe,
  Activity,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Filter,
  Mountain,
  Users,
  Building,
  FileText,
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
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
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
} from "recharts";

// =============================================================================
// TYPES
// =============================================================================

interface WorldStatsLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  world: {
    id: string;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
  };
}

interface WorldStats {
  categories: number;
  assets: number;
  characters: number;
  linkedProjects: number;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  user_email?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WorldStatsLogsDialog({
  open,
  onOpenChange,
  world,
}: WorldStatsLogsDialogProps) {
  const [activeTab, setActiveTab] = useState("statistics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats State
  const [stats, setStats] = useState<WorldStats>({
    categories: 0,
    assets: 0,
    characters: 0,
    linkedProjects: 0,
  });

  // Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  useEffect(() => {
    if (open) {
      loadStats();
      loadLogs();
    }
  }, [open, world.id]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      // Load world categories
      const categoriesRes = await fetch(
        buildFunctionRouteUrl(
          EDGE_FUNCTIONS.WORLDBUILDING,
          `/worlds/${world.id}/categories`,
        ),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!categoriesRes.ok) {
        throw new Error("Failed to load categories");
      }

      const categoriesData = await categoriesRes.json();
      const categories = categoriesData.categories || [];

      // Calculate assets count
      const assetsCount = categories.reduce((sum: number, cat: any) => {
        return sum + (cat.items?.length || 0);
      }, 0);

      // Load characters linked to this world
      const charactersRes = await fetch(
        buildFunctionRouteUrl(
          EDGE_FUNCTIONS.WORLDBUILDING,
          `/characters?world_id=${world.id}`,
        ),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const charactersData = await charactersRes.json();
      const characters = charactersData.characters || [];

      setStats({
        categories: categories.length,
        assets: assetsCount,
        characters: characters.length,
        linkedProjects: 0, // TODO: Implement if needed
      });
    } catch (err: any) {
      console.error("Error loading world stats:", err);
      setError(err.message);
      toast.error("Fehler beim Laden der Statistiken");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);

    try {
      const token = await getAuthToken();

      // NOTE: Activity logs für Worlds sind noch nicht im Backend implementiert
      // Das wird hier vorbereitet für zukünftige Implementation
      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.LOGS, `/worlds/${world.id}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        // Logs noch nicht implementiert - zeige leere Liste
        setLogs([]);
      }
    } catch (err: any) {
      console.error("Error loading logs:", err);
      // Silently fail - logs sind optional
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // =============================================================================
  // HELPERS
  // =============================================================================

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return <Plus className="size-4 text-green-600" />;
      case "updated":
        return <Edit className="size-4 text-blue-600" />;
      case "deleted":
        return <Trash2 className="size-4 text-red-600" />;
      default:
        return <Activity className="size-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
      case "updated":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "deleted":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Heute, ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (days === 1) {
      return `Gestern, ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (days < 7) {
      return `vor ${days} Tagen`;
    } else {
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== "all" && log.entity_type !== entityFilter)
      return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col md:w-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{world.name}</DialogTitle>
              <DialogDescription>
                Statistiken und Aktivitätsverlauf
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statistics">
              <BarChart3 className="size-4 mr-2" />
              Statistiken
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="size-4 mr-2" />
              Aktivitätsverlauf
            </TabsTrigger>
          </TabsList>

          {/* STATISTICS TAB */}
          <TabsContent value="statistics" className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                <CardContent className="p-6 flex items-center gap-3">
                  <AlertCircle className="size-5 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Kategorien
                          </p>
                          <p className="text-2xl font-bold">
                            {stats.categories}
                          </p>
                        </div>
                        <Mountain className="size-8 text-primary/20" />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Assets
                          </p>
                          <p className="text-2xl font-bold">{stats.assets}</p>
                        </div>
                        <Building className="size-8 text-primary/20" />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Charaktere
                          </p>
                          <p className="text-2xl font-bold">
                            {stats.characters}
                          </p>
                        </div>
                        <Users className="size-8 text-primary/20" />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Erstellt
                          </p>
                          <p className="text-sm font-medium">
                            {world.created_at
                              ? new Date(world.created_at).toLocaleDateString(
                                  "de-DE",
                                )
                              : "-"}
                          </p>
                        </div>
                        <Calendar className="size-8 text-primary/20" />
                      </div>
                    </CardHeader>
                  </Card>
                </div>

                {/* World Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Welt-Informationen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{world.name}</p>
                    </div>
                    {world.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Beschreibung
                        </p>
                        <p className="text-sm">{world.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Erstellt am
                        </p>
                        <p className="text-sm">
                          {world.created_at
                            ? new Date(world.created_at).toLocaleString("de-DE")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Zuletzt aktualisiert
                        </p>
                        <p className="text-sm">
                          {world.updated_at
                            ? new Date(world.updated_at).toLocaleString("de-DE")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent
            value="logs"
            className="flex-1 overflow-hidden flex flex-col mt-4"
          >
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {/* Filters */}
              <div className="flex items-center gap-3">
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    <SelectItem value="world">Welt</SelectItem>
                    <SelectItem value="category">Kategorie</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="character">Charakter</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Aktionen</SelectItem>
                    <SelectItem value="created">Erstellt</SelectItem>
                    <SelectItem value="updated">Aktualisiert</SelectItem>
                    <SelectItem value="deleted">Gelöscht</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="ml-auto">
                  {filteredLogs.length} Einträge
                </Badge>
              </div>

              {/* Logs List */}
              <ScrollArea className="flex-1">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <Activity className="size-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Noch keine Aktivitäten vorhanden
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Aktivitätsverfolgung für Welten wird bald verfügbar sein
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 pr-4">
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLogs.has(log.id);

                      return (
                        <Card key={log.id} className="overflow-hidden">
                          <button
                            onClick={() => toggleLogExpansion(log.id)}
                            className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getActionIcon(log.action)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getActionColor(log.action)}>
                                    {log.action}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {log.entity_type}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {formatDate(log.created_at)}
                                  </span>
                                </div>

                                {log.details?.name && (
                                  <p className="text-sm text-muted-foreground">
                                    {log.details.name}
                                  </p>
                                )}
                              </div>

                              {isExpanded ? (
                                <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0">
                              <Separator className="mb-3" />
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
