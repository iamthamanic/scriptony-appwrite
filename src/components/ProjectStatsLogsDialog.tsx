/**
 * 📊 PROJECT STATS & LOGS DIALOG
 * 
 * ✅ PHASE 2: COMPLETE IMPLEMENTATION
 * 
 * Modal mit 2 Tabs:
 * - Statistics: Timeline Stats, Shot Analytics, Character Analytics, Media Stats
 * - Logs: Activity Tracking mit Timeline, vollständiger Attribution, Details
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Film, 
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../lib/auth/getAuthToken';
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from '../lib/api-gateway';
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
  Legend
} from 'recharts';

// =============================================================================
// TYPES
// =============================================================================

interface ProjectStatsLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    title: string;
    type: string;
    genre?: string;
    duration?: string;
    created_at?: string;
    last_edited?: string;
    last_accessed_at?: string;
  };
}

interface OverviewStats {
  timeline: {
    acts: number;
    sequences: number;
    scenes: number;
    shots: number;
    total_duration?: number;
  };
  content: {
    characters: number;
    worlds: number;
  };
  metadata: {
    type: string;
    genre?: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
}

interface ShotStats {
  total_shots: number;
  duration_stats: {
    average: number;
    min: number;
    max: number;
    total: number;
  };
  camera_angles: Record<string, number>;
  framings: Record<string, number>;
  lenses: Record<string, number>;
  movements: Record<string, number>;
}

interface CharacterStats {
  total_characters: number;
  appearances: Array<{
    character_id: string;
    name: string;
    shot_count: number;
  }>;
  most_featured: { name: string; shot_count: number } | null;
  least_featured: { name: string; shot_count: number } | null;
}

interface MediaStats {
  audio_files: number;
  images: number;
  total_storage: string;
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
  parent_path?: string | null; // NEW: Hierarchie-Pfad
}

// =============================================================================
// CHART COLORS
// =============================================================================

const CHART_COLORS = [
  '#6E59A5', // Primary Purple
  '#8B7BB8', // Light Purple
  '#9B8FC9', // Lighter Purple
  '#ABA3D9', // Lightest Purple
  '#60A5FA', // Blue
  '#34D399', // Green
  '#FBBF24', // Yellow
  '#F87171', // Red
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectStatsLogsDialog({ 
  open, 
  onOpenChange, 
  project 
}: ProjectStatsLogsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Stats states
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [shotStats, setShotStats] = useState<ShotStats | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterStats | null>(null);
  const [mediaStats, setMediaStats] = useState<MediaStats | null>(null);
  
  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  
  // NEW: Filter states
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAllStats();
    }
  }, [open, project.id]);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Load all stats in parallel
      const [overviewRes, shotRes, characterRes, mediaRes] = await Promise.all([
        fetch(buildFunctionRouteUrl(EDGE_FUNCTIONS.STATS, `/stats/project/${project.id}/overview`), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(buildFunctionRouteUrl(EDGE_FUNCTIONS.STATS, `/stats/project/${project.id}/shots`), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(buildFunctionRouteUrl(EDGE_FUNCTIONS.STATS, `/stats/project/${project.id}/characters`), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(buildFunctionRouteUrl(EDGE_FUNCTIONS.STATS, `/stats/project/${project.id}/media`), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      // Check for errors and log responses
      if (!overviewRes.ok) {
        console.error('Overview stats failed:', overviewRes.status, await overviewRes.text());
      }
      if (!shotRes.ok) {
        console.error('Shot stats failed:', shotRes.status, await shotRes.text());
      }
      if (!characterRes.ok) {
        console.error('Character stats failed:', characterRes.status, await characterRes.text());
      }
      if (!mediaRes.ok) {
        console.error('Media stats failed:', mediaRes.status, await mediaRes.text());
      }

      // Parse JSON only if responses are OK
      const overview = overviewRes.ok ? await overviewRes.json() : null;
      const shots = shotRes.ok ? await shotRes.json() : null;
      const characters = characterRes.ok ? await characterRes.json() : null;
      const media = mediaRes.ok ? await mediaRes.json() : null;

      console.log('📊 Stats loaded:', { overview, shots, characters, media });

      // Set stats directly (backend sends data without wrapper)
      setOverviewStats(overview || null);
      setShotStats(shots || null);
      setCharacterStats(characters || null);
      setMediaStats(media || null);

      // Show warning if no data
      if (!overview && !shots && !characters && !media) {
        setError('Keine Statistiken verfügbar. Bitte stelle sicher, dass die Route `scriptony-stats` erreichbar ist.');
        toast.error('Stats Backend nicht verfügbar');
      }

    } catch (error: any) {
      console.error('Error loading stats:', error);
      setError(`Fehler beim Laden der Statistiken: ${error.message}`);
      toast.error('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      console.log('[ProjectStatsLogsDialog] 🔄 loadLogs() called for project:', project.id);
      setLogsLoading(true);
      setLogsError(null);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const url = buildFunctionRouteUrl(EDGE_FUNCTIONS.LOGS, `/logs/project/${project.id}/recent`);
      console.log('[ProjectStatsLogsDialog] 📡 Fetching logs from:', url);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('[ProjectStatsLogsDialog] 📊 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ProjectStatsLogsDialog] ❌ Error response:', errorText);
        throw new Error(`Failed to load logs: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[ProjectStatsLogsDialog] ✅ Logs loaded:', data);
      setLogs(data.logs || []);
    } catch (error: any) {
      console.error('[ProjectStatsLogsDialog] ❌ Error loading activity logs:', error);
      setLogsError(`Fehler beim Laden der Activity Logs: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load logs when switching to Logs tab
  const handleTabChange = (value: string) => {
    console.log('[ProjectStatsLogsDialog] Tab changed to:', value);
    console.log('[ProjectStatsLogsDialog] Current logs.length:', logs.length);
    
    if (value === 'logs' && logs.length === 0) {
      console.log('[ProjectStatsLogsDialog] Loading logs...');
      loadLogs();
    }
  };

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format relative time for logs
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return formatDate(dateString);
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    switch (lowerAction) {
      case 'created':
      case 'create':
        return <Plus className="size-4 text-green-600" />;
      case 'updated':
      case 'update':
        return <Edit className="size-4 text-blue-600" />;
      case 'deleted':
      case 'delete':
        return <Trash2 className="size-4 text-red-600" />;
      default:
        return <Activity className="size-4 text-muted-foreground" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    switch (lowerAction) {
      case 'created':
      case 'create':
        return 'text-green-600';
      case 'updated':
      case 'update':
        return 'text-blue-600';
      case 'deleted':
      case 'delete':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  // Format log message into readable German text
  const formatLogMessage = (log: ActivityLog): string => {
    const userName = log.user?.name || log.user?.email || 'Ein Benutzer';
    const entityType = log.entity_type || 'Item';
    const action = log.action?.toLowerCase() || 'unknown';
    
    // CREATE action
    if (action === 'create' || action === 'created') {
      const title = log.details?.title || entityType;
      return `${userName} hat ${entityType} "${title}" erstellt`;
    }
    
    // DELETE action
    if (action === 'delete' || action === 'deleted') {
      const title = log.details?.title || entityType;
      return `${userName} hat ${entityType} "${title}" gelöscht`;
    }
    
    // UPDATE action - detect what changed
    if (action === 'update' || action === 'updated') {
      const changes: string[] = [];
      
      if (log.details?.new && log.details?.old) {
        const newData = log.details.new;
        const oldData = log.details.old;
        
        // Title changed
        if (newData.title && oldData.title && newData.title !== oldData.title) {
          changes.push(`den Titel von "${oldData.title}" zu "${newData.title}"`);
        }
        
        // Description changed
        if (newData.description && oldData.description && newData.description !== oldData.description) {
          changes.push(`die Beschreibung`);
        }
        
        // Color changed
        if (newData.color && oldData.color && newData.color !== oldData.color) {
          changes.push(`die Farbe`);
        }
        
        // Duration changed
        if (newData.duration !== undefined && oldData.duration !== undefined && newData.duration !== oldData.duration) {
          changes.push(`die Dauer von ${oldData.duration}s auf ${newData.duration}s`);
        }
        
        // Location changed (for scenes)
        if (newData.location && oldData.location && newData.location !== oldData.location) {
          changes.push(`den Ort von "${oldData.location}" zu "${newData.location}"`);
        }
        
        // Time of day changed (for scenes)
        if (newData.timeOfDay && oldData.timeOfDay && newData.timeOfDay !== oldData.timeOfDay) {
          changes.push(`die Tageszeit von "${oldData.timeOfDay}" zu "${newData.timeOfDay}"`);
        }
      }
      
      if (changes.length > 0) {
        return `${userName} hat ${changes.join(', ')} bei ${entityType} geändert`;
      }
      
      // Fallback for unknown changes
      return `${userName} hat ${entityType} aktualisiert`;
    }
    
    // Fallback
    return `${userName} hat eine Aktion bei ${entityType} ausgeführt`;
  };

  // Convert object to chart data
  const objectToChartData = (obj: Record<string, number>) => {
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
  };

  // Transform data for charts
  const getCameraAnglesData = () => {
    if (!shotStats) return [];
    return Object.entries(shotStats.camera_angles).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getFramingsData = () => {
    if (!shotStats) return [];
    return Object.entries(shotStats.framings).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getCharacterAppearancesData = () => {
    if (!characterStats) return [];
    return characterStats.appearances.slice(0, 10); // Top 10
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            {project.title} - Stats & Logs
          </DialogTitle>
          <DialogDescription>
            Statistiken und Aktivitäts-Logs für dieses Projekt
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="statistics" className="w-full" onValueChange={handleTabChange}>
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
                  <div className="flex items-start gap-3 text-destructive mb-3">
                    <AlertCircle className="size-5 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-1">{error}</div>
                      <div className="text-sm text-muted-foreground">
                        Bitte stelle sicher, dass die benoetigten Backend-Funktionen erreichbar sind:
                      </div>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                        <li>scriptony-stats</li>
                        <li>scriptony-logs</li>
                      </ul>
                      <div className="text-xs text-muted-foreground mt-2">
                        Siehe: <code className="bg-muted px-1 py-0.5 rounded">DEPLOY_project_stats_logs_PHASE2_READY.md</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : !overviewStats && !shotStats && !characterStats && !mediaStats ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground mb-2">Keine Statistiken verfügbar</div>
                  <div className="text-sm text-muted-foreground">
                    Die benoetigten Backend-Funktionen sind moeglicherweise noch nicht bereit.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Timeline Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Film className="size-4 text-primary" />
                      Timeline Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                      <span className="text-xs text-muted-foreground">Acts</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {overviewStats?.timeline?.acts ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                      <span className="text-xs text-muted-foreground">Sequences</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overviewStats?.timeline?.sequences ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-100 dark:border-pink-900">
                      <span className="text-xs text-muted-foreground">Scenes</span>
                      <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                        {overviewStats?.timeline?.scenes ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-100 dark:border-yellow-900">
                      <span className="text-xs text-muted-foreground">Shots</span>
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {overviewStats?.timeline?.shots ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Shot Analytics */}
                {shotStats && shotStats.total_shots > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Camera className="size-4 text-primary" />
                        Shot Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Duration Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Durchschnitt</div>
                          <div className="text-xl font-bold">{shotStats.duration_stats.average}s</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Minimum</div>
                          <div className="text-xl font-bold">{shotStats.duration_stats.min}s</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Maximum</div>
                          <div className="text-xl font-bold">{shotStats.duration_stats.max}s</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Gesamt</div>
                          <div className="text-xl font-bold">{Math.floor(shotStats.duration_stats.total / 60)}min</div>
                        </div>
                      </div>

                      {/* Camera Angles Chart */}
                      {getCameraAnglesData().length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Kamera-Winkel</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={getCameraAnglesData()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" fontSize={12} />
                              <YAxis fontSize={12} />
                              <Tooltip />
                              <Bar dataKey="value" fill={CHART_COLORS[0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Framings Chart */}
                      {getFramingsData().length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Bildausschnitte</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={getFramingsData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {getFramingsData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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

                {/* Character Analytics */}
                {characterStats && characterStats.total_characters > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        Character Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Top Characters */}
                      {getCharacterAppearancesData().length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Top 10 Characters (by Appearances)</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={getCharacterAppearancesData()} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" fontSize={12} />
                              <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                              <Tooltip />
                              <Bar dataKey="shot_count" fill={CHART_COLORS[0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Featured Characters */}
                      <div className="grid grid-cols-2 gap-3">
                        {characterStats.most_featured && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                            <div className="text-xs text-muted-foreground mb-1">Most Featured</div>
                            <div className="font-semibold">{characterStats.most_featured.name}</div>
                            <div className="text-xs text-muted-foreground">{characterStats.most_featured.shot_count} shots</div>
                          </div>
                        )}
                        {characterStats.least_featured && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900">
                            <div className="text-xs text-muted-foreground mb-1">Least Featured</div>
                            <div className="font-semibold">{characterStats.least_featured.name}</div>
                            <div className="text-xs text-muted-foreground">{characterStats.least_featured.shot_count} shots</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Media Analytics */}
                {mediaStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="size-4 text-primary" />
                        Media Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900">
                        <Music className="size-5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{mediaStats.audio_files}</div>
                        <div className="text-xs text-muted-foreground">Audio Files</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-100 dark:border-yellow-900">
                        <ImageIcon className="size-5 mx-auto mb-1 text-yellow-600 dark:text-yellow-500" />
                        <div className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{mediaStats.images}</div>
                        <div className="text-xs text-muted-foreground">Images</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                        <TrendingUp className="size-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{mediaStats.total_storage}</div>
                        <div className="text-xs text-muted-foreground">Total Storage</div>
                      </div>
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
                        Siehe: <code className="bg-muted px-1 py-0.5 rounded">DEPLOY_project_stats_logs_PHASE2_READY.md</code>
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
                        <div key={log.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
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