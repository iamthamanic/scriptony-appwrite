import { useState, useRef, useEffect, useMemo, useId } from "react";
import { Film, Plus, ChevronRight, ArrowLeft, Upload, X, Info, Search, Calendar as CalendarIcon, Camera, Edit2, Save, GripVertical, Image as ImageIcon, AtSign, Globe, ChevronDown, User, Trash2, AlertTriangle, Loader2, List, MoreVertical, Copy, BarChart3, ChevronUp, Tv, Book, Headphones, Layers, Clock } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SceneCharacterBadge } from "../SceneCharacterBadge";
import { WorldReferenceAutocomplete } from "../WorldReferenceAutocomplete";
import { useColoredTags } from "../hooks/useColoredTags";
import { ImageCropDialog } from "../ImageCropDialog";
import { LoadingSpinner } from "../LoadingSpinner";
import { FilmDropdown } from "../FilmDropdown";
import { StructureBeatsSection } from "../StructureBeatsSection";
import { ProjectStatsLogsDialog } from "../ProjectStatsLogsDialogEnhanced";
import { InspirationCard, ProjectInspiration } from "../InspirationCard";
import { AddInspirationDialog, InspirationData } from "../AddInspirationDialog";
import { ProjectCarousel } from "../ProjectCarousel";
import { ProjectDebugger } from "../ProjectDebugger";
import { projectsApi, worldsApi, itemsApi } from "../../utils/api";
import { toast } from "sonner@2.0.3";
import { deleteCharacter as deleteCharacterApi, getCharacters, createCharacter as createCharacterApi, updateCharacter as updateCharacterApi } from "../../lib/api/characters-api";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import {
  validateImageFile,
  needsGifUserConfirmation,
  type ImageUploadGifMode,
} from "../../lib/api/image-upload-api";
import { startBackgroundUpload } from "../../lib/background-upload";
import { STORAGE_CONFIG } from "../../lib/config";
import { GifAnimationUploadDialog } from "../GifAnimationUploadDialog";
import { ImageUploadWaveOverlay } from "../ImageUploadWaveOverlay";
import * as TimelineAPI from "../../lib/api/timeline-api";
import { nodeToAct, nodeToSequence, nodeToScene } from "../../lib/api/timeline-api"; // 🔥 Import converters
import * as TimelineAPIV2 from "../../lib/api/timeline-api-v2";
import * as ShotsAPI from "../../lib/api/shots-api";
import * as InspirationsAPI from "../../lib/api/inspirations-api";
import * as BeatsAPI from "../../lib/api/beats-api";
import { BEAT_TEMPLATES } from "../../lib/beat-templates";
import type { TimelineData } from "../FilmDropdown";
import { importScriptFileToProject, SCRIPT_IMPORT_ACCEPT } from "../../lib/script-import";
import { cn } from "../ui/utils";
import {
  createDefaultConceptBlocks,
  normalizeConceptBlocks,
  type ConceptBlock,
} from "../../lib/concept-blocks";

/** Preset genres for new/edit project picker; custom labels are stored in the same comma-separated `genre` field. */
export const PROJECT_PRESET_GENRES = [
  "Action",
  "Abenteuer",
  "Komödie",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romantik",
  "Science Fiction",
  "Slice of Life",
  "Übernatürlich",
  "Thriller",
] as const;

const PROJECT_PRESET_GENRE_SET = new Set<string>(PROJECT_PRESET_GENRES as unknown as string[]);

function parseProjectGenreField(genre: string | undefined): string[] {
  if (!genre?.trim()) return [];
  return genre.split(", ").map((s) => s.trim()).filter(Boolean);
}

function customGenresFromSelection(genres: string[]): string[] {
  return [...new Set(genres.filter((g) => !PROJECT_PRESET_GENRE_SET.has(g)))];
}

function getProjectLastEditedAt(project: any): string | null {
  return (
    project?.last_edited ||
    project?.updated_at ||
    project?.updatedAt ||
    project?.modified_at ||
    project?.modifiedAt ||
    project?.created_at ||
    project?.createdAt ||
    null
  );
}

type GenrePillGridProps = {
  selected: string[];
  onSelectedChange: React.Dispatch<React.SetStateAction<string[]>>;
  customPool: string[];
  onCustomPoolChange: React.Dispatch<React.SetStateAction<string[]>>;
  compact?: boolean;
};

/**
 * Preset genre pills + optional custom genres (same button style). "+" opens popover to add a label.
 * Location: used on ProjectsPage (new project + project detail edit).
 */
function GenrePillGrid({
  selected,
  onSelectedChange,
  customPool,
  onCustomPoolChange,
  compact,
}: GenrePillGridProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const displayGenres = useMemo(() => {
    const extras = customPool.filter((g) => !PROJECT_PRESET_GENRE_SET.has(g));
    return [...PROJECT_PRESET_GENRES, ...extras];
  }, [customPool]);

  const toggle = (genre: string) => {
    onSelectedChange((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const addCustom = () => {
    const name = draft.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const exists = displayGenres.some((g) => g.toLowerCase() === lower);
    if (exists) {
      toast.error("Dieses Genre gibt es schon.");
      return;
    }
    onCustomPoolChange((prev) => [...prev, name]);
    onSelectedChange((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDraft("");
    setAddOpen(false);
  };

  const pillBase = compact
    ? "px-3 py-1.5 rounded-lg border transition-all text-sm"
    : "px-4 py-2 rounded-lg border transition-all text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {displayGenres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => toggle(genre)}
          className={cn(
            pillBase,
            selected.includes(genre)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:border-primary/50"
          )}
        >
          {genre}
        </button>
      ))}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              pillBase,
              "border-dashed bg-background border-border hover:border-primary/50 inline-flex items-center justify-center min-w-[2.5rem]"
            )}
            aria-label="Eigenes Genre hinzufügen"
          >
            <Plus className="size-4 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <Label htmlFor={inputId}>Eigenes Genre</Label>
            <Input
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="z. B. Cyberpunk"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button type="button" size="sm" className="w-full" onClick={addCustom}>
              Hinzufügen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ProjectsPageProps {
  selectedProjectId?: string;
  onNavigate: (page: string, id?: string) => void;
}

// Helper function to get project type display info
const getProjectTypeInfo = (rawType: string) => {
  const normalized = (rawType || "").toLowerCase().trim();
  const aliases: Record<string, string> = {
    movie: "film",
    kino: "film",
    serie: "series",
    serial: "series",
    buch: "book",
    roman: "book",
    hoerspiel: "audio",
    hörspiel: "audio",
    audio_book: "audio",
    audiobook: "audio",
  };
  const key = aliases[normalized] || normalized;

  const typeMap: Record<string, { label: string; Icon: any }> = {
    film: { label: "Film", Icon: Film },
    series: { label: "Serie", Icon: Tv },
    book: { label: "Buch", Icon: Book },
    audio: { label: "Hörspiel", Icon: Headphones },
  };
  return typeMap[key] || { label: rawType?.charAt(0).toUpperCase() + rawType?.slice(1), Icon: Film };
};

/** Card title for project info blocks: Lucide icon matches project type (film / series / book / audio). */
function ProjectInfoSectionTitle({ projectType }: { projectType: string }) {
  const { Icon } = getProjectTypeInfo(projectType);
  return (
    <CardTitle className="text-base flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      Projekt-Informationen
    </CardTitle>
  );
}

export function ProjectsPage({ selectedProjectId, onNavigate }: ProjectsPageProps) {
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(selectedProjectId);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [newProjectCustomGenres, setNewProjectCustomGenres] = useState<string[]>([]);
  const [projectInspirationNotes, setProjectInspirationNotes] = useState<string[]>([""]); // Renamed to avoid conflict
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [projectCoverImages, setProjectCoverImages] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<"carousel" | "list">(() => {
    // 💾 Load from localStorage, fallback to desktop default "list", mobile default "carousel"
    const saved = localStorage.getItem("scriptony_projects_view_mode");
    if (saved === "carousel" || saved === "list") return saved;
    // Desktop default: list, Mobile default: carousel
    return window.innerWidth >= 768 ? "list" : "carousel";
  });
  const [typeFilter, setTypeFilter] = useState<string | null>(null); // Filter by project type
  
  // API State
  const [projects, setProjects] = useState<any[]>([]);
  const [worlds, setWorlds] = useState<any[]>([]);
  const [worldbuildingItems, setWorldbuildingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectType, setNewProjectType] = useState("film");
  const [newProjectLogline, setNewProjectLogline] = useState("");
  const [newProjectDuration, setNewProjectDuration] = useState("");
  const [newProjectLinkedWorld, setNewProjectLinkedWorld] = useState<string | undefined>();
  const [newProjectCoverImage, setNewProjectCoverImage] = useState<string | undefined>();
  const [newProjectCoverFile, setNewProjectCoverFile] = useState<File | undefined>();
  const newProjectCoverGifModeRef = useRef<ImageUploadGifMode | undefined>(undefined);
  const [gifPendingNewProjectCover, setGifPendingNewProjectCover] = useState<File | null>(null);
  // Cover upload runs in background — no local loading state
  const newProjectCoverInputRef = useRef<HTMLInputElement>(null);
  const newProjectScriptImportInputRef = useRef<HTMLInputElement>(null);
  const [newProjectScriptImportFile, setNewProjectScriptImportFile] = useState<File | null>(null);
  
  // 🎬 NEW: Narrative Structure & Beat Template States (Create Dialog)
  const [newProjectNarrativeStructure, setNewProjectNarrativeStructure] = useState<string>("");
  const [newProjectBeatTemplate, setNewProjectBeatTemplate] = useState<string>("");
  const [customNarrativeStructure, setCustomNarrativeStructure] = useState<string>("");
  // 📺 NEW: Episode Layout & Season Engine (Series only)
  const [newProjectEpisodeLayout, setNewProjectEpisodeLayout] = useState<string>("");
  const [newProjectSeasonEngine, setNewProjectSeasonEngine] = useState<string>("");
  const [customEpisodeLayout, setCustomEpisodeLayout] = useState<string>("");
  const [customSeasonEngine, setCustomSeasonEngine] = useState<string>("");
  const [customBeatTemplate, setCustomBeatTemplate] = useState<string>("");
  
  // 📖 NEW: Book Metrics States (Create Dialog)
  const [newProjectTargetPages, setNewProjectTargetPages] = useState<string>("");
  const [newProjectWordsPerPage, setNewProjectWordsPerPage] = useState<string>("250");
  const [newProjectReadingSpeed, setNewProjectReadingSpeed] = useState<string>("230");
  
  // Delete Project States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Stats & Logs Dialog
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedStatsProject, setSelectedStatsProject] = useState<any | null>(null);

  // 🚀 PERFORMANCE: Timeline Cache for instant loading
  const [timelineCache, setTimelineCache] = useState<Record<string, any>>({});
  const [timelineCacheLoading, setTimelineCacheLoading] = useState<Record<string, boolean>>({});

  // 🎨 Collapsible Sections State
  const [structureOpen, setStructureOpen] = useState(true); // Default: OPEN
  const [charactersOpen, setCharactersOpen] = useState(true); // Default: OPEN
  const [inspirationOpen, setInspirationOpen] = useState(false); // Default: CLOSED

  // 🎨 Inspiration State
  const [inspirations, setInspirations] = useState<any[]>([]);
  const [inspirationsLoading, setInspirationsLoading] = useState(false);
  const [showAddInspirationDialog, setShowAddInspirationDialog] = useState(false);
  const [editingInspiration, setEditingInspiration] = useState<any | null>(null);

  // Simple cache to avoid reloading on every mount
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    // Only load data once per session (simple cache)
    if (!dataLoadedRef.current) {
      loadData();
      dataLoadedRef.current = true;
    }
  }, []);

  // 💾 Persist view mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("scriptony_projects_view_mode", viewMode);
  }, [viewMode]);

  // Sync selectedProject state with selectedProjectId prop
  useEffect(() => {
    setSelectedProject(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      console.time(`⏱️ [PERF] Total Project Load: ${selectedProjectId}`);
      console.time(`⏱️ [PERF] Worldbuilding Load: ${selectedProjectId}`);
      console.time(`⏱️ [PERF] Timeline Cache Load: ${selectedProjectId}`);
      
      const project = projects.find(p => p.id === selectedProjectId);
      if (project && project.linkedWorldId) {
        loadWorldbuildingItems(project.linkedWorldId);
      }
      // 🚀 PERFORMANCE: Preload timeline data for instant dropdown
      loadTimelineDataForProject(selectedProjectId);
      
      // 🎨 INSPIRATION: Load inspirations
      loadInspirations(selectedProjectId);
    }
  }, [selectedProjectId, projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, worldsData] = await Promise.all([
        projectsApi.getAll(),
        worldsApi.getAll(),
      ]);
      setProjects(projectsData);
      setWorlds(worldsData);
      
      // 📸 Load cover images from DB into state
      const coverImages: Record<string, string> = {};
      projectsData.forEach((project: any) => {
        if (project.cover_image_url) {
          coverImages[project.id] = project.cover_image_url;
        }
      });
      setProjectCoverImages(coverImages);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const loadWorldbuildingItems = async (worldId: string) => {
    try {
      const items = await itemsApi.getAllForWorld(worldId);
      setWorldbuildingItems(items);
      console.timeEnd(`⏱️ [PERF] Worldbuilding Load: ${selectedProject}`);
    } catch (error) {
      console.error("Error loading worldbuilding items:", error);
      console.timeEnd(`⏱️ [PERF] Worldbuilding Load: ${selectedProject}`);
    }
  };

  // 🚀 PERFORMANCE: Load timeline data for cache
  const loadTimelineDataForProject = async (projectId: string) => {
    // Skip if already loading or cached
    if (timelineCacheLoading[projectId] || timelineCache[projectId]) {
      console.log('[ProjectsPage] Timeline data already loading or cached for project:', projectId);
      console.timeEnd(`⏱️ [PERF] Timeline Cache Load: ${projectId}`);
      return;
    }

    try {
      console.log('[ProjectsPage] 🚀 Loading timeline data for cache:', projectId);
      console.time(`⏱️ [PERF] Timeline API - Acts: ${projectId}`);
      console.time(`⏱️ [PERF] Timeline API - All Nodes: ${projectId}`);
      setTimelineCacheLoading(prev => ({ ...prev, [projectId]: true }));

      const token = await getAuthToken();
      if (!token) {
        console.log('[ProjectsPage] No auth token available');
        return;
      }

      // 🚀🚀🚀 ULTRA-FAST: Load EVERYTHING in ONE request!
      let loadedActs: any[] = [];
      let allSequences: any[] = [];
      let allScenes: any[] = [];
      let allShots: any[] = [];
      let loadedCharacters: any[] = [];
      
      try {
        // Try ULTRA BATCH LOAD first (Timeline + Characters + Shots in 1 request!)
        const ultraData = await TimelineAPIV2.ultraBatchLoadProject(projectId, token);
        
        console.timeEnd(`⏱️ [PERF] Timeline API - Acts: ${projectId}`);
        console.timeEnd(`⏱️ [PERF] Timeline API - All Nodes: ${projectId}`);
        console.log(`[ProjectsPage] 🚀🚀🚀 ULTRA batch load completed: ${ultraData.stats.totalNodes} nodes, ${ultraData.stats.characters} characters, ${ultraData.stats.shots} shots in 1 request!`);
        
        // 🔥 CONVERT: TimelineNode[] → Act[], Sequence[], Scene[] (with actId/sequenceId)
        loadedActs = (ultraData.timeline.acts || []).map(nodeToAct);
        allSequences = (ultraData.timeline.sequences || []).map(nodeToSequence);
        allScenes = (ultraData.timeline.scenes || []).map(nodeToScene);
        allShots = ultraData.shots;
        loadedCharacters = ultraData.characters;
        
      } catch (error) {
        console.error('[ProjectsPage] ULTRA batch load failed, falling back to regular batch:', error);
        
        // Fallback: Regular batch load (2 requests)
        const [batchData, allShotsData] = await Promise.all([
          TimelineAPIV2.batchLoadTimeline(projectId, token).catch(err => {
            console.error('[ProjectsPage] Error batch loading timeline:', err);
            return { acts: [], sequences: [], scenes: [], stats: { totalNodes: 0, acts: 0, sequences: 0, scenes: 0 } };
          }),
          
          ShotsAPI.getAllShotsByProject(projectId, token).catch(err => {
            console.error('[ProjectsPage] Error loading shots:', err);
            return [];
          })
        ]);
        
        console.timeEnd(`⏱️ [PERF] Timeline API - Acts: ${projectId}`);
        console.timeEnd(`⏱️ [PERF] Timeline API - All Nodes: ${projectId}`);
        console.log(`[ProjectsPage] 🚀 Batch load completed: ${batchData.stats.totalNodes} nodes in 1 request!`);
        
        // 🔥 CONVERT: TimelineNode[] → Act[], Sequence[], Scene[] (with actId/sequenceId)
        loadedActs = (batchData.acts || []).map(nodeToAct);
        allSequences = (batchData.sequences || []).map(nodeToSequence);
        allScenes = (batchData.scenes || []).map(nodeToScene);
        allShots = allShotsData;
      }
      
      // If no acts exist, initialize 3-Act structure
      if (!loadedActs || loadedActs.length === 0) {
        console.log('[ProjectsPage] No acts found, initializing 3-act structure...');
        await ShotsAPI.initializeThreeActStructure(projectId, token);
        
        // Reload after initialization - try ULTRA first, fallback to regular
        try {
          const reloadedUltra = await TimelineAPIV2.ultraBatchLoadProject(projectId, token);
          
          // 🔥 CONVERT: TimelineNode[] → Act[], Sequence[], Scene[] (with actId/sequenceId)
          const timelineData: TimelineData = {
            acts: (reloadedUltra.timeline.acts || []).map(nodeToAct),
            sequences: (reloadedUltra.timeline.sequences || []).map(nodeToSequence),
            scenes: (reloadedUltra.timeline.scenes || []).map(nodeToScene),
            shots: reloadedUltra.shots || [],
          };

          setTimelineCache(prev => ({ ...prev, [projectId]: timelineData }));
          // Note: Characters are now loaded directly in FilmDropdown, not cached here
          console.timeEnd(`⏱️ [PERF] Timeline Cache Load: ${projectId}`);
          console.log('[ProjectsPage] ✅ Timeline data cached for project (after init):', projectId, timelineData);
          return;
        } catch (error) {
          console.error('[ProjectsPage] ULTRA reload failed, using regular batch:', error);
          
          const [reloadedBatch, reloadedShots] = await Promise.all([
            TimelineAPIV2.batchLoadTimeline(projectId, token),
            ShotsAPI.getAllShotsByProject(projectId, token)
          ]);
          
          // 🔥 CONVERT: TimelineNode[] → Act[], Sequence[], Scene[] (with actId/sequenceId)
          const timelineData: TimelineData = {
            acts: (reloadedBatch.acts || []).map(nodeToAct),
            sequences: (reloadedBatch.sequences || []).map(nodeToSequence),
            scenes: (reloadedBatch.scenes || []).map(nodeToScene),
            shots: reloadedShots || [],
          };

          setTimelineCache(prev => ({ ...prev, [projectId]: timelineData }));
          console.timeEnd(`⏱️ [PERF] Timeline Cache Load: ${projectId}`);
          console.log('[ProjectsPage] ✅ Timeline data cached for project (after init):', projectId, timelineData);
          return;
        }
      }

      const timelineData: TimelineData = {
        acts: loadedActs || [],
        sequences: allSequences || [],
        scenes: allScenes || [],
        shots: allShots || [],
      };

      setTimelineCache(prev => ({ ...prev, [projectId]: timelineData }));
      console.timeEnd(`⏱️ [PERF] Timeline Cache Load: ${projectId}`);
      console.log('[ProjectsPage] ✅ Timeline data cached for project:', projectId, {
        acts: timelineData.acts.length,
        sequences: timelineData.sequences.length,
        scenes: timelineData.scenes.length,
        shots: timelineData.shots.length,
      });

    } catch (error) {
      console.error('[ProjectsPage] Error loading timeline data:', error);
      console.timeEnd(`⏱️ [PERF] Timeline Cache Load: ${projectId}`);
    } finally {
      setTimelineCacheLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // 🚀 PERFORMANCE: Update timeline cache when FilmDropdown/BookDropdown changes data
  const handleTimelineDataChange = (projectId: string, data: TimelineData) => {
    console.log('[ProjectsPage] 🔄 Updating timeline cache for project:', projectId);
    setTimelineCache(prev => ({ ...prev, [projectId]: data }));
  };

  // 🎨 INSPIRATION: Load inspirations for project
  const loadInspirations = async (projectId: string) => {
    try {
      setInspirationsLoading(true);
      const token = await getAuthToken();
      if (!token) {
        console.error('[Inspirations] No auth token');
        setInspirations([]); // Set empty array on error
        return;
      }

      console.log('[Inspirations] Loading for project:', projectId);
      const loadedInspirations = await InspirationsAPI.getInspirationsByProject(projectId, token);
      setInspirations(loadedInspirations);
      console.log(`[Inspirations] Loaded ${loadedInspirations.length} inspirations`);
    } catch (error: any) {
      console.error('[Inspirations] Error loading:', error);
      
      // Graceful fallback: Set empty array instead of crashing
      setInspirations([]);
      
      // Check if it's a "Failed to fetch" error (backend route not reachable)
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        console.warn('[Inspirations] Backend route "scriptony-inspiration" might not be reachable yet');
        console.warn(
          '[Inspirations] Deploy the scriptony-inspiration function (Appwrite or your gateway) and check VITE_BACKEND_API_BASE_URL / VITE_APPWRITE_FUNCTIONS_BASE_URL'
        );
        toast.error('Inspirations: Backend nicht erreichbar. Siehe Konsole (Deployment / Env).');
      } else {
        toast.error('Fehler beim Laden der Inspirationen');
      }
    } finally {
      setInspirationsLoading(false);
    }
  };

  // 🎨 INSPIRATION: Save (create or update)
  const handleSaveInspiration = async (data: InspirationData) => {
    if (!selectedProject) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('[Inspirations] No auth token');
        toast.error('Nicht authentifiziert');
        return;
      }

      if (editingInspiration) {
        // Update existing
        console.log('[Inspirations] Updating:', editingInspiration.id);
        await InspirationsAPI.updateInspiration(editingInspiration.id, data, token);
        toast.success('Inspiration aktualisiert');
      } else {
        // Create new
        console.log('[Inspirations] Creating new');
        await InspirationsAPI.createInspiration(
          {
            projectId: selectedProject,
            ...data,
          },
          token
        );
        toast.success('Inspiration hinzugefügt');
      }

      // Reload
      await loadInspirations(selectedProject);
      setEditingInspiration(null);
      setShowAddInspirationDialog(false);
    } catch (error: any) {
      console.error('[Inspirations] Error saving:', error);
      
      // Check if it's a deployment error
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        console.warn('[Inspirations] ⚠️ Backend route "scriptony-inspiration" might not be reachable yet');
        toast.error('Inspirations Feature ist aktuell nicht erreichbar. Bitte Backend-Funktion pruefen.');
      } else {
        toast.error('Fehler beim Speichern');
      }
    }
  };

  // 🎨 INSPIRATION: Delete
  const handleDeleteInspiration = async (id: string) => {
    if (!selectedProject) return;
    if (!confirm('Inspiration wirklich löschen?')) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Nicht authentifiziert');
        return;
      }

      console.log('[Inspirations] Deleting:', id);
      await InspirationsAPI.deleteInspiration(id, token);
      toast.success('Inspiration gelöscht');

      // Reload
      await loadInspirations(selectedProject);
    } catch (error: any) {
      console.error('[Inspirations] Error deleting:', error);
      
      // Check if it's a deployment error
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        console.warn('[Inspirations] ⚠️ Backend route "scriptony-inspiration" might not be reachable yet');
        toast.error('Inspirations Feature ist aktuell nicht erreichbar. Bitte Backend-Funktion pruefen.');
      } else {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  // 🎨 INSPIRATION: Edit
  const handleEditInspiration = (inspiration: ProjectInspiration) => {
    setEditingInspiration(inspiration);
    setShowAddInspirationDialog(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error("Bitte gib einen Projekttitel ein");
      return;
    }

    // Genre Validation: At least 1 genre required
    if (!selectedGenres || selectedGenres.length === 0) {
      toast.error("Bitte wähle mindestens ein Genre aus");
      return;
    }

    try {
      // Prepare narrative structure value (handle custom input)
      let narrativeStructureValue = newProjectNarrativeStructure;
      if (newProjectNarrativeStructure === 'custom' && customNarrativeStructure) {
        narrativeStructureValue = `custom:${customNarrativeStructure}`;
      }

      // Prepare episode layout value (handle custom input)
      let episodeLayoutValue = newProjectEpisodeLayout;
      if (newProjectEpisodeLayout === 'custom' && customEpisodeLayout) {
        episodeLayoutValue = `custom:${customEpisodeLayout}`;
      }

      // Prepare season engine value (handle custom input)
      let seasonEngineValue = newProjectSeasonEngine;
      if (newProjectSeasonEngine === 'custom' && customSeasonEngine) {
        seasonEngineValue = `custom:${customSeasonEngine}`;
      }

      // Prepare beat template value (handle custom input)
      let beatTemplateValue = newProjectBeatTemplate;
      if (newProjectBeatTemplate === 'custom' && customBeatTemplate) {
        beatTemplateValue = `custom:${customBeatTemplate}`;
      }

      // Create project WITHOUT cover image first
      const project = await projectsApi.create({
        title: newProjectTitle,
        logline: newProjectLogline,
        type: newProjectType,
        genre: selectedGenres.join(", "),
        duration: newProjectDuration,
        linkedWorldId: newProjectLinkedWorld,
        concept_blocks: createDefaultConceptBlocks(),
        inspirations: projectInspirationNotes,
        // Series: episode_layout + season_engine
        episode_layout: newProjectType === 'series' ? (episodeLayoutValue || undefined) : undefined,
        season_engine: newProjectType === 'series' ? (seasonEngineValue || undefined) : undefined,
        // Film/Book/Audio: narrative_structure
        narrative_structure: newProjectType !== 'series' ? (narrativeStructureValue || undefined) : undefined,
        beat_template: beatTemplateValue || undefined,
        // 📖 Book Metrics
        target_pages: newProjectType === 'book' ? (newProjectTargetPages ? parseInt(newProjectTargetPages) : undefined) : undefined,
        words_per_page: newProjectType === 'book' ? (newProjectWordsPerPage ? parseInt(newProjectWordsPerPage) : 250) : undefined,
        reading_speed_wpm: newProjectType === 'book' ? (newProjectReadingSpeed ? parseInt(newProjectReadingSpeed) : 230) : undefined,
      });

      // Upload cover image in background AFTER project creation
      if (newProjectCoverFile) {
        const coverFile = newProjectCoverFile;
        const gifMode = newProjectCoverGifModeRef.current;
        startBackgroundUpload({
          file: coverFile,
          target: { kind: 'project-cover', projectId: project.id },
          prepOptions: gifMode ? { gifMode } : undefined,
          onSuccess: (imageUrl) => {
            setProjectCoverImages(prev => ({ ...prev, [project.id]: imageUrl }));
          },
        });
      }

      setProjects([...projects, project]);

      const scriptFileToImport = newProjectScriptImportFile;
      if (scriptFileToImport) {
        try {
          const token = await getAuthToken();
          if (token) {
            await ShotsAPI.initializeThreeActStructure(project.id, token);
            await importScriptFileToProject(project.id, newProjectType, scriptFileToImport, token);
            toast.success("Skriptstruktur importiert");
          }
        } catch (impErr) {
          console.error("New project script import:", impErr);
          toast.error(
            impErr instanceof Error ? impErr.message : "Skript-Import fehlgeschlagen"
          );
        }
      }
      
      setShowNewProjectDialog(false);
      
      // Reset form
      setNewProjectTitle("");
      setNewProjectType("film");
      setNewProjectLogline("");
      setNewProjectDuration("");
      setNewProjectLinkedWorld(undefined);
      setNewProjectCoverImage(undefined);
      setNewProjectCoverFile(undefined);
      newProjectCoverGifModeRef.current = undefined;
      setSelectedGenres([]);
      setNewProjectCustomGenres([]);
      setInspirations([""]);
      setNewProjectNarrativeStructure("");
      setNewProjectBeatTemplate("");
      setCustomNarrativeStructure("");
      setNewProjectEpisodeLayout("");
      setNewProjectSeasonEngine("");
      setCustomEpisodeLayout("");
      setCustomSeasonEngine("");
      setCustomBeatTemplate("");
      setNewProjectTargetPages("");
      setNewProjectWordsPerPage("250");
      setNewProjectReadingSpeed("230");
      setNewProjectEpisodeLayout("");
      setNewProjectSeasonEngine("");
      setNewProjectScriptImportFile(null);
      
      toast.success("Projekt erfolgreich erstellt!");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Fehler beim Erstellen des Projekts");
    }
  };

  const applyNewProjectCoverSelection = (file: File, gifMode?: ImageUploadGifMode) => {
    newProjectCoverGifModeRef.current = gifMode;
    setNewProjectCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProjectCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleNewProjectCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    try {
      validateImageFile(file, 5);

      if (needsGifUserConfirmation(file)) {
        setGifPendingNewProjectCover(file);
        return;
      }

      applyNewProjectCoverSelection(file, undefined);
    } catch (error) {
      console.error("Error validating image:", error);
      toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
    }
  };

  const handleDeleteProject = async () => {
    if (!deletePassword.trim()) {
      toast.error("Bitte Passwort eingeben");
      return;
    }

    if (!selectedProject) return;

    setDeleteLoading(true);

    try {
      await projectsApi.delete(selectedProject, deletePassword);
      
      // Remove from local state
      setProjects(projects.filter(p => p.id !== selectedProject));
      
      // Reset states
      setShowDeleteDialog(false);
      setDeletePassword("");
      
      toast.success("Projekt erfolgreich gelöscht");
      
      // Navigate back to projects list
      onNavigate("projekte");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error(error.message || "Fehler beim Löschen des Projekts");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const originalProject = projects.find(p => p.id === projectId);
      if (!originalProject) return;

      const duplicated = await projectsApi.create({
        title: `${originalProject.title} (Kopie)`,
        logline: originalProject.logline,
        type: originalProject.type,
        genre: originalProject.genre,
        duration: originalProject.duration,
        linkedWorldId: originalProject.linkedWorldId,
        concept_blocks: normalizeConceptBlocks(originalProject.concept_blocks),
        coverImage: projectCoverImages[projectId],
      });

      setProjects([...projects, duplicated]);
      
      if (projectCoverImages[projectId]) {
        setProjectCoverImages(prev => ({
          ...prev,
          [duplicated.id]: projectCoverImages[projectId]
        }));
      }

      toast.success("Projekt erfolgreich dupliziert!");
    } catch (error) {
      console.error("Error duplicating project:", error);
      toast.error("Fehler beim Duplizieren des Projekts");
    }
  };

  const handleOpenStatsDialog = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStatsProject(project);
    setShowStatsDialog(true);
  };

  const currentProject = projects.find(p => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (selectedProjectId && currentProject) {
    return (
      <ProjectDetail 
        project={currentProject} 
        worlds={worlds}
        onBack={() => onNavigate("projekte")}
        onOpenWorldbuilding={() => onNavigate("worldbuilding")}
        coverImage={projectCoverImages[currentProject.id]}
        onCoverImageChange={async (imageUrl) => {
          // Update local state immediately (optimistic UI)
          setProjectCoverImages(prev => ({
            ...prev,
            [currentProject.id]: imageUrl
          }));
          
          // Update in database
          try {
            await projectsApi.update(currentProject.id, { 
              cover_image_url: imageUrl 
            });
          } catch (error) {
            console.error('Error saving image URL to database:', error);
            // Note: Toast already shown in handleFileChange
          }
        }}
        worldbuildingItems={worldbuildingItems}
        onUpdate={loadData}
        onDelete={handleDeleteProject}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        deleteLoading={deleteLoading}
        onDuplicate={() => handleDuplicateProject(currentProject.id)}
        onShowStats={() => {
          setSelectedStatsProject(currentProject);
          setShowStatsDialog(true);
        }}
        showStatsDialog={showStatsDialog}
        setShowStatsDialog={setShowStatsDialog}
        timelineCache={timelineCache}
        timelineCacheLoading={timelineCacheLoading}
        onTimelineDataChange={handleTimelineDataChange}
        structureOpen={structureOpen}
        setStructureOpen={setStructureOpen}
        charactersOpen={charactersOpen}
        setCharactersOpen={setCharactersOpen}
        inspirationOpen={inspirationOpen}
        setInspirationOpen={setInspirationOpen}
        inspirations={inspirations}
        inspirationsLoading={inspirationsLoading}
        showAddInspirationDialog={showAddInspirationDialog}
        setShowAddInspirationDialog={setShowAddInspirationDialog}
        editingInspiration={editingInspiration}
        setEditingInspiration={setEditingInspiration}
        onSaveInspiration={handleSaveInspiration}
        onDeleteInspiration={handleDeleteInspiration}
        onEditInspiration={handleEditInspiration}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header - Mobile optimiert */}
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Projekte durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg p-0.5 bg-muted/30 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("carousel")}
              className={`h-8 w-8 p-0 ${viewMode === "carousel" ? "bg-background shadow-sm" : ""}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-4"
              >
                {/* Left rectangle - smaller */}
                <rect x="1" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
                {/* Center rectangle - larger */}
                <rect x="6" y="2" width="4" height="12" rx="0.5" fill="currentColor" />
                {/* Right rectangle - smaller */}
                <rect x="12" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
            >
              <List className="size-4" />
            </Button>
          </div>
          
          {/* Date Filter - Ultra Compact */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                {dateFrom ? (
                  <span className="ml-0.5 text-[11px] truncate">
                    {dateFrom.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </span>
                ) : (
                  <span className="ml-0.5 text-[11px] text-muted-foreground">Von</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                {dateTo ? (
                  <span className="ml-0.5 text-[11px] truncate">
                    {dateTo.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </span>
                ) : (
                  <span className="ml-0.5 text-[11px] text-muted-foreground">Bis</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="h-9 w-9 p-0 shrink-0"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        
        <Button 
          onClick={() => setShowNewProjectDialog(true)}
          size="sm"
          className="h-9 w-full"
        >
          <Plus className="size-4 mr-1.5" />
          Neues Projekt erstellen
        </Button>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 pb-1">
          <Badge 
            variant={typeFilter === null ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5"
            onClick={() => setTypeFilter(null)}
          >
            Alle
          </Badge>
          <Badge 
            variant={typeFilter === "film" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5 flex items-center gap-1.5"
            onClick={() => setTypeFilter(typeFilter === "film" ? null : "film")}
          >
            <Film className="size-3" />
            Film
          </Badge>
          <Badge 
            variant={typeFilter === "series" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5 flex items-center gap-1.5"
            onClick={() => setTypeFilter(typeFilter === "series" ? null : "series")}
          >
            <Tv className="size-3" />
            Serie
          </Badge>
          <Badge 
            variant={typeFilter === "audio" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5 flex items-center gap-1.5"
            onClick={() => setTypeFilter(typeFilter === "audio" ? null : "audio")}
          >
            <Headphones className="size-3" />
            Hörspiel
          </Badge>
          <Badge 
            variant={typeFilter === "book" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5 flex items-center gap-1.5"
            onClick={() => setTypeFilter(typeFilter === "book" ? null : "book")}
          >
            <Book className="size-3" />
            Buch
          </Badge>
        </div>
      </div>

      {/* Project Cards */}
      <div className="px-4">
        {(() => {
          const filteredProjects = projects
            .filter(project => {
              // Search filter
              const matchesSearch = !searchQuery || 
                project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.logline?.toLowerCase().includes(searchQuery.toLowerCase());
              
              // Type filter
              const matchesType = !typeFilter || project.type === typeFilter;
              
              // Date filter
              let matchesDate = true;
              if (project.createdAt) {
                const projectDate = new Date(project.createdAt);
                if (dateFrom && projectDate < dateFrom) {
                  matchesDate = false;
                }
                if (dateTo && projectDate > dateTo) {
                  matchesDate = false;
                }
              }
              
              return matchesSearch && matchesType && matchesDate;
            })
            // Sort by last_edited (newest first)
            .sort((a, b) => {
              const dateA = a.last_edited ? new Date(a.last_edited).getTime() : 0;
              const dateB = b.last_edited ? new Date(b.last_edited).getTime() : 0;
              return dateB - dateA;
            });

          if (filteredProjects.length === 0) {
            return (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {projects.length === 0 
                    ? "Noch keine Projekte. Erstelle dein erstes Projekt!" 
                    : "Keine Projekte gefunden. Versuche andere Filter."}
                </CardContent>
              </Card>
            );
          }

          // Carousel View
          if (viewMode === "carousel") {
            return (
              <ProjectCarousel
                projects={filteredProjects}
                projectCoverImages={projectCoverImages}
                onNavigate={onNavigate}
                getProjectTypeInfo={getProjectTypeInfo}
                showLatestLabel={filteredProjects.length > 0}
              />
            );
          }

          // List View
          return (
            <motion.div 
              className="space-y-2"
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* LIST VIEW */}
                      <Card
                        className="active:scale-[0.99] transition-transform cursor-pointer overflow-hidden hover:border-primary/30 relative"
                        onClick={() => onNavigate("projekte", project.id)}
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-primary/20 border-2 border-transparent hover:border-primary/30">
                          {/* Thumbnail Left - Portrait 2:3 Ratio */}
                          <div 
                            className="w-[56px] h-[84px] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shrink-0"
                            style={projectCoverImages[project.id] ? { 
                              backgroundImage: `url(${projectCoverImages[project.id]})`, 
                              backgroundSize: 'cover', 
                              backgroundPosition: 'center',
                              backgroundBlendMode: 'overlay'
                            } : {}}
                          >
                            {!projectCoverImages[project.id] && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Film className="size-6 text-primary/40" />
                              </div>
                            )}
                          </div>

                          {/* Content Right */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="font-semibold text-sm leading-snug line-clamp-1">
                                {project.title}
                              </h3>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {index === 0 && (
                                  <Badge variant="default" className="text-[9px] h-4 px-1.5 flex items-center gap-0.5 shadow-md">
                                    <Clock className="size-2" />
                                    Zuletzt
                                  </Badge>
                                )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate("projekte", project.id);
                                  }}>
                                    <Edit2 className="size-3.5 mr-2" />
                                    Edit Project
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateProject(project.id);
                                  }}>
                                    <Copy className="size-3.5 mr-2" />
                                    Duplicate Project
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleOpenStatsDialog(project, e)}>
                                    <BarChart3 className="size-3.5 mr-2" />
                                    Project Stats & Logs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProject(project.id);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="size-3.5 mr-2" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                              {project.logline?.trim() || "Keine Logline"}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 flex items-center gap-1">
                                {(() => {
                                  const { label, Icon } = getProjectTypeInfo(project.type);
                                  return (
                                    <>
                                      <Icon className="size-2.5" />
                                      {label}
                                    </>
                                  );
                                })()}
                              </Badge>
                              {parseProjectGenreField(project.genre).length > 0 ? (
                                parseProjectGenreField(project.genre).slice(0, 2).map((genre) => (
                                  <Badge key={`${project.id}-${genre}`} variant="outline" className="text-[10px] h-5 px-1.5">
                                    {genre}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">
                                  Kein Genre
                                </Badge>
                              )}
                              {parseProjectGenreField(project.genre).length > 2 && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                  +{parseProjectGenreField(project.genre).length - 2}
                                </Badge>
                              )}

                            </div>
                            {(() => {
                              const lastEditedAt = getProjectLastEditedAt(project);
                              if (!lastEditedAt) return null;
                              const d = new Date(lastEditedAt);
                              if (Number.isNaN(d.getTime())) return null;
                              return (
                                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                  <CalendarIcon className="size-3" />
                                  <span>
                                    {d.toLocaleDateString("de-DE", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })} - {d.toLocaleTimeString("de-DE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: false,
                                    })}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          );
        })()}
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="w-[95vw] max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Create New Project</DialogTitle>
            <DialogDescription className="sr-only">
              Erstelle ein neues Skript-Projekt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Project Title & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter project title" 
                  className="h-11" 
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select value={newProjectType} onValueChange={setNewProjectType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Film" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="series">Serie</SelectItem>
                    <SelectItem value="book">Buch</SelectItem>
                    <SelectItem value="audio">Hörspiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-project-script-import">Skript-Struktur (optional)</Label>
              <input
                id="new-project-script-import"
                ref={newProjectScriptImportInputRef}
                type="file"
                accept={SCRIPT_IMPORT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  setNewProjectScriptImportFile(f ?? null);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => newProjectScriptImportInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  Datei wählen
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {newProjectScriptImportFile ? newProjectScriptImportFile.name : "Keine Datei"}
                </span>
                {newProjectScriptImportFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11"
                    onClick={() => setNewProjectScriptImportFile(null)}
                  >
                    Entfernen
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                .txt, .fountain, .md, .doc, .docx, .pdf — nach dem Erstellen werden Akte/Sequenzen/Szenen angelegt
                (ohne bestehende zu löschen). PDFs: reiner Text-Layer; komplexe Layouts können Lücken haben.
              </p>
            </div>

            {/* Narrative Structure - Conditional Layout based on Type */}
            {newProjectType === 'series' ? (
              /* SERIES: Episode Layout + Season Engine (2 Felder) */
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* Episode Layout */}
                  <div className="space-y-2">
                    <Label htmlFor="episode-layout">Episode Layout</Label>
                    <Select value={newProjectEpisodeLayout} onValueChange={setNewProjectEpisodeLayout}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sitcom-2-act">Sitcom 2-Akt (22–24 min)</SelectItem>
                        <SelectItem value="sitcom-4-act">Sitcom 4-Akt (22 min)</SelectItem>
                        <SelectItem value="network-5-act">Network 5-Akt (~45 min)</SelectItem>
                        <SelectItem value="streaming-3-act">Streaming 3-Akt (45–60 min)</SelectItem>
                        <SelectItem value="streaming-4-act">Streaming 4-Akt (45–60 min)</SelectItem>
                        <SelectItem value="anime-ab">Anime A/B (24 min)</SelectItem>
                        <SelectItem value="sketch-segmented">Sketch/Segmented (3–5 Stories)</SelectItem>
                        <SelectItem value="kids-11min">Kids 11-Min (2 Segmente)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Season Engine */}
                  <div className="space-y-2">
                    <Label htmlFor="season-engine">Season Engine</Label>
                    <Select value={newProjectSeasonEngine} onValueChange={setNewProjectSeasonEngine}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serial">Serial (Season-Arc)</SelectItem>
                        <SelectItem value="motw">MOTW/COTW (Fall d. Woche)</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Arc+MOTW)</SelectItem>
                        <SelectItem value="anthology">Anthology (episodisch)</SelectItem>
                        <SelectItem value="seasonal-anthology">Seasonal Anthology</SelectItem>
                        <SelectItem value="limited-series">Limited Series (4–10)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Custom Episode Layout Input */}
                {newProjectEpisodeLayout === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-episode-layout">Custom Episode Layout Name</Label>
                    <Input
                      id="custom-episode-layout"
                      placeholder="z.B. 'Mini-Series 6-Akt'"
                      value={customEpisodeLayout}
                      onChange={(e) => setCustomEpisodeLayout(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
                
                {/* Custom Season Engine Input */}
                {newProjectSeasonEngine === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-season-engine">Custom Season Engine Name</Label>
                    <Input
                      id="custom-season-engine"
                      placeholder="z.B. 'Hybrid-Anthology Mix'"
                      value={customSeasonEngine}
                      onChange={(e) => setCustomSeasonEngine(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
              </>
            ) : (
              /* FILM/BOOK/AUDIO: Narrative Structure (1 Feld) */
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="narrative">Narrative Structure</Label>
                  <Info className="size-3.5 text-muted-foreground" />
                </div>
                <Select value={newProjectNarrativeStructure} onValueChange={setNewProjectNarrativeStructure}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Film Structures */}
                    {newProjectType === 'film' && (
                      <>
                        <SelectItem value="3-act">3-Akt (klassisch)</SelectItem>
                        <SelectItem value="4-act">4-Akt (gesplittetes Act II)</SelectItem>
                        <SelectItem value="5-act">5-Akt (Freytag)</SelectItem>
                        <SelectItem value="8-sequences">8-Sequenzen ("Mini-Movies")</SelectItem>
                        <SelectItem value="kishotenketsu">Kishōtenketsu (4-Teiler)</SelectItem>
                        <SelectItem value="non-linear">Nicht-linear / Rashomon</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </>
                    )}
                    {/* Buch Structures */}
                    {newProjectType === 'book' && (
                      <>
                        <SelectItem value="3-part">3-Teiler (klassisch)</SelectItem>
                        <SelectItem value="hero-journey">Heldenreise</SelectItem>
                        <SelectItem value="save-the-cat">Save the Cat (adapted)</SelectItem>
                      </>
                    )}
                    {/* Hörspiel Structures */}
                    {newProjectType === 'audio' && (
                      <>
                        <SelectItem value="30min-3-act">30 min / 3-Akt</SelectItem>
                        <SelectItem value="60min-4-act">60 min / 4-Akt</SelectItem>
                        <SelectItem value="podcast-25-35min">Podcast 25–35 min</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {newProjectNarrativeStructure === 'custom' && (
                  <Input
                    placeholder="Custom Structure Name eingeben..."
                    value={customNarrativeStructure}
                    onChange={(e) => setCustomNarrativeStructure(e.target.value)}
                    className="h-11 mt-2"
                  />
                )}
              </div>
            )}

            {/* Story Beat Template - Always shown */}
            <div className="space-y-2">
              <Label htmlFor="beat-template">Story Beat Template</Label>
              <Select value={newProjectBeatTemplate} onValueChange={setNewProjectBeatTemplate}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {/* Universal Templates */}
                  <SelectItem value="lite-7">Lite-7 (minimal)</SelectItem>
                  <SelectItem value="save-the-cat">Save the Cat! (15)</SelectItem>
                  <SelectItem value="syd-field">Syd Field / Paradigm</SelectItem>
                  <SelectItem value="heroes-journey">Heldenreise (Vogler, 12)</SelectItem>
                  <SelectItem value="seven-point">Seven-Point Structure</SelectItem>
                  <SelectItem value="8-sequences">8-Sequenzen</SelectItem>
                  <SelectItem value="story-circle">Story Circle 8</SelectItem>
                  {/* Series-specific macro template */}
                  {newProjectType === 'series' && (
                    <SelectItem value="season-lite-5">Season-Lite-5 (Macro)</SelectItem>
                  )}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {newProjectBeatTemplate === 'custom' && (
                <Input
                  placeholder="Custom Beat Template Name eingeben..."
                  value={customBeatTemplate}
                  onChange={(e) => setCustomBeatTemplate(e.target.value)}
                  className="h-11 mt-2"
                />
              )}
            </div>

            {/* Welt verknüpfen */}
            <div className="space-y-2">
              <Label htmlFor="world">Welt verknüpfen (optional)</Label>
              <div className="flex gap-2">
                <Select value={newProjectLinkedWorld} onValueChange={setNewProjectLinkedWorld}>
                  <SelectTrigger className="h-11 flex-1">
                    <SelectValue placeholder="Keine Welt verknüpfen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Welt verknüpfen</SelectItem>
                    {worlds.map((world) => (
                      <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-11 w-11 shrink-0"
                  onClick={() => onNavigate("worldbuilding")}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Verknüpfe dein Projekt mit einer Welt für umfangreiches Worldbuilding.</p>
            </div>

            {/* Logline */}
            <div className="space-y-2">
              <Label htmlFor="logline">Logline</Label>
              <Textarea 
                id="logline" 
                placeholder="A brief summary of your project..." 
                rows={3}
                value={newProjectLogline}
                onChange={(e) => setNewProjectLogline(e.target.value)}
              />
            </div>

            {/* Genres */}
            <div className="space-y-2">
              <Label>Genres</Label>
              <GenrePillGrid
                selected={selectedGenres}
                onSelectedChange={setSelectedGenres}
                customPool={newProjectCustomGenres}
                onCustomPoolChange={setNewProjectCustomGenres}
              />
              <p className="text-xs text-muted-foreground">
                Mindestens ein Genre wählen; mit + eigene Bezeichnungen ergänzen.
              </p>
            </div>

            {/* Duration / Target Pages - Type-dependent */}
            {newProjectType === 'book' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="target-pages">Zielumfang (Seiten)</Label>
                  <Input 
                    id="target-pages" 
                    type="number" 
                    placeholder="z.B. 300" 
                    className="h-11"
                    value={newProjectTargetPages}
                    onChange={(e) => setNewProjectTargetPages(e.target.value)}
                  />
                  {newProjectTargetPages && (
                    <p className="text-xs text-muted-foreground">
                      Bei {newProjectWordsPerPage} Wörtern/Seite ≈ {(parseInt(newProjectTargetPages || '0') * parseInt(newProjectWordsPerPage || '250')).toLocaleString('de-DE')} Wörter
                    </p>
                  )}
                </div>
                
                {/* Advanced Book Metrics - Collapsible */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="words-per-page" className="text-xs">Wörter pro Seite</Label>
                    <Input 
                      id="words-per-page" 
                      type="number" 
                      placeholder="250" 
                      className="h-11"
                      value={newProjectWordsPerPage}
                      onChange={(e) => setNewProjectWordsPerPage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reading-speed" className="text-xs">Lesegeschw. (WPM)</Label>
                    <Input 
                      id="reading-speed" 
                      type="number" 
                      placeholder="230" 
                      className="h-11"
                      value={newProjectReadingSpeed}
                      onChange={(e) => setNewProjectReadingSpeed(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  placeholder="Project duration in minutes" 
                  className="h-11"
                  value={newProjectDuration}
                  onChange={(e) => setNewProjectDuration(e.target.value)}
                />
              </div>
            )}

            {/* Inspirations */}
            <div className="space-y-2">
              <Label>Inspirations</Label>
              {inspirations.map((inspiration, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={inspiration}
                    onChange={(e) => {
                      const newInspirations = [...inspirations];
                      newInspirations[index] = e.target.value;
                      setInspirations(newInspirations);
                    }}
                    placeholder={`Inspiration ${index + 1}`}
                    className="h-11"
                  />
                  {inspirations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setInspirations(inspirations.filter((_, i) => i !== index));
                      }}
                      className="h-11 w-11 shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setInspirations([...inspirations, ""])}
                className="h-9"
              >
                <Plus className="size-4 mr-2" />
                Add Inspiration
              </Button>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image (Optional)</Label>
              <div 
                onClick={() => newProjectCoverInputRef.current?.click()}
                className={`w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors relative overflow-hidden ${
                  "cursor-pointer"
                }`}
              >
                {newProjectCoverImage ? (
                  <div className="relative rounded-lg overflow-hidden min-h-[8rem]">
                    <img 
                      src={newProjectCoverImage} 
                      alt="Cover Preview" 
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <div className="flex items-center justify-center gap-2 relative z-[1]">
                      <p className="text-sm text-primary">✓ Bild hochgeladen</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewProjectCoverImage(undefined);
                          setNewProjectCoverFile(undefined);
                          newProjectCoverGifModeRef.current = undefined;
                        }}
                        className="h-7 text-xs"
                      >
                        <X className="size-3 mr-1" />
                        Entfernen
                      </Button>
                    </div>
                    {/* Upload overlay removed — uploads run in background with toast notifications */}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm mb-1">Cover-Bild hochladen</p>
                    <p className="text-xs text-muted-foreground">Ideal: 800 × 1200 px (2:3 Hochformat)</p>
                  </div>
                )}
              </div>
              <input
                ref={newProjectCoverInputRef}
                type="file"
                accept="image/*"
                onChange={handleNewProjectCoverChange}
                className="hidden"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)} className="h-11">
              Cancel
            </Button>
            <Button onClick={handleCreateProject} className="h-11">
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GifAnimationUploadDialog
        open={gifPendingNewProjectCover !== null}
        onOpenChange={(open) => {
          if (!open) setGifPendingNewProjectCover(null);
        }}
        fileName={gifPendingNewProjectCover?.name}
        allowKeepGif={
          gifPendingNewProjectCover
            ? gifPendingNewProjectCover.size <= STORAGE_CONFIG.MAX_FILE_SIZE
            : true
        }
        onConvert={() => {
          const f = gifPendingNewProjectCover;
          if (!f) return;
          applyNewProjectCoverSelection(f, "convert-static");
          setGifPendingNewProjectCover(null);
        }}
        onKeepGif={() => {
          const f = gifPendingNewProjectCover;
          if (!f) return;
          if (f.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
            toast.error(
              `GIF ist größer als ${(STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB — bitte mit Konvertierung oder ein kleineres GIF wählen.`
            );
            return;
          }
          applyNewProjectCoverSelection(f, "keep-animation");
          setGifPendingNewProjectCover(null);
        }}
      />

      {/* Project Stats & Logs Dialog */}
      {selectedStatsProject && (
        <ProjectStatsLogsDialog
          open={showStatsDialog}
          onOpenChange={setShowStatsDialog}
          project={selectedStatsProject}
        />
      )}

      {/* Delete Project Dialog - Must be here for list delete! */}
      <AlertDialog open={showDeleteDialog && !selectedProjectId} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
              <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
                  Das Projekt wird permanent gelöscht, inklusive aller:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Szenen, Acts, Sequenzen</li>
                  <li>Charaktere</li>
                  <li>Shots & Timeline Nodes</li>
                  <li>Projekt-Einstellungen</li>
                </ul>
                <div className="pt-2 space-y-2">
                  <Label htmlFor="delete-password-list" className="text-foreground">
                    Gib dein Passwort ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="delete-password-list"
                    type="password"
                    placeholder="Dein Passwort"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deleteLoading}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deletePassword.trim()) {
                        handleDeleteProject();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeletePassword("");
              }}
              disabled={deleteLoading}
            >
              Abbrechen
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleteLoading || !deletePassword.trim()}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Projekt löschen
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CharacterCardProps {
  character: {
    id: string;
    name: string;
    role: string;
    description: string;
    age?: string;
    gender?: string;
    species?: string;
    backgroundStory?: string;
    skills?: string;
    strengths?: string;
    weaknesses?: string;
    characterTraits?: string;
    image?: string;
    lastEdited: Date;
  };
  onImageUpload: (characterId: string, imageUrl: string) => void;
  onUpdateDetails: (characterId: string, updates: {
    name: string;
    role: string;
    description: string;
    age?: string;
    gender?: string;
    species?: string;
    backgroundStory?: string;
    skills?: string;
    strengths?: string;
    weaknesses?: string;
    characterTraits?: string;
  }) => void;
  onDelete: (characterId: string) => void;
}

function CharacterCard({ character, onImageUpload, onUpdateDetails, onDelete }: CharacterCardProps) {
  const characterImageInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(character.name);
  const [editedRole, setEditedRole] = useState(character.role);
  const [editedDescription, setEditedDescription] = useState(character.description);
  const [editedAge, setEditedAge] = useState(character.age || "");
  const [editedGender, setEditedGender] = useState(character.gender || "");
  const [editedSpecies, setEditedSpecies] = useState(character.species || "");
  const [editedBackgroundStory, setEditedBackgroundStory] = useState(character.backgroundStory || "");
  const [editedSkills, setEditedSkills] = useState(character.skills || "");
  const [editedStrengths, setEditedStrengths] = useState(character.strengths || "");
  const [editedWeaknesses, setEditedWeaknesses] = useState(character.weaknesses || "");
  const [editedCharacterTraits, setEditedCharacterTraits] = useState(character.characterTraits || "");
  const [tempImageForCrop, setTempImageForCrop] = useState<string | undefined>(undefined);
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);

  const handleImageClick = () => {
    characterImageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string);
        setShowImageCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = (croppedImage: string) => {
    onImageUpload(character.id, croppedImage);
    setShowImageCropDialog(false);
    setTempImageForCrop(undefined);
  };

  return (
    <Card className="overflow-hidden">
      {!isExpanded ? (
        /* Collapsed View */
        <div 
          className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          {/* Profile Image Placeholder */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-muted/30 border-2 border-character-blue-light">
            {character.image ? (
              <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="size-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Character Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate text-character-blue mb-0.5">
              @{character.name}
            </CardTitle>
            <Badge variant="secondary" className="w-fit text-xs mb-1 bg-character-blue-light text-character-blue border-0">{character.role}</Badge>
            <CardDescription className="text-xs line-clamp-1">
              {character.description}
            </CardDescription>
          </div>

          {/* Expand Icon */}
          <ChevronDown className="size-5 text-muted-foreground shrink-0" />
        </div>
      ) : (
        /* Expanded View */
        <CardHeader className="p-4">
          {/* Button Row */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  onUpdateDetails(character.id, {
                    name: editedName,
                    role: editedRole,
                    description: editedDescription,
                    age: editedAge,
                    gender: editedGender,
                    species: editedSpecies,
                    backgroundStory: editedBackgroundStory,
                    skills: editedSkills,
                    strengths: editedStrengths,
                    weaknesses: editedWeaknesses,
                    characterTraits: editedCharacterTraits
                  });
                  setIsEditing(false);
                } else {
                  setEditedName(character.name);
                  setEditedRole(character.role);
                  setEditedDescription(character.description);
                  setEditedAge(character.age || "");
                  setEditedGender(character.gender || "");
                  setEditedSpecies(character.species || "");
                  setEditedBackgroundStory(character.backgroundStory || "");
                  setEditedSkills(character.skills || "");
                  setEditedStrengths(character.strengths || "");
                  setEditedWeaknesses(character.weaknesses || "");
                  setEditedCharacterTraits(character.characterTraits || "");
                  setIsEditing(true);
                }
              }}
              className="h-7 px-3 shrink-0 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground"
            >
              {isEditing ? (
                <>
                  <Save className="size-3 mr-1" />
                  <span className="text-xs">Speichern</span>
                </>
              ) : (
                <>
                  <Edit2 className="size-3 mr-1" />
                  <span className="text-xs">Bearbeiten</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(character.id)}
              className="h-7 px-3 shrink-0 rounded-[10px] bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
            >
              <Trash2 className="size-3 mr-1" />
              <span className="text-xs">Löschen</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-7 px-2 shrink-0 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground"
            >
              <ChevronDown className="size-4 rotate-180" />
            </Button>
          </div>

          {/* Profile and Name Row */}
          <div className="flex items-center gap-3 mb-3">
            {/* Profilbild - in beiden Modi anzeigen */}
            <div className="shrink-0">
              {character.image ? (
                isEditing ? (
                  <button 
                    onClick={handleImageClick}
                    className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-character-blue-light hover:border-character-blue transition-colors cursor-pointer group"
                  >
                    <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="size-5 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-character-blue-light">
                    <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
                  </div>
                )
              ) : (
                isEditing ? (
                  <button 
                    onClick={handleImageClick}
                    className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center bg-muted/10"
                  >
                    <Camera className="size-6 text-muted-foreground" />
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-character-blue-light flex items-center justify-center bg-muted/10">
                    <User className="size-8 text-muted-foreground" />
                  </div>
                )
              )}
              {isEditing && (
                <input
                  ref={characterImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  {/* @ Symbol Box */}
                  <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                    <span className="text-base text-character-blue">@</span>
                  </div>
                  {/* Name Input Box */}
                  <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center h-8 overflow-hidden">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-full border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-character-blue px-3"
                      placeholder="Charakter-Name"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* @ Symbol Box */}
                  <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                    <span className="text-base text-character-blue">@</span>
                  </div>
                  {/* Name Display Box */}
                  <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center px-3 h-8">
                    <p className="text-base text-character-blue">{character.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Rolle</Label>
              <Input
                value={editedRole}
                onChange={(e) => setEditedRole(e.target.value)}
                className="h-9 border-2"
                placeholder="z.B. Protagonist, Antagonist, Unterstützer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Beschreibung</Label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={2}
                className="border-2"
                placeholder="Kurze Zusammenfassung des Charakters..."
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Alter</Label>
                <Input
                  value={editedAge}
                  onChange={(e) => setEditedAge(e.target.value)}
                  className="h-9 border-2"
                  placeholder="35"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Geschlecht</Label>
                <Input
                  value={editedGender}
                  onChange={(e) => setEditedGender(e.target.value)}
                  className="h-9 border-2"
                  placeholder="Female"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-bold">Spezies</Label>
                <Input
                  value={editedSpecies}
                  onChange={(e) => setEditedSpecies(e.target.value)}
                  className="h-9 border-2"
                  placeholder="Human"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Background Story</Label>
              <Textarea
                value={editedBackgroundStory}
                onChange={(e) => setEditedBackgroundStory(e.target.value)}
                rows={3}
                className="border-2"
                placeholder="Die Hintergrundgeschichte des Charakters - Herkunft, wichtige Ereignisse, Motivation..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Skills</Label>
              <Textarea
                value={editedSkills}
                onChange={(e) => setEditedSkills(e.target.value)}
                rows={2}
                className="border-2"
                placeholder="Fähigkeiten kommagetrennt (z.B. Piloting, Schwertkampf, Hacking)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Stärken</Label>
              <Textarea
                value={editedStrengths}
                onChange={(e) => setEditedStrengths(e.target.value)}
                rows={2}
                className="border-2"
                placeholder="Was macht den Charakter stark? (z.B. Entscheidungsfreudig, Mutig, Intelligent)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Schwächen</Label>
              <Textarea
                value={editedWeaknesses}
                onChange={(e) => setEditedWeaknesses(e.target.value)}
                rows={2}
                className="border-2"
                placeholder="Schwachstellen und Verletzlichkeiten (z.B. Impulsiv, Vertrauensselig, Sturköpfig)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">Charakter Traits</Label>
              <Textarea
                value={editedCharacterTraits}
                onChange={(e) => setEditedCharacterTraits(e.target.value)}
                rows={2}
                className="border-2"
                placeholder="Persönlichkeitsmerkmale (z.B. Mutig, Sarkastisch, Mitfühlend, Neugierig)"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">{character.role}</Badge>
            <CardDescription className="text-sm">{character.description}</CardDescription>
            {(character.age || character.gender || character.species) && (
              <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                {character.age && <span>Alter: {character.age}</span>}
                {character.gender && <span>• {character.gender}</span>}
                {character.species && <span>• {character.species}</span>}
              </div>
            )}
            {character.backgroundStory && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-1">Background:</p>
                <CardDescription className="text-xs">{character.backgroundStory}</CardDescription>
              </div>
            )}
            {character.skills && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-1">Skills:</p>
                <CardDescription className="text-xs">{character.skills}</CardDescription>
              </div>
            )}
            {character.strengths && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-1">Stärken:</p>
                <CardDescription className="text-xs">{character.strengths}</CardDescription>
              </div>
            )}
            {character.weaknesses && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-1">Schwächen:</p>
                <CardDescription className="text-xs">{character.weaknesses}</CardDescription>
              </div>
            )}
            {character.characterTraits && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-1">Traits:</p>
                <CardDescription className="text-xs">{character.characterTraits}</CardDescription>
              </div>
            )}
          </div>
        )}

          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/15 border-0 w-fit">
            {character.lastEdited.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}, {character.lastEdited.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit"
            })} Uhr
          </Badge>
        </CardHeader>
      )}

      {/* Image Crop Dialog */}
      {showImageCropDialog && tempImageForCrop && (
        <ImageCropDialog
          image={tempImageForCrop}
          onComplete={handleCroppedImage}
          onCancel={() => {
            setShowImageCropDialog(false);
            setTempImageForCrop(undefined);
          }}
        />
      )}
    </Card>
  );
}

interface DraggableSceneProps {
  scene: {
    id: string;
    number: number;
    title: string;
    description: string;
    lastEdited: Date;
    image?: string;
    mentionedCharacters?: string[];
    worldReferences?: string[];
  };
  index: number;
  moveScene: (dragIndex: number, hoverIndex: number) => void;
  onImageUpload: (sceneId: string, imageUrl: string) => void;
  onUpdateDetails: (sceneId: string, title: string, description: string) => void;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    age?: string;
    gender?: string;
    species?: string;
    backgroundStory?: string;
    skills?: string;
    strengths?: string;
    weaknesses?: string;
    characterTraits?: string;
    image?: string;
    lastEdited: Date;
  }>;
  worldItems: Array<{
    id: string;
    name: string;
    category: string;
    categoryType: string;
  }>;
  linkedWorldId?: string;
}

function DraggableScene({ scene, index, moveScene, onImageUpload, onUpdateDetails, characters, worldItems, linkedWorldId }: DraggableSceneProps) {
  const sceneImageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(scene.title);
  const [editedDescription, setEditedDescription] = useState(scene.description);
  
  // Autocomplete states
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSearch, setAutocompleteSearch] = useState("");
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompleteType, setAutocompleteType] = useState<'character' | 'world'>('character');

  // Use colored tags hook
  const { colorizeText } = useColoredTags({
    characters: characters.map(c => ({ id: c.id, name: c.name })),
    assets: worldItems,
    scenes: []
  });

  // Extract tagged characters from description
  const getTaggedCharacters = (text: string) => {
    // Match @CharacterName or @Character Name (with spaces)
    const matches = text.match(/@([A-Za-z]+(\s+[A-Za-z]+)*)/g) || [];
    const taggedNames = matches.map(m => m.substring(1)); // Remove the @
    return characters.filter(c => taggedNames.includes(c.name));
  };

  const taggedCharacters = getTaggedCharacters(editedDescription);

  // Dynamic placeholder
  const textareaPlaceholder = linkedWorldId 
    ? "Szenen-Beschreibung (nutze @ für Charaktere, / für World-Items)"
    : "Szenen-Beschreibung (nutze @ um Charaktere zu taggen)";

  const [{ handlerId }, drop] = useDrop({
    accept: "SCENE",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveScene(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: "SCENE",
    item: () => {
      return { id: scene.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const handleImageClick = () => {
    sceneImageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(scene.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setEditedDescription(value);
    setCursorPosition(cursorPos);

    // Check if @ was just typed (for characters)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    // Determine which is more recent: @ or /
    const useAtAutocomplete = lastAtIndex > lastSlashIndex;
    const useSlashAutocomplete = lastSlashIndex > lastAtIndex && linkedWorldId;
    
    if (useAtAutocomplete && lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setAutocompleteSearch(textAfterAt);
        setAutocompleteType('character');
        setShowAutocomplete(true);
        
        // Calculate position - directly below the cursor position
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          
          // Create a temporary div to measure text position
          const tempDiv = document.createElement('div');
          const computedStyle = window.getComputedStyle(textarea);
          
          // Copy relevant styles
          tempDiv.style.font = computedStyle.font;
          tempDiv.style.fontSize = computedStyle.fontSize;
          tempDiv.style.fontFamily = computedStyle.fontFamily;
          tempDiv.style.padding = computedStyle.padding;
          tempDiv.style.border = computedStyle.border;
          tempDiv.style.lineHeight = computedStyle.lineHeight;
          tempDiv.style.whiteSpace = 'pre-wrap';
          tempDiv.style.wordWrap = 'break-word';
          tempDiv.style.position = 'absolute';
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.width = rect.width + 'px';
          
          // Add text up to cursor
          tempDiv.textContent = textBeforeCursor;
          document.body.appendChild(tempDiv);
          
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);
          
          setAutocompletePosition({
            top: rect.top + tempRect.height - textarea.scrollTop,
            left: rect.left + 10
          });
        }
      } else {
        setShowAutocomplete(false);
      }
    } else if (useSlashAutocomplete && lastSlashIndex !== -1) {
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      // Check if there's no space after /
      if (!textAfterSlash.includes(' ') && textAfterSlash.length >= 0) {
        setAutocompleteSearch(textAfterSlash);
        setAutocompleteType('world');
        setShowAutocomplete(true);
        
        // Calculate position
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          
          const tempDiv = document.createElement('div');
          const computedStyle = window.getComputedStyle(textarea);
          
          tempDiv.style.font = computedStyle.font;
          tempDiv.style.fontSize = computedStyle.fontSize;
          tempDiv.style.fontFamily = computedStyle.fontFamily;
          tempDiv.style.padding = computedStyle.padding;
          tempDiv.style.border = computedStyle.border;
          tempDiv.style.lineHeight = computedStyle.lineHeight;
          tempDiv.style.whiteSpace = 'pre-wrap';
          tempDiv.style.wordWrap = 'break-word';
          tempDiv.style.position = 'absolute';
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.width = rect.width + 'px';
          
          tempDiv.textContent = textBeforeCursor;
          document.body.appendChild(tempDiv);
          
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);
          
          setAutocompletePosition({
            top: rect.top + tempRect.height - textarea.scrollTop,
            left: rect.left + 10
          });
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const insertCharacterTag = (characterName: string) => {
    const textBeforeCursor = editedDescription.substring(0, cursorPosition);
    const textAfterCursor = editedDescription.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Create the full tag with the original name (including spaces)
    const tag = '@' + characterName;
    
    const newDescription = 
      editedDescription.substring(0, lastAtIndex) + 
      tag + ' ' + 
      textAfterCursor;
    
    setEditedDescription(newDescription);
    setShowAutocomplete(false);
    
    // Set cursor position after the inserted tag
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + tag.length + 1; // +1 for the space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const insertWorldTag = (itemName: string) => {
    const textBeforeCursor = editedDescription.substring(0, cursorPosition);
    const textAfterCursor = editedDescription.substring(cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    const tag = '/' + itemName;
    
    const newDescription = 
      editedDescription.substring(0, lastSlashIndex) + 
      tag + ' ' + 
      textAfterCursor;
    
    setEditedDescription(newDescription);
    setShowAutocomplete(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastSlashIndex + tag.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(autocompleteSearch.toLowerCase())
  );

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Card className="active:scale-[0.98] transition-transform overflow-hidden">
        <div className="flex">
          {/* Drag Handle */}
          <div className="flex-shrink-0 w-10 flex items-center justify-center bg-muted/30 cursor-grab active:cursor-grabbing">
            <GripVertical className="size-5 text-muted-foreground" />
          </div>

          {/* Scene Content */}
          <div className="flex-1 min-w-0">
            {!isExpanded ? (
              /* Collapsed View with Thumbnail */
              <div 
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setIsExpanded(true)}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted/30">
                  {scene.image ? (
                    <img src={scene.image} alt={scene.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Scene Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* # Symbol Box */}
                    <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                      <span className="text-base text-scene-pink">#{scene.number}</span>
                    </div>
                    {/* Title Box */}
                    <div className="flex-1 rounded-lg border border-border bg-scene-pink-light flex items-center px-3 h-8">
                      <p className="text-base text-scene-pink truncate">{scene.title}</p>
                    </div>
                  </div>
                  <CardDescription className="text-xs line-clamp-1">
                    {colorizeText(scene.description).map((part, i) => {
                      if (part.type === 'character') {
                        return <span key={i} className="text-character-blue">{part.text}</span>;
                      } else if (part.type === 'asset') {
                        return <span key={i} className="text-asset-green">{part.text}</span>;
                      } else if (part.type === 'scene') {
                        return <span key={i} className="text-scene-pink">{part.text}</span>;
                      }
                      return <span key={i}>{part.text}</span>;
                    })}
                  </CardDescription>
                </div>

                {/* Expand Icon */}
                <ChevronDown className="size-5 text-muted-foreground shrink-0" />
              </div>
            ) : (
              /* Expanded View */
              <CardHeader className="p-4">
                {/* Button Row */}
                <div className="flex items-center justify-end gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isEditing) {
                        onUpdateDetails(scene.id, editedTitle, editedDescription);
                        setIsEditing(false);
                      } else {
                        setEditedTitle(scene.title);
                        setEditedDescription(scene.description);
                        setIsEditing(true);
                      }
                    }}
                    className="h-7 px-3 shrink-0 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground"
                  >
                    {isEditing ? (
                      <>
                        <Save className="size-3 mr-1" />
                        <span className="text-xs">Speichern</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="size-3 mr-1" />
                        <span className="text-xs">Bearbeiten</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="h-7 px-2 shrink-0 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground"
                  >
                    <ChevronDown className="size-4 rotate-180" />
                  </Button>
                </div>

                {/* Scene Number and Title Row */}
                <div className="flex items-center gap-2 mb-3">
                  {isEditing ? (
                    <>
                      {/* # Symbol Box */}
                      <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                        <span className="text-base text-scene-pink">#{scene.number}</span>
                      </div>
                      {/* Title Input Box */}
                      <div className="flex-1 rounded-lg border border-border bg-scene-pink-light flex items-center h-8 overflow-hidden">
                        <Input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="h-full border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-scene-pink px-3"
                          placeholder="Szenen-Titel"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* # Symbol Box */}
                      <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-8">
                        <span className="text-base text-scene-pink">#{scene.number}</span>
                      </div>
                      {/* Title Display Box */}
                      <div className="flex-1 rounded-lg border border-border bg-scene-pink-light flex items-center px-3 h-8">
                        <p className="text-base text-scene-pink">{scene.title}</p>
                      </div>
                    </>
                  )}
                </div>
              
              {isEditing ? (
                <div className="relative mb-3">
                  {/* Colored Text Overlay */}
                  <div 
                    className="absolute left-3 top-2 pointer-events-none text-sm whitespace-pre-wrap select-none z-10 pr-6 pb-4"
                    style={{ 
                      width: 'calc(100% - 24px)',
                      lineHeight: '1.5',
                      fontFamily: 'inherit'
                    }}
                    aria-hidden="true"
                  >
                    {editedDescription ? colorizeText(editedDescription).map((part, index) => {
                      if (part.type === 'character') {
                        return <span key={index} style={{ color: 'var(--character-blue)', fontWeight: 500 }}>{part.text}</span>;
                      } else if (part.type === 'asset') {
                        return <span key={index} style={{ color: 'var(--asset-green)', fontWeight: 500 }}>{part.text}</span>;
                      } else if (part.type === 'scene') {
                        return <span key={index} style={{ color: 'var(--scene-pink)', fontWeight: 500 }}>{part.text}</span>;
                      }
                      return <span key={index}>{part.text}</span>;
                    }) : null}
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={editedDescription}
                    onChange={handleDescriptionChange}
                    className="mb-0 relative text-transparent caret-foreground"
                    style={{ caretColor: 'var(--foreground)' }}
                    rows={3}
                    placeholder={textareaPlaceholder}
                  />
                  {showAutocomplete && autocompleteType === 'character' && filteredCharacters.length > 0 && (
                    <div 
                      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                      style={{
                        position: 'fixed',
                        top: `${autocompletePosition.top}px`,
                        left: `${autocompletePosition.left}px`,
                        maxWidth: '300px'
                      }}
                    >
                      <div className="p-1">
                        <div className="px-2 py-1.5 text-xs text-character-blue border-b border-border mb-1">
                          @ Charaktere
                        </div>
                        {filteredCharacters.slice(0, 5).map(character => (
                          <button
                            key={character.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertCharacterTag(character.name);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-character-blue-light rounded-md flex items-center gap-2 transition-colors"
                          >
                            {character.image ? (
                              <img src={character.image} alt={character.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-character-blue-light flex items-center justify-center">
                                <AtSign className="size-4 text-character-blue" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate text-character-blue">
                                @{character.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{character.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {showAutocomplete && autocompleteType === 'world' && linkedWorldId && (
                    <WorldReferenceAutocomplete
                      items={worldItems}
                      search={autocompleteSearch}
                      position={autocompletePosition}
                      onSelect={insertWorldTag}
                    />
                  )}
                </div>
              ) : (
                <>
                  <CardDescription className="text-sm mb-3">
                    {colorizeText(scene.description).map((part, i) => {
                      if (part.type === 'character') {
                        return <span key={i} className="text-character-blue">{part.text}</span>;
                      } else if (part.type === 'asset') {
                        return <span key={i} className="text-asset-green">{part.text}</span>;
                      } else if (part.type === 'scene') {
                        return <span key={i} className="text-scene-pink">{part.text}</span>;
                      }
                      return <span key={i}>{part.text}</span>;
                    })}
                  </CardDescription>
                  {taggedCharacters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {taggedCharacters.map(character => (
                        <SceneCharacterBadge key={character.id} character={character} />
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Scene Image & Tagged Characters */}
              <div className="flex gap-3 mb-3">
                {/* Scene Image */}
                <div className="flex-1 max-w-[75%]">
                  <div
                    onClick={handleImageClick}
                    className="relative aspect-video rounded-lg overflow-hidden bg-muted/30 cursor-pointer group"
                  >
                    {scene.image ? (
                      <>
                        <img src={scene.image} alt={scene.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="size-6 text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <ImageIcon className="size-6 mb-1" />
                        <p className="text-[10px]">Bild hochladen</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={sceneImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Tagged Characters */}
                {taggedCharacters.length > 0 && (
                  <div className="flex-1 flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Charaktere in dieser Szene:</p>
                    <div className="flex flex-wrap gap-2">
                      {taggedCharacters.map(character => (
                        <div key={character.id} className="flex items-center gap-2 bg-primary/10 rounded-lg p-2">
                          {character.image ? (
                            <img src={character.image} alt={character.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                              <AtSign className="size-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{character.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{character.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

                <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/15 border-0 w-fit">
                  {scene.lastEdited.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  })}, {scene.lastEdited.toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })} Uhr
                </Badge>
              </CardHeader>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

interface ProjectDetailProps {
  project: any;
  worlds: any[];
  onBack: () => void;
  onOpenWorldbuilding: () => void;
  coverImage?: string;
  onCoverImageChange: (imageUrl: string) => void;
  worldbuildingItems: Array<{ id: string; name: string; category: string; categoryType: string }>;
  onUpdate?: () => void;
  onDelete: () => Promise<void>;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  deletePassword: string;
  setDeletePassword: (password: string) => void;
  deleteLoading: boolean;
  onDuplicate?: () => void;
  onShowStats?: () => void;
  showStatsDialog: boolean;
  setShowStatsDialog: (show: boolean) => void;
  // Timeline Cache
  timelineCache: Record<string, TimelineData>;
  timelineCacheLoading: Record<string, boolean>;
  onTimelineDataChange: (projectId: string, data: TimelineData) => void;
  // Collapsible Sections
  structureOpen: boolean;
  setStructureOpen: (open: boolean) => void;
  charactersOpen: boolean;
  setCharactersOpen: (open: boolean) => void;
  inspirationOpen: boolean;
  setInspirationOpen: (open: boolean) => void;
  // Inspirations
  inspirations: ProjectInspiration[];
  inspirationsLoading: boolean;
  showAddInspirationDialog: boolean;
  setShowAddInspirationDialog: (show: boolean) => void;
  editingInspiration: ProjectInspiration | null;
  setEditingInspiration: (inspiration: ProjectInspiration | null) => void;
  onSaveInspiration: (data: InspirationData) => Promise<void>;
  onDeleteInspiration: (id: string) => Promise<void>;
  onEditInspiration: (inspiration: ProjectInspiration) => void;
}

function ProjectDetail({ project, worlds, onBack, onOpenWorldbuilding, coverImage, onCoverImageChange, worldbuildingItems, onUpdate, onDelete, showDeleteDialog, setShowDeleteDialog, deletePassword, setDeletePassword, deleteLoading, onDuplicate, onShowStats, showStatsDialog, setShowStatsDialog, timelineCache, timelineCacheLoading, onTimelineDataChange, structureOpen, setStructureOpen, charactersOpen, setCharactersOpen, inspirationOpen, setInspirationOpen, inspirations, inspirationsLoading, showAddInspirationDialog, setShowAddInspirationDialog, editingInspiration, setEditingInspiration, onSaveInspiration, onDeleteInspiration, onEditInspiration }: ProjectDetailProps) {
  const [structureView, setStructureView] = useState<"dropdown" | "timeline">("dropdown");
  const [showNewScene, setShowNewScene] = useState(false);
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title || "");
  const [editedLogline, setEditedLogline] = useState(project.logline || "");
  const [editedType, setEditedType] = useState(project.type || "");
  const [editedGenre, setEditedGenre] = useState(project.genre || "");
  const [editedLinkedWorldId, setEditedLinkedWorldId] = useState<string>(project.linkedWorldId || "none");
  const [editedDuration, setEditedDuration] = useState(project.duration || "");
  const [editedNarrativeStructure, setEditedNarrativeStructure] = useState(project.narrative_structure || "");
  const [editedBeatTemplate, setEditedBeatTemplate] = useState(project.beat_template || "");
  const [editedGenresMulti, setEditedGenresMulti] = useState<string[]>(() =>
    parseProjectGenreField(project.genre)
  );
  const [editedCustomGenrePool, setEditedCustomGenrePool] = useState<string[]>(() =>
    customGenresFromSelection(parseProjectGenreField(project.genre))
  );
  const [editedEpisodeLayout, setEditedEpisodeLayout] = useState(project.episode_layout || "");
  const [editedSeasonEngine, setEditedSeasonEngine] = useState(project.season_engine || "");
  const [editedConceptBlocks, setEditedConceptBlocks] = useState<ConceptBlock[]>(
    () => normalizeConceptBlocks(project.concept_blocks)
  );

  const getConceptContent = (type: ConceptBlock["type"]) =>
    editedConceptBlocks.find((b) => b.type === type)?.content || "";

  const setConceptContent = (type: ConceptBlock["type"], content: string) => {
    setEditedConceptBlocks((prev) =>
      prev.map((b) => (b.type === type ? { ...b, content } : b))
    );
  };
  // 📖 NEW: Book Metrics States (Edit Mode)
  const [editedTargetPages, setEditedTargetPages] = useState<string>(project.target_pages?.toString() || "");
  const [editedWordsPerPage, setEditedWordsPerPage] = useState<string>(project.words_per_page?.toString() || "250");
  const [editedReadingSpeed, setEditedReadingSpeed] = useState<string>(project.reading_speed_wpm?.toString() || "230");
  const [isCalculatingWords, setIsCalculatingWords] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🎯 Performance Monitoring: Track when ProjectDetail is rendered
  useEffect(() => {
    console.log(`⏱️ [PERF] ProjectDetail Rendered: ${project.id}`);
    // End the total timer after all data is loaded
    const checkComplete = () => {
      // Small delay to ensure all child components are rendered
      setTimeout(() => {
        console.timeEnd(`⏱️ [PERF] Total Project Load: ${project.id}`);
      }, 100);
    };
    checkComplete();
  }, [project.id]);

  // Sync edited values when project changes (e.g., after reload)
  useEffect(() => {
    setEditedTitle(project.title || "");
    setEditedLogline(project.logline || "");
    setEditedType(project.type || "");
    setEditedGenre(project.genre || "");
    setEditedLinkedWorldId(project.linkedWorldId || "none");
    setEditedDuration(project.duration || "");
    setEditedNarrativeStructure(project.narrative_structure || "");
    setEditedBeatTemplate(project.beat_template || "");
    const parsedGenres = parseProjectGenreField(project.genre);
    setEditedGenresMulti(parsedGenres);
    setEditedCustomGenrePool(customGenresFromSelection(parsedGenres));
    setEditedEpisodeLayout(project.episode_layout || "");
    setEditedSeasonEngine(project.season_engine || "");
    setEditedConceptBlocks(normalizeConceptBlocks(project.concept_blocks));
    setEditedTargetPages(project.target_pages?.toString() || "");
    setEditedWordsPerPage(project.words_per_page?.toString() || "250");
    setEditedReadingSpeed(project.reading_speed_wpm?.toString() || "230");
  }, [project.id, project.title, project.logline, project.type, project.genre, project.linkedWorldId, project.duration, project.narrative_structure, project.beat_template, project.episode_layout, project.season_engine, project.target_pages, project.words_per_page, project.reading_speed_wpm, project.concept_blocks]);

  // 📖 Calculate word count from timeline cache (live recalculation)
  const [calculatedWords, setCalculatedWords] = useState(project.current_words || 0);
  
  useEffect(() => {
    if (project.type !== 'book') return;
    
    const timelineData = timelineCache[project.id];
    if (!timelineData?.scenes) {
      // Fallback to stored value
      setCalculatedWords(project.current_words || 0);
      return;
    }
    
    // Extract text from TipTap JSON
    const extractTextFromTiptap = (node: any): string => {
      if (!node) return '';
      let text = '';
      if (node.text) text += node.text;
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          text += extractTextFromTiptap(child) + ' ';
        }
      }
      return text;
    };
    
    // Count words in all scenes
    let totalWords = 0;
    timelineData.scenes.forEach((scene) => {
      const content = scene.content || scene.metadata?.content || scene.description;
      if (content) {
        try {
          const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
          const textContent = extractTextFromTiptap(contentObj);
          if (textContent.trim()) {
            const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
            totalWords += words.length;
          }
        } catch (e) {
          const textContent = typeof content === 'string' ? content : '';
          if (textContent.trim()) {
            const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
            totalWords += words.length;
          }
        }
      }
    });
    
    console.log(`📊 [BOOK METRICS] Calculated ${totalWords} words from timeline cache (${timelineData.scenes.length} scenes)`);
    setCalculatedWords(totalWords);
  }, [project.id, project.type, timelineCache, project.current_words]);

  // Scenes State with localStorage persistence
  const getInitialScenes = () => {
    const storageKey = `project-${project.id}-scenes`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        return parsed.map((scene: any) => ({
          ...scene,
          lastEdited: new Date(scene.lastEdited)
        }));
      } catch (e) {
        console.error('Error loading scenes from localStorage:', e);
      }
    }
    // Return empty array - scenes will be created by user
    return [];
  };

  const [scenesState, setScenesState] = useState(getInitialScenes);

  // Save scenes to localStorage whenever they change
  useEffect(() => {
    const storageKey = `project-${project.id}-scenes`;
    localStorage.setItem(storageKey, JSON.stringify(scenesState));
  }, [scenesState, project.id]);
  
  // New Scene Dialog States
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [newSceneDescription, setNewSceneDescription] = useState("");
  const [newSceneNumber, setNewSceneNumber] = useState("");
  const [newSceneImage, setNewSceneImage] = useState<string | undefined>(undefined);
  const newSceneImageInputRef = useRef<HTMLInputElement>(null);
  
  // Conflict Dialog States
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictSceneData, setConflictSceneData] = useState<any>(null);
  const [gifCoverPending, setGifCoverPending] = useState<File | null>(null);
  // Upload runs in background via startBackgroundUpload — no local loading state needed

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const uploadProjectCoverFile = (file: File, gifMode?: ImageUploadGifMode) => {
    startBackgroundUpload({
      file,
      target: { kind: 'project-cover', projectId: project.id },
      prepOptions: gifMode ? { gifMode } : undefined,
      onSuccess: (imageUrl) => {
        onCoverImageChange(imageUrl);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    try {
      validateImageFile(file, 5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
      return;
    }

    if (needsGifUserConfirmation(file)) {
      setGifCoverPending(file);
      return;
    }

    uploadProjectCoverFile(file, undefined);
  };

  const moveScene = (dragIndex: number, hoverIndex: number) => {
    const dragScene = scenesState[dragIndex];
    const newScenes = [...scenesState];
    newScenes.splice(dragIndex, 1);
    newScenes.splice(hoverIndex, 0, dragScene);
    
    // Renumber scenes
    const renumbered = newScenes.map((scene, idx) => ({
      ...scene,
      number: idx + 1
    }));
    
    setScenesState(renumbered);
  };

  const updateSceneImage = (sceneId: string, imageUrl: string) => {
    setScenesState(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, image: imageUrl } : scene
    ));
  };

  const updateSceneDetails = (sceneId: string, title: string, description: string) => {
    setScenesState(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, title, description, lastEdited: new Date() } : scene
    ));
  };

  const handleCreateScene = () => {
    const targetNumber = parseInt(newSceneNumber) || scenesState.length + 1;
    const existingScene = scenesState.find(s => s.number === targetNumber);
    
    const newScene = {
      id: Date.now().toString(),
      number: targetNumber,
      title: newSceneTitle,
      description: newSceneDescription,
      image: newSceneImage,
      lastEdited: new Date()
    };

    if (existingScene) {
      // Conflict detected - show dialog
      setConflictSceneData(newScene);
      setShowConflictDialog(true);
    } else {
      // No conflict - insert directly
      insertScene(newScene, "none");
    }
  };

  const insertScene = (newScene: any, action: "up" | "down" | "none") => {
    let updatedScenes = [...scenesState];
    
    if (action === "down") {
      // Move existing scenes at this position and below down
      updatedScenes = updatedScenes.map(scene => 
        scene.number >= newScene.number ? { ...scene, number: scene.number + 1 } : scene
      );
    } else if (action === "up") {
      // Move existing scenes at this position and above up
      updatedScenes = updatedScenes.map(scene => 
        scene.number <= newScene.number ? { ...scene, number: scene.number - 1 } : scene
      );
    }
    
    updatedScenes.push(newScene);
    updatedScenes.sort((a, b) => a.number - b.number);
    
    // Renumber all scenes to ensure continuous numbering
    const renumbered = updatedScenes.map((scene, idx) => ({
      ...scene,
      number: idx + 1
    }));
    
    setScenesState(renumbered);
    resetNewSceneForm();
  };

  const resetNewSceneForm = () => {
    setShowNewScene(false);
    setNewSceneTitle("");
    setNewSceneDescription("");
    setNewSceneNumber("");
    setNewSceneImage(undefined);
  };

  const handleNewSceneImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSceneImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Characters State - NO MORE MOCK DATA! ✅
  const getInitialCharacters = () => {
    // Return empty array - characters will be loaded from backend
    return [];
  };

  const [charactersState, setCharactersState] = useState(getInitialCharacters);
  const [charactersLoading, setCharactersLoading] = useState(true);

  // Load characters from backend on mount
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        console.time(`⏱️ [PERF] Characters Load: ${project.id}`);
        setCharactersLoading(true);
        const token = await getAuthToken();
        if (!token) {
          console.log("[ProjectDetail] No auth token, using localStorage characters");
          setCharactersLoading(false);
          console.timeEnd(`⏱️ [PERF] Characters Load: ${project.id}`);
          return;
        }

        // Load characters from API
        const characters = await getCharacters(project.id, token);
        
        console.log("[ProjectDetail] Loaded characters from backend:", characters);
        console.log("[ProjectDetail] 📸 Character Images:", characters.map(c => ({
          name: c.name,
          imageUrl: c.imageUrl,
          hasImage: !!c.imageUrl
        })));
        
        // Transform to match local format
        const transformedCharacters = characters.map((char: any) => ({
          id: char.id,
          name: char.name,
          role: char.role || "Character",
          description: char.description || "",
          age: char.age || "",
          gender: char.gender || "",
          species: char.species || "",
          backgroundStory: char.backstory || "",
          skills: char.skills || "",
          strengths: char.strengths || "",
          weaknesses: char.weaknesses || "",
          characterTraits: char.personality || "",
          image: char.imageUrl || char.image_url,
          imageUrl: char.imageUrl || char.image_url, // For timeline/shots
          lastEdited: new Date(char.updatedAt || char.updated_at)
        }));
        
        setCharactersState(transformedCharacters);
        console.timeEnd(`⏱️ [PERF] Characters Load: ${project.id}`);
      } catch (error: any) {
        console.error("[ProjectDetail] Error loading characters:", error);
        console.timeEnd(`⏱️ [PERF] Characters Load: ${project.id}`);
        // Keep localStorage/mock characters on error
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, [project.id]);

  // Save characters to localStorage whenever they change (as backup)
  useEffect(() => {
    const storageKey = `project-${project.id}-characters`;
    localStorage.setItem(storageKey, JSON.stringify(charactersState));
  }, [charactersState, project.id]);

  // New Character Dialog States
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterRole, setNewCharacterRole] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [newCharacterAge, setNewCharacterAge] = useState("");
  const [newCharacterGender, setNewCharacterGender] = useState("");
  const [newCharacterSpecies, setNewCharacterSpecies] = useState("");
  const [newCharacterBackgroundStory, setNewCharacterBackgroundStory] = useState("");
  const [newCharacterSkills, setNewCharacterSkills] = useState("");
  const [newCharacterStrengths, setNewCharacterStrengths] = useState("");
  const [newCharacterWeaknesses, setNewCharacterWeaknesses] = useState("");
  const [newCharacterTraits, setNewCharacterTraits] = useState("");
  const [newCharacterImage, setNewCharacterImage] = useState<string | undefined>(undefined);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | undefined>(undefined);
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);
  const newCharacterImageInputRef = useRef<HTMLInputElement>(null);

  const updateCharacterImage = async (characterId: string, imageUrl: string) => {
    // Optimistic update
    const previousCharacters = charactersState;
    setCharactersState(prev => prev.map(character => 
      character.id === characterId ? { ...character, image: imageUrl } : character
    ));

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      await updateCharacterApi(characterId, { imageUrl }, token);
    } catch (error: any) {
      console.error("[ProjectDetail] Error updating character image:", error);
      // Rollback on error
      setCharactersState(previousCharacters);
      toast.error(error.message || "Fehler beim Aktualisieren des Bildes");
    }
  };

  const updateCharacterDetails = async (characterId: string, updates: {
    name: string;
    role: string;
    description: string;
    age?: string;
    gender?: string;
    species?: string;
    backgroundStory?: string;
    skills?: string;
    strengths?: string;
    weaknesses?: string;
    characterTraits?: string;
  }) => {
    // Optimistic update
    const previousCharacters = charactersState;
    setCharactersState(prev => prev.map(character => 
      character.id === characterId ? { ...character, ...updates, lastEdited: new Date() } : character
    ));

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      // Transform to API format
      await updateCharacterApi(characterId, {
        name: updates.name,
        role: updates.role,
        description: updates.description,
        age: updates.age,
        gender: updates.gender,
        species: updates.species,
        backstory: updates.backgroundStory,
        skills: updates.skills,
        strengths: updates.strengths,
        weaknesses: updates.weaknesses,
        personality: updates.characterTraits,
      }, token);

      toast.success("Character aktualisiert");
    } catch (error: any) {
      console.error("[ProjectDetail] Error updating character:", error);
      // Rollback on error
      setCharactersState(previousCharacters);
      toast.error(error.message || "Fehler beim Aktualisieren des Characters");
    }
  };

  const deleteCharacter = async (characterId: string) => {
    // Optimistic update: Sofort aus UI entfernen
    const previousCharacters = charactersState;
    setCharactersState(prev => prev.filter(character => character.id !== characterId));
    
    try {
      // API Call zum Backend
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }
      
      await deleteCharacterApi(characterId, token);
      toast.success("Character erfolgreich gelöscht");
    } catch (error: any) {
      console.error("[ProjectDetail] Error deleting character:", error);
      // Bei Fehler: Rollback zum vorherigen State
      setCharactersState(previousCharacters);
      toast.error(error.message || "Fehler beim Löschen des Characters");
    }
  };

  const handleCreateCharacter = async () => {
    try {
      // Validation
      if (!newCharacterName.trim()) {
        toast.error("Bitte gib einen Namen ein");
        return;
      }

      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      // Optimistic update: Sofort hinzufügen mit temporärer ID
      const tempId = `temp-${Date.now()}`;
      const tempCharacter = {
        id: tempId,
        name: newCharacterName,
        role: newCharacterRole,
        description: newCharacterDescription,
        age: newCharacterAge,
        gender: newCharacterGender,
        species: newCharacterSpecies,
        backgroundStory: newCharacterBackgroundStory,
        skills: newCharacterSkills,
        strengths: newCharacterStrengths,
        weaknesses: newCharacterWeaknesses,
        characterTraits: newCharacterTraits,
        image: newCharacterImage,
        lastEdited: new Date()
      };

      setCharactersState(prev => [...prev, tempCharacter]);
      resetNewCharacterForm();

      // API Call zum Backend
      const createdCharacter = await createCharacterApi(
        project.id,
        {
          name: newCharacterName,
          role: newCharacterRole || "Character",
          description: newCharacterDescription,
          age: newCharacterAge,
          gender: newCharacterGender,
          species: newCharacterSpecies,
          backstory: newCharacterBackgroundStory,
          skills: newCharacterSkills,
          strengths: newCharacterStrengths,
          weaknesses: newCharacterWeaknesses,
          personality: newCharacterTraits,
          imageUrl: newCharacterImage,
        },
        token
      );

      console.log("[ProjectDetail] Character created:", createdCharacter);

      // Replace temp character with real one from backend
      setCharactersState(prev => 
        prev.map(char => 
          char.id === tempId 
            ? {
                id: createdCharacter.id,
                name: createdCharacter.name,
                role: createdCharacter.role || "Character",
                description: createdCharacter.description || "",
                age: createdCharacter.age || "",
                gender: createdCharacter.gender || "",
                species: createdCharacter.species || "",
                backgroundStory: createdCharacter.backstory || "",
                skills: createdCharacter.skills || "",
                strengths: createdCharacter.strengths || "",
                weaknesses: createdCharacter.weaknesses || "",
                characterTraits: createdCharacter.personality || "",
                image: createdCharacter.imageUrl || createdCharacter.image_url,
                lastEdited: new Date(createdCharacter.updatedAt || createdCharacter.updated_at)
              }
            : char
        )
      );

      toast.success("Character erfolgreich erstellt");
    } catch (error: any) {
      console.error("[ProjectDetail] Error creating character:", error);
      toast.error(error.message || "Fehler beim Erstellen des Characters");
      
      // Remove temp character on error
      setCharactersState(prev => prev.filter(char => !char.id.startsWith('temp-')));
    }
  };

  const resetNewCharacterForm = () => {
    setShowNewCharacter(false);
    setNewCharacterName("");
    setNewCharacterRole("");
    setNewCharacterDescription("");
    setNewCharacterAge("");
    setNewCharacterGender("");
    setNewCharacterSpecies("");
    setNewCharacterBackgroundStory("");
    setNewCharacterSkills("");
    setNewCharacterStrengths("");
    setNewCharacterWeaknesses("");
    setNewCharacterTraits("");
    setNewCharacterImage(undefined);
  };

  const handleNewCharacterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string);
        setShowImageCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = (croppedImage: string) => {
    setNewCharacterImage(croppedImage);
    setShowImageCropDialog(false);
    setTempImageForCrop(undefined);
  };

  const handleSaveProjectInfo = async () => {
    // Validation: At least 1 genre required
    if (!editedGenresMulti || editedGenresMulti.length === 0) {
      toast.error("Bitte wähle mindestens ein Genre aus");
      return;
    }

    try {
      const previousBeatTemplate = project.beat_template;
      const beatTemplateChanged = editedBeatTemplate !== previousBeatTemplate;

      // Update project in backend
      await projectsApi.update(project.id, {
        title: editedTitle,
        logline: editedLogline,
        type: editedType,
        genre: editedGenresMulti.join(", "), // Convert array to comma-separated string
        duration: editedDuration,
        linkedWorldId: editedLinkedWorldId === "none" ? null : editedLinkedWorldId,
        concept_blocks: editedConceptBlocks,
        // Series: episode_layout + season_engine
        episode_layout: editedType === 'series' ? (editedEpisodeLayout || undefined) : undefined,
        season_engine: editedType === 'series' ? (editedSeasonEngine || undefined) : undefined,
        // Film/Book/Audio: narrative_structure
        narrative_structure: editedType !== 'series' ? (editedNarrativeStructure || undefined) : undefined,
        beat_template: editedBeatTemplate || undefined,
        // 📖 Book Metrics
        target_pages: editedType === 'book' ? (editedTargetPages ? parseInt(editedTargetPages) : undefined) : undefined,
        words_per_page: editedType === 'book' ? (editedWordsPerPage ? parseInt(editedWordsPerPage) : 250) : undefined,
        reading_speed_wpm: editedType === 'book' ? (editedReadingSpeed ? parseInt(editedReadingSpeed) : 230) : undefined,
      });

      // 🎬 Generate Beats if template changed
      if (beatTemplateChanged && editedBeatTemplate && editedBeatTemplate !== 'custom') {
        const template = BEAT_TEMPLATES[editedBeatTemplate];
        if (template) {
          toast.info("Generiere Beats...");
          
          // Delete existing beats for this project
          const existingBeats = await BeatsAPI.getBeats(project.id);
          await Promise.all(existingBeats.map(beat => BeatsAPI.deleteBeat(beat.id)));
          
          // Create new beats from template
          // Assuming first act exists for container reference
          const acts = await TimelineAPI.getActs(project.id, await getAuthToken() || '');
          const firstActId = acts[0]?.id || 'temp-act-id';
          
          await Promise.all(
            template.beats.map((beat, index) => 
              BeatsAPI.createBeat({
                project_id: project.id,
                label: beat.label,
                template_abbr: template.abbr,
                description: '',
                from_container_id: firstActId,
                to_container_id: firstActId,
                pct_from: beat.pctFrom,
                pct_to: beat.pctTo,
                color: beat.color,
                notes: '',
                order_index: index,
              })
            )
          );
          
          toast.success(`${template.beats.length} Beats generiert`);
        }
      }

      // Refresh data to sync with backend
      await onUpdate();

      // Exit edit mode
      setIsEditingInfo(false);

      toast.success("Projekt gespeichert");
    } catch (error: any) {
      console.error("[ProjectDetail] Error updating project info:", error);
      toast.error(error.message || "Fehler beim Speichern");
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="absolute top-4 left-4 backdrop-blur-sm bg-background/80 rounded-full h-9 px-3 z-10"
      >
        <ArrowLeft className="size-4 mr-1" />
        Zurück
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <GifAnimationUploadDialog
        open={gifCoverPending !== null}
        onOpenChange={(open) => {
          if (!open) setGifCoverPending(null);
        }}
        fileName={gifCoverPending?.name}
        allowKeepGif={
          gifCoverPending ? gifCoverPending.size <= STORAGE_CONFIG.MAX_FILE_SIZE : true
        }
        onConvert={() => {
          const f = gifCoverPending;
          if (!f) return;
          setGifCoverPending(null);
          void uploadProjectCoverFile(f, "convert-static");
        }}
        onKeepGif={() => {
          const f = gifCoverPending;
          if (!f) return;
          if (f.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
            toast.error(
              `GIF ist größer als ${(STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB — bitte mit Konvertierung oder ein kleineres GIF wählen.`
            );
            return;
          }
          setGifCoverPending(null);
          void uploadProjectCoverFile(f, "keep-animation");
        }}
      />

      {/* MOBILE LAYOUT (<768px): Cover oben + Collapsible Info */}
      <div className="md:hidden">
        {/* Cover Top Centered */}
        <div className="pt-16 pb-4 flex justify-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="relative group">
            <div 
              onClick={() => handleCoverClick()}
              className={`w-[240px] aspect-[2/3] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shadow-lg ${
                "cursor-pointer"
              }`}
              style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {coverImage && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
              {/* Project Type Icon + Dimensions - Centered when no cover */}
              {!coverImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {(() => {
                    const typeInfo = getProjectTypeInfo(project.type);
                    const TypeIcon = typeInfo.Icon;
                    return <TypeIcon className="size-16 text-primary/30" />;
                  })()}
                  <p className="text-xs text-muted-foreground">800 × 1200 px</p>
                </div>
              )}
              {/* Hover overlay for camera icon */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <Camera className="size-6 text-primary" />
                </div>
              </div>
              {/* Upload overlay removed — uploads run in background with toast notifications */}
            </div>
          </div>
        </div>

        {/* Collapsible Info - Default: CLOSED */}
        <div className="px-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <Card className="mb-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                  <ProjectInfoSectionTitle
                    projectType={isEditingInfo ? editedType : project.type}
                  />
                  <ChevronDown className="size-4 text-muted-foreground transition-transform" />
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <Card className="mb-4">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <ProjectInfoSectionTitle
              projectType={isEditingInfo ? editedType : project.type}
            />
            
            {/* SAVE BUTTON + 3-PUNKTE-MENÜ */}
            <div className="flex items-center gap-2">
              {/* SAVE BUTTON - nur im Edit-Modus sichtbar */}
              {isEditingInfo && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveProjectInfo}
                  className="h-8 gap-1.5"
                >
                  <Save className="size-3.5" />
                  Speichern
                </Button>
              )}
              
              {/* 3-PUNKTE-MENÜ */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isEditingInfo ? (
                    <>
                      <DropdownMenuItem onClick={handleSaveProjectInfo}>
                        <Save className="size-3.5 mr-2" />
                        Speichern
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Reset to original values
                        setIsEditingInfo(false);
                        setEditedTitle(project.title || "");
                        setEditedLogline(project.logline || "");
                        setEditedType(project.type || "");
                        setEditedGenre(project.genre || "");
                        setEditedLinkedWorldId(project.linkedWorldId || "none");
                        setEditedDuration(project.duration || "");
                        setEditedNarrativeStructure(project.narrative_structure || "");
                        setEditedBeatTemplate(project.beat_template || "");
                        const pgM = parseProjectGenreField(project.genre);
                        setEditedGenresMulti(pgM);
                        setEditedCustomGenrePool(customGenresFromSelection(pgM));
                        setEditedConceptBlocks(normalizeConceptBlocks(project.concept_blocks));
                        setEditedEpisodeLayout(project.episode_layout || "");
                        setEditedSeasonEngine(project.season_engine || "");
                        setEditedTargetPages(project.target_pages?.toString() || "");
                        setEditedWordsPerPage(project.words_per_page?.toString() || "250");
                        setEditedReadingSpeed(project.reading_speed_wpm?.toString() || "230");
                      }}>
                        <X className="size-3.5 mr-2" />
                        Abbrechen
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditingInfo(true)}>
                        <Edit2 className="size-3.5 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      {onDuplicate && (
                        <DropdownMenuItem onClick={onDuplicate}>
                          <Copy className="size-3.5 mr-2" />
                          Projekt duplizieren
                        </DropdownMenuItem>
                      )}
                      {onShowStats && (
                        <DropdownMenuItem onClick={onShowStats}>
                          <BarChart3 className="size-3.5 mr-2" />
                          Statistiken & Logs
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="size-3.5 mr-2" />
                        Projekt löschen
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {isEditingInfo ? (
              <>
                <div>
                  <Label htmlFor="project-title" className="text-sm mb-2 block font-bold">Titel</Label>
                  <Input
                    id="project-title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="project-logline" className="text-sm mb-2 block font-bold">Logline</Label>
                  <Textarea
                    id="project-logline"
                    value={editedLogline}
                    onChange={(e) => setEditedLogline(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="project-type" className="text-sm mb-2 block font-bold">Project Type</Label>
                    <Select value={editedType} onValueChange={setEditedType}>
                      <SelectTrigger id="project-type" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="film">Film</SelectItem>
                        <SelectItem value="series">Serie</SelectItem>
                        <SelectItem value="book">Buch</SelectItem>
                        <SelectItem value="audio">Hörspiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project-duration" className="text-sm mb-2 block font-bold">
                      {editedType === 'book' ? 'Zielumfang' : 'Dauer'}
                    </Label>
                    {editedType === 'book' ? (
                      <Input
                        id="project-target-pages"
                        type="number"
                        value={editedTargetPages}
                        onChange={(e) => setEditedTargetPages(e.target.value)}
                        placeholder="300"
                        className="h-9"
                      />
                    ) : (
                      <Input
                        id="project-duration"
                        value={editedDuration}
                        onChange={(e) => setEditedDuration(e.target.value)}
                        placeholder="90 min"
                        className="h-9"
                      />
                    )}
                  </div>
                </div>

                {/* Book Advanced Metrics - Mobile */}
                {editedType === 'book' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="words-per-page-mobile" className="text-sm mb-2 block font-bold">Wörter/Seite</Label>
                      <Input
                        id="words-per-page-mobile"
                        type="number"
                        value={editedWordsPerPage}
                        onChange={(e) => setEditedWordsPerPage(e.target.value)}
                        placeholder="250"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reading-speed-mobile" className="text-sm mb-2 block font-bold">Lesegeschw. (WPM)</Label>
                      <Input
                        id="reading-speed-mobile"
                        type="number"
                        value={editedReadingSpeed}
                        onChange={(e) => setEditedReadingSpeed(e.target.value)}
                        placeholder="230"
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Genres - Multi-Select Pills */}
                <div className="col-span-3">
                  <Label className="text-sm mb-2 block font-bold">Genres</Label>
                  <GenrePillGrid
                    selected={editedGenresMulti}
                    onSelectedChange={setEditedGenresMulti}
                    customPool={editedCustomGenrePool}
                    onCustomPoolChange={setEditedCustomGenrePool}
                    compact
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ein oder mehrere Genres; mit + eigene ergänzen.
                  </p>
                </div>

                {/* Narrative Structure - Conditional Layout */}
                {editedType === 'series' ? (
                  /* SERIES: Episode Layout + Season Engine */
                  <div className="grid grid-cols-2 gap-3">
                    {/* Episode Layout */}
                    <div>
                      <Label htmlFor="episode-layout" className="text-sm mb-2 block font-bold">Episode Layout</Label>
                      <Select value={editedEpisodeLayout} onValueChange={setEditedEpisodeLayout}>
                        <SelectTrigger id="episode-layout" className="h-9">
                          <SelectValue placeholder="Keine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sitcom-2-act">Sitcom 2-Akt</SelectItem>
                          <SelectItem value="sitcom-4-act">Sitcom 4-Akt</SelectItem>
                          <SelectItem value="network-5-act">Network 5-Akt</SelectItem>
                          <SelectItem value="streaming-3-act">Streaming 3-Akt</SelectItem>
                          <SelectItem value="streaming-4-act">Streaming 4-Akt</SelectItem>
                          <SelectItem value="anime-ab">Anime A/B</SelectItem>
                          <SelectItem value="sketch-segmented">Sketch/Segmented</SelectItem>
                          <SelectItem value="kids-11min">Kids 11-Min</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Season Engine */}
                    <div>
                      <Label htmlFor="season-engine" className="text-sm mb-2 block font-bold">Season Engine</Label>
                      <Select value={editedSeasonEngine} onValueChange={setEditedSeasonEngine}>
                        <SelectTrigger id="season-engine" className="h-9">
                          <SelectValue placeholder="Keine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="serial">Serial (Season-Arc)</SelectItem>
                          <SelectItem value="motw">MOTW/COTW</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Arc+MOTW)</SelectItem>
                          <SelectItem value="anthology">Anthology (episodisch)</SelectItem>
                          <SelectItem value="seasonal-anthology">Seasonal Anthology</SelectItem>
                          <SelectItem value="limited-series">Limited Series</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  /* FILM/BOOK/AUDIO: Narrative Structure */
                  <div>
                    <Label htmlFor="narrative-structure" className="text-sm mb-2 block font-bold">Narrative Structure</Label>
                    <Select value={editedNarrativeStructure} onValueChange={setEditedNarrativeStructure}>
                      <SelectTrigger id="narrative-structure" className="h-9">
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Film Structures */}
                        {editedType === 'film' && (
                          <>
                            <SelectItem value="3-act">3-Akt (klassisch)</SelectItem>
                            <SelectItem value="4-act">4-Akt (gesplittetes Act II)</SelectItem>
                            <SelectItem value="5-act">5-Akt (Freytag)</SelectItem>
                            <SelectItem value="8-sequences">8-Sequenzen ("Mini-Movies")</SelectItem>
                            <SelectItem value="kishotenketsu">Kishōtenketsu (4-Teiler)</SelectItem>
                            <SelectItem value="non-linear">Nicht-linear / Rashomon</SelectItem>
                          </>
                        )}
                        {/* Buch Structures */}
                        {editedType === 'book' && (
                          <>
                            <SelectItem value="3-part">3-Teiler (klassisch)</SelectItem>
                            <SelectItem value="hero-journey">Heldenreise</SelectItem>
                            <SelectItem value="save-the-cat">Save the Cat (adapted)</SelectItem>
                          </>
                        )}
                        {/* Hörspiel Structures */}
                        {editedType === 'audio' && (
                          <>
                            <SelectItem value="30min-3-act">30 min / 3-Akt</SelectItem>
                            <SelectItem value="60min-4-act">60 min / 4-Akt</SelectItem>
                            <SelectItem value="podcast-25-35min">Podcast 25–35 min</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Beat Template - Always shown */}
                <div>
                  <Label htmlFor="beat-template" className="text-sm mb-2 block font-bold">Beat Template</Label>
                  <Select value={editedBeatTemplate} onValueChange={setEditedBeatTemplate}>
                    <SelectTrigger id="beat-template" className="h-9">
                      <SelectValue placeholder="Kein Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lite-7">Lite-7 (minimal)</SelectItem>
                      <SelectItem value="save-the-cat">Save the Cat! (15)</SelectItem>
                      <SelectItem value="syd-field">Syd Field / Paradigm</SelectItem>
                      <SelectItem value="heroes-journey">Heldenreise (Vogler, 12)</SelectItem>
                      <SelectItem value="seven-point">Seven-Point Structure</SelectItem>
                      <SelectItem value="8-sequences">8-Sequenzen</SelectItem>
                      <SelectItem value="story-circle">Story Circle 8</SelectItem>
                      {editedType === 'series' && (
                        <SelectItem value="season-lite-5">Season-Lite-5 (Macro)</SelectItem>
                      )}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project-world" className="text-sm mb-2 block font-bold">Verknüpfte Welt</Label>
                  <div className="flex gap-2">
                    <Select value={editedLinkedWorldId} onValueChange={setEditedLinkedWorldId}>
                      <SelectTrigger id="project-world" className="h-9 flex-1">
                        <SelectValue placeholder="Keine Welt verknüpft" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Welt verknüpft</SelectItem>
                        {worlds.map((world) => (
                          <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      title="Neue Welt erstellen"
                      onClick={onOpenWorldbuilding}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {editedLinkedWorldId !== "none" ? "Projekt greift auf alle Welt-Informationen zu" : "Verknüpfe eine Welt für Worldbuilding-Referenzen"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label htmlFor="project-premise" className="text-sm block font-bold">Prämisse</Label>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="Hilfe: Prämisse"
                        >
                          <Info className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                        <div className="space-y-1">
                          <div className="font-semibold">Was kommt hier rein?</div>
                          <div>Setup + Hauptfigur + Ziel + Konflikt.</div>
                          <div className="opacity-90">
                            Beispiel: „Eine Therapeutin für Götter muss …, bevor …“
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="project-premise"
                    value={getConceptContent("premise")}
                    onChange={(e) => setConceptContent("premise", e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label htmlFor="project-theme" className="text-sm block font-bold">Thema</Label>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="Hilfe: Thema"
                        >
                          <Info className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                        <div className="space-y-1">
                          <div className="font-semibold">Worum geht’s „eigentlich“?</div>
                          <div>Aussage/Frage oder Spannungsfeld.</div>
                          <div className="opacity-90">
                            Beispiele: „Verantwortung vs. Macht“, „Heilung braucht Wahrheit“
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="project-theme"
                    value={getConceptContent("theme")}
                    onChange={(e) => setConceptContent("theme", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label htmlFor="project-hook" className="text-sm block font-bold">Hook</Label>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="Hilfe: Hook"
                        >
                          <Info className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                        <div className="space-y-1">
                          <div className="font-semibold">Was ist das Einzigartige?</div>
                          <div>Der „Warum sollte ich das schauen/lesen?“-Grund.</div>
                          <div className="opacity-90">
                            Beispiele: „Therapie verändert die Welt“, „Case + Meta-Plot“
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="project-hook"
                    value={getConceptContent("hook")}
                    onChange={(e) => setConceptContent("hook", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label htmlFor="project-notes" className="text-sm block font-bold">Notiz</Label>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label="Hilfe: Notiz"
                        >
                          <Info className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                        <div className="space-y-1">
                          <div className="font-semibold">Sammelplatz</div>
                          <div>Tonalität, Regeln/No-Gos, offene Fragen, Szenenideen, Links.</div>
                          <div className="opacity-90">
                            Beispiel: „Keine Zeitreisen. Ton: Dramedy. Offene Frage: …“
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="project-notes"
                    value={getConceptContent("notes")}
                    onChange={(e) => setConceptContent("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold mb-1">Titel</p>
                  <h1 className="mb-0">{editedTitle}</h1>
                </div>
                <div>
                  <p className="text-sm font-bold mb-1">Logline</p>
                  <p className="text-sm text-muted-foreground">{editedLogline}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-bold mb-1">Project Type</p>
                    <p className="text-sm">{editedType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1">Dauer</p>
                    <p className="text-sm">{editedDuration}</p>
                  </div>
                </div>

                {/* Genres - Multi Badge Display */}
                <div>
                  <p className="text-sm font-bold mb-1">Genres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editedGenresMulti.length > 0 ? (
                      editedGenresMulti.map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Keine Genres ausgewählt</p>
                    )}
                  </div>
                </div>

                {/* Narrative Structure - Conditional Display */}
                {editedType === 'series' ? (
                  /* SERIES: Episode Layout + Season Engine */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-bold mb-1">Episode Layout</p>
                      <p className="text-sm text-muted-foreground">
                        {editedEpisodeLayout || "Kein Layout"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1">Season Engine</p>
                      <p className="text-sm text-muted-foreground">
                        {editedSeasonEngine || "Keine Engine"}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* FILM/BOOK/AUDIO: Narrative Structure */
                  <div>
                    <p className="text-sm font-bold mb-1">Narrative Structure</p>
                    <p className="text-sm text-muted-foreground">
                      {editedNarrativeStructure || "Keine Struktur festgelegt"}
                    </p>
                  </div>
                )}

                {/* Beat Template - Always shown */}
                <div>
                  <p className="text-sm font-bold mb-1">Beat Template</p>
                  <p className="text-sm text-muted-foreground">
                    {editedBeatTemplate === 'lite-7' ? 'Lite-7 (minimal)' :
                     editedBeatTemplate === 'save-the-cat' ? 'Save the Cat! (15)' :
                     editedBeatTemplate === 'syd-field' ? 'Syd Field / Paradigm' :
                     editedBeatTemplate === 'heroes-journey' ? 'Heldenreise (Vogler, 12)' :
                     editedBeatTemplate === 'seven-point' ? 'Seven-Point Structure' :
                     editedBeatTemplate === '8-sequences' ? '8-Sequenzen' :
                     editedBeatTemplate === 'story-circle' ? 'Story Circle 8' :
                     editedBeatTemplate === 'season-lite-5' ? 'Season-Lite-5 (Macro)' :
                     editedBeatTemplate === 'custom' ? 'Custom' :
                     'Kein Template'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold mb-1">Verknüpfte Welt</p>
                  <p className="text-sm text-muted-foreground">
                    {editedLinkedWorldId !== "none"
                      ? (worlds.find((w) => w.id === editedLinkedWorldId)?.name || "Verknüpft")
                      : "Keine Welt verknüpft"}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold">Prämisse</p>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            aria-label="Hilfe: Prämisse"
                          >
                            <Info className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                          <div className="space-y-1">
                            <div className="font-semibold">Was kommt hier rein?</div>
                            <div>Setup + Hauptfigur + Ziel + Konflikt.</div>
                            <div className="opacity-90">
                              Beispiel: „Eine Therapeutin für Götter muss …, bevor …“
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {getConceptContent("premise")?.trim() || "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold">Thema</p>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Thema"
                            >
                              <Info className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Worum geht’s „eigentlich“?</div>
                              <div>Aussage/Frage oder Spannungsfeld.</div>
                              <div className="opacity-90">
                                Beispiele: „Verantwortung vs. Macht“, „Heilung braucht Wahrheit“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {getConceptContent("theme")?.trim() || "—"}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold">Hook</p>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Hook"
                            >
                              <Info className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Was ist das Einzigartige?</div>
                              <div>Der „Warum sollte ich das schauen/lesen?“-Grund.</div>
                              <div className="opacity-90">
                                Beispiele: „Therapie verändert die Welt“, „Case + Meta-Plot“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {getConceptContent("hook")?.trim() || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold">Notiz</p>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            aria-label="Hilfe: Notiz"
                          >
                            <Info className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                          <div className="space-y-1">
                            <div className="font-semibold">Sammelplatz</div>
                            <div>Tonalität, Regeln/No-Gos, offene Fragen, Szenenideen, Links.</div>
                            <div className="opacity-90">
                              Beispiel: „Keine Zeitreisen. Ton: Dramedy. Offene Frage: …“
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {getConceptContent("notes")?.trim() || "—"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* DESKTOP LAYOUT (≥768px): Info links + Cover rechts */}
      <div className="hidden md:block pt-16 px-6">
        <div className="flex gap-6 items-start">
          {/* Info Left - Same height as cover (360px) */}
          <div className="flex-1">
            <Card className="h-[360px] flex flex-col">
              <CardHeader className="p-4 flex flex-row items-center justify-between shrink-0">
                <ProjectInfoSectionTitle
                  projectType={isEditingInfo ? editedType : project.type}
                />
                
                {/* SAVE BUTTON + 3-PUNKTE-MENÜ */}
                <div className="flex items-center gap-2">
                  {/* SAVE BUTTON - nur im Edit-Modus sichtbar */}
                  {isEditingInfo && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveProjectInfo}
                      className="h-8 gap-1.5"
                    >
                      <Save className="size-3.5" />
                      Speichern
                    </Button>
                  )}
                  
                  {/* 3-PUNKTE-MENÜ */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isEditingInfo ? (
                        <>
                          <DropdownMenuItem onClick={handleSaveProjectInfo}>
                            <Save className="size-3.5 mr-2" />
                            Speichern
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            // Reset to original values
                            setIsEditingInfo(false);
                            setEditedTitle(project.title || "");
                            setEditedLogline(project.logline || "");
                            setEditedType(project.type || "");
                            setEditedGenre(project.genre || "");
                            setEditedLinkedWorldId(project.linkedWorldId || "none");
                            setEditedDuration(project.duration || "");
                            setEditedNarrativeStructure(project.narrative_structure || "");
                            setEditedBeatTemplate(project.beat_template || "");
                            const pg = parseProjectGenreField(project.genre);
                            setEditedGenresMulti(pg);
                            setEditedCustomGenrePool(customGenresFromSelection(pg));
                            setEditedConceptBlocks(normalizeConceptBlocks(project.concept_blocks));
                            setEditedEpisodeLayout(project.episode_layout || "");
                            setEditedSeasonEngine(project.season_engine || "");
                            setEditedTargetPages(project.target_pages?.toString() || "");
                            setEditedWordsPerPage(project.words_per_page?.toString() || "250");
                            setEditedReadingSpeed(project.reading_speed_wpm?.toString() || "230");
                          }}>
                            <X className="size-3.5 mr-2" />
                            Abbrechen
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => setIsEditingInfo(true)}>
                            <Edit2 className="size-3.5 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          {onDuplicate && (
                            <DropdownMenuItem onClick={onDuplicate}>
                              <Copy className="size-3.5 mr-2" />
                              Projekt duplizieren
                            </DropdownMenuItem>
                          )}
                          {onShowStats && (
                            <DropdownMenuItem onClick={onShowStats}>
                              <BarChart3 className="size-3.5 mr-2" />
                              Statistiken & Logs
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Projekt löschen
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex-1 overflow-y-auto space-y-3">
                {isEditingInfo ? (
                  <>
                    {/* Same edit form as mobile - will be duplicated for simplicity */}
                    <div>
                      <Label htmlFor="project-title-desktop" className="text-xs mb-1 block">Titel</Label>
                      <Input
                        id="project-title-desktop"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="h-9 font-bold"
                      />
                    </div>
                    <Separator />
                    <div>
                      <Label htmlFor="project-logline-desktop" className="text-xs mb-1 block">Logline</Label>
                      <Textarea
                        id="project-logline-desktop"
                        value={editedLogline}
                        onChange={(e) => setEditedLogline(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="project-type-desktop" className="text-xs mb-1 block">Projekt Type</Label>
                        <Select value={editedType} onValueChange={setEditedType}>
                          <SelectTrigger id="project-type-desktop" className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="film">Film</SelectItem>
                            <SelectItem value="series">Serie</SelectItem>
                            <SelectItem value="book">Buch</SelectItem>
                            <SelectItem value="audio">Hörspiel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="project-duration-desktop" className="text-xs mb-1 block">
                          {editedType === 'book' ? 'Zielumfang' : 'Dauer'}
                        </Label>
                        {editedType === 'book' ? (
                          <Input
                            id="project-target-pages-desktop"
                            type="number"
                            value={editedTargetPages}
                            onChange={(e) => setEditedTargetPages(e.target.value)}
                            placeholder="300"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <Input
                            id="project-duration-desktop"
                            value={editedDuration}
                            onChange={(e) => setEditedDuration(e.target.value)}
                            placeholder="90 min"
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs mb-1 block">Genres</Label>
                      <GenrePillGrid
                        selected={editedGenresMulti}
                        onSelectedChange={setEditedGenresMulti}
                        customPool={editedCustomGenrePool}
                        onCustomPoolChange={setEditedCustomGenrePool}
                        compact
                      />
                    </div>
                    
                    {/* Book Advanced Metrics - Desktop */}
                    {editedType === 'book' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="words-per-page-desktop" className="text-xs mb-1 block">Wörter/Seite</Label>
                          <Input
                            id="words-per-page-desktop"
                            type="number"
                            value={editedWordsPerPage}
                            onChange={(e) => setEditedWordsPerPage(e.target.value)}
                            placeholder="250"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="reading-speed-desktop" className="text-xs mb-1 block">Lesegeschw. (WPM)</Label>
                          <Input
                            id="reading-speed-desktop"
                            type="number"
                            value={editedReadingSpeed}
                            onChange={(e) => setEditedReadingSpeed(e.target.value)}
                            placeholder="230"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    <Separator />

                    {/* Narrative Structure / Episode Layout - Desktop Edit */}
                    {editedType === 'series' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="episode-layout-desktop" className="text-xs mb-1 block">Episode Layout</Label>
                          <Select value={editedEpisodeLayout} onValueChange={setEditedEpisodeLayout}>
                            <SelectTrigger id="episode-layout-desktop" className="h-8 text-sm">
                              <SelectValue placeholder="Keine" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sitcom-2-act">Sitcom 2-Akt</SelectItem>
                              <SelectItem value="sitcom-4-act">Sitcom 4-Akt</SelectItem>
                              <SelectItem value="network-5-act">Network 5-Akt</SelectItem>
                              <SelectItem value="streaming-3-act">Streaming 3-Akt</SelectItem>
                              <SelectItem value="streaming-4-act">Streaming 4-Akt</SelectItem>
                              <SelectItem value="anime-ab">Anime A/B</SelectItem>
                              <SelectItem value="sketch-segmented">Sketch/Segmented</SelectItem>
                              <SelectItem value="kids-11min">Kids 11-Min</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="season-engine-desktop" className="text-xs mb-1 block">Season Engine</Label>
                          <Select value={editedSeasonEngine} onValueChange={setEditedSeasonEngine}>
                            <SelectTrigger id="season-engine-desktop" className="h-8 text-sm">
                              <SelectValue placeholder="Keine" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="serial">Serial (Season-Arc)</SelectItem>
                              <SelectItem value="motw">MOTW/COTW</SelectItem>
                              <SelectItem value="hybrid">Hybrid (Arc+MOTW)</SelectItem>
                              <SelectItem value="anthology">Anthology (episodisch)</SelectItem>
                              <SelectItem value="seasonal-anthology">Seasonal Anthology</SelectItem>
                              <SelectItem value="limited-series">Limited Series</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="narrative-structure-desktop" className="text-xs mb-1 block">Narrative Structure</Label>
                        <Select value={editedNarrativeStructure} onValueChange={setEditedNarrativeStructure}>
                          <SelectTrigger id="narrative-structure-desktop" className="h-8 text-sm">
                            <SelectValue placeholder="Keine" />
                          </SelectTrigger>
                          <SelectContent>
                            {editedType === 'film' && (
                              <>
                                <SelectItem value="3-act">3-Akt (klassisch)</SelectItem>
                                <SelectItem value="4-act">4-Akt (gesplittetes Act II)</SelectItem>
                                <SelectItem value="5-act">5-Akt (Freytag)</SelectItem>
                                <SelectItem value="8-sequences">8-Sequenzen ("Mini-Movies")</SelectItem>
                                <SelectItem value="kishotenketsu">Kishōtenketsu (4-Teiler)</SelectItem>
                                <SelectItem value="non-linear">Nicht-linear / Rashomon</SelectItem>
                              </>
                            )}
                            {editedType === 'book' && (
                              <>
                                <SelectItem value="3-part">3-Teiler (klassisch)</SelectItem>
                                <SelectItem value="hero-journey">Heldenreise</SelectItem>
                                <SelectItem value="save-the-cat">Save the Cat (adapted)</SelectItem>
                              </>
                            )}
                            {editedType === 'audio' && (
                              <>
                                <SelectItem value="30min-3-act">30 min / 3-Akt</SelectItem>
                                <SelectItem value="60min-4-act">60 min / 4-Akt</SelectItem>
                                <SelectItem value="podcast-25-35min">Podcast 25–35 min</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Separator />

                    {/* Beat Template - Desktop Edit */}
                    <div>
                      <Label htmlFor="beat-template-desktop" className="text-xs mb-1 block">Beat Template</Label>
                      <Select value={editedBeatTemplate} onValueChange={setEditedBeatTemplate}>
                        <SelectTrigger id="beat-template-desktop" className="h-8 text-sm">
                          <SelectValue placeholder="Kein Template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lite-7">Lite-7 (minimal)</SelectItem>
                          <SelectItem value="save-the-cat">Save the Cat! (15)</SelectItem>
                          <SelectItem value="syd-field">Syd Field / Paradigm</SelectItem>
                          <SelectItem value="heroes-journey">Heldenreise (Vogler, 12)</SelectItem>
                          <SelectItem value="seven-point">Seven-Point Structure</SelectItem>
                          <SelectItem value="8-sequences">8-Sequenzen</SelectItem>
                          <SelectItem value="story-circle">Story Circle 8</SelectItem>
                          {editedType === 'series' && (
                            <SelectItem value="season-lite-5">Season-Lite-5 (Macro)</SelectItem>
                          )}
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="project-world-desktop" className="text-xs mb-1 block">Verknüpfte Welt</Label>
                      <Select value={editedLinkedWorldId} onValueChange={setEditedLinkedWorldId}>
                        <SelectTrigger id="project-world-desktop" className="h-8 text-sm">
                          <SelectValue placeholder="Keine Welt verknüpft" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine Welt verknüpft</SelectItem>
                          {worlds.map((world) => (
                            <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="project-premise-desktop" className="text-xs block">Prämisse</Label>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Prämisse"
                            >
                              <Info className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Was kommt hier rein?</div>
                              <div>Setup + Hauptfigur + Ziel + Konflikt.</div>
                              <div className="opacity-90">
                                Beispiel: „Eine Therapeutin für Götter muss …, bevor …“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        id="project-premise-desktop"
                        value={getConceptContent("premise")}
                        onChange={(e) => setConceptContent("premise", e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="project-theme-desktop" className="text-xs block">Thema</Label>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Thema"
                            >
                              <Info className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Worum geht’s „eigentlich“?</div>
                              <div>Aussage/Frage oder Spannungsfeld.</div>
                              <div className="opacity-90">
                                Beispiele: „Verantwortung vs. Macht“, „Heilung braucht Wahrheit“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        id="project-theme-desktop"
                        value={getConceptContent("theme")}
                        onChange={(e) => setConceptContent("theme", e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="project-hook-desktop" className="text-xs block">Hook</Label>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Hook"
                            >
                              <Info className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Was ist das Einzigartige?</div>
                              <div>Der „Warum das?“-Grund in 1–2 Zeilen.</div>
                              <div className="opacity-90">
                                Beispiele: „Therapie verändert die Welt“, „Case + Meta-Plot“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        id="project-hook-desktop"
                        value={getConceptContent("hook")}
                        onChange={(e) => setConceptContent("hook", e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label htmlFor="project-notes-desktop" className="text-xs block">Notiz</Label>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              aria-label="Hilfe: Notiz"
                            >
                              <Info className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={6} className="max-w-[320px]">
                            <div className="space-y-1">
                              <div className="font-semibold">Sammelplatz</div>
                              <div>Tonalität, Regeln/No-Gos, offene Fragen, Szenenideen, Links.</div>
                              <div className="opacity-90">
                                Beispiel: „Keine Zeitreisen. Ton: Dramedy. Offene Frage: …“
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        id="project-notes-desktop"
                        value={getConceptContent("notes")}
                        onChange={(e) => setConceptContent("notes", e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Titel</div>
                      <div className="font-bold">{editedTitle}</div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Logline</div>
                      <div className="text-sm text-muted-foreground">{editedLogline || "Keine Logline"}</div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Prämisse</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {getConceptContent("premise")?.trim() || "—"}
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Thema</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {getConceptContent("theme")?.trim() || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Hook</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {getConceptContent("hook")?.trim() || "—"}
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Notiz</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {getConceptContent("notes")?.trim() || "—"}
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Projekt Type</div>
                        <div className="text-sm">{(() => {
                          const typeInfo = getProjectTypeInfo(editedType);
                          return typeInfo.label;
                        })()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {editedType === 'book' ? 'Zielumfang' : 'Dauer'}
                        </div>
                        <div className="text-sm">
                          {editedType === 'book' 
                            ? (editedTargetPages ? `${editedTargetPages} Seiten` : '–')
                            : (editedDuration || '–')
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Genres</div>
                        <div className="flex flex-wrap gap-1.5">
                          {editedGenresMulti.length > 0 ? (
                            editedGenresMulti.map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">Keine Genres</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Separator />

                    {/* Narrative Structure / Episode Layout - Desktop Read-Only */}
                    {editedType === 'series' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Episode Layout</div>
                          <div className="text-sm">{editedEpisodeLayout || "–"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Season Engine</div>
                          <div className="text-sm">{editedSeasonEngine || "–"}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Narrative Structure</div>
                        <div className="text-sm">{editedNarrativeStructure || "–"}</div>
                      </div>
                    )}
                    <Separator />

                    {/* Beat Template - Desktop Read-Only */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Beat Template</div>
                      <div className="text-sm">
                        {editedBeatTemplate === 'lite-7' ? 'Lite-7 (minimal)' :
                         editedBeatTemplate === 'save-the-cat' ? 'Save the Cat! (15)' :
                         editedBeatTemplate === 'syd-field' ? 'Syd Field / Paradigm' :
                         editedBeatTemplate === 'heroes-journey' ? 'Heldenreise (Vogler, 12)' :
                         editedBeatTemplate === 'seven-point' ? 'Seven-Point Structure' :
                         editedBeatTemplate === '8-sequences' ? '8-Sequenzen' :
                         editedBeatTemplate === 'story-circle' ? 'Story Circle 8' :
                         editedBeatTemplate === 'season-lite-5' ? 'Season-Lite-5 (Macro)' :
                         editedBeatTemplate === 'custom' ? 'Custom' :
                         '–'}
                      </div>
                    </div>
                    <Separator />

                    {/* World Link - Desktop Read-Only */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Verknüpfte Welt</div>
                      <div className="text-sm">
                        {editedLinkedWorldId !== "none"
                          ? (worlds.find((w) => w.id === editedLinkedWorldId)?.name || "Verknüpft")
                          : "Keine Welt verknüpft"}
                      </div>
                    </div>

                    {/* 📖 BOOK METRICS CARD - nur für Bücher */}
                    {editedType === 'book' && (
                      <Card className="mt-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Book className="size-4" />
                            Schreibfortschritt
                            {isCalculatingWords && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Current Words */}
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {isCalculatingWords ? '...' : calculatedWords.toLocaleString('de-DE')}
                            </div>
                            <div className="text-xs text-muted-foreground">Wörter</div>
                          </div>
                          
                          {/* Current Pages */}
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold">
                              ~{(calculatedWords / (project.words_per_page || 250)).toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">Seiten</div>
                          </div>
                          
                          {/* Progress % */}
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {project.target_pages 
                                ? ((calculatedWords / ((project.target_pages || 0) * (project.words_per_page || 250))) * 100).toFixed(1)
                                : 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">Fortschritt</div>
                          </div>
                          
                          {/* Reading Time */}
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-xl font-bold">
                              {(() => {
                                const minutes = Math.round(calculatedWords / (project.reading_speed_wpm || 230));
                                const hours = Math.floor(minutes / 60);
                                const mins = minutes % 60;
                                return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground">Lesezeit (Ø)</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cover Right */}
          <div className="shrink-0">
            <div className="relative group">
              <div 
                onClick={() => handleCoverClick()}
                className={`w-[240px] aspect-[2/3] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shadow-lg ${
                  "cursor-pointer"
                }`}
                style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!coverImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    {(() => {
                      const typeInfo = getProjectTypeInfo(project.type);
                      const TypeIcon = typeInfo.Icon;
                      return <TypeIcon className="size-16 text-primary/30" />;
                    })()}
                    <p className="text-xs text-muted-foreground">800 × 1200 px</p>
                  </div>
                )}
                {coverImage && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
                {/* Hover overlay for camera icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-3 backdrop-blur-sm">
                    <Camera className="size-6 text-primary" />
                  </div>
                </div>
                {/* Upload overlay removed — uploads run in background with toast notifications */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Content Below (Scenes, Characters, etc.) */}

      {/* Structure & Beats Section */}
      <section className="px-6 mb-8 mt-8">
        <StructureBeatsSection
          projectId={project.id}
          projectType={project.type}
          beatTemplate={project.beat_template}
          initialData={timelineCache[project.id]}
          onDataChange={(data) => onTimelineDataChange(project.id, data)}
          isLoadingCache={timelineCacheLoading[project.id]}
          // 📖 Book Metrics for Timeline Duration
          totalWords={calculatedWords}
          wordsPerPage={project.words_per_page || 250}
          readingSpeedWpm={project.reading_speed_wpm || 230}
          targetPages={project.target_pages}
        />
      </section>

      {/* Characters Section */}
      <section className="px-6 mb-8">
        <Collapsible open={charactersOpen} onOpenChange={setCharactersOpen}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#6E59A5] text-white h-8 flex items-center">Charaktere ({charactersState.length})</Badge>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {charactersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => setShowNewCharacter(true)}
              className="h-8 bg-[rgba(110,89,165,1)] text-[rgba(255,255,255,1)]"
            >
              <Plus className="size-3.5 mr-1.5" />
              Neu
            </Button>
          </div>

          <CollapsibleContent>
            <div className="space-y-3">
              {charactersState.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onImageUpload={updateCharacterImage}
                  onUpdateDetails={updateCharacterDetails}
                  onDelete={deleteCharacter}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* Concept Section */}
      {/* Concept Section removed (moved into Projekt-Informationen) */}

      {/* Inspiration Section */}
      <section className="px-4 mb-8">
        <Collapsible open={inspirationOpen} onOpenChange={setInspirationOpen}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#6E59A5] text-white h-8 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Inspiration ({inspirations.length})
              </Badge>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {inspirationOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => {
                setEditingInspiration(null);
                setShowAddInspirationDialog(true);
              }}
              className="h-8 bg-[rgba(110,89,165,1)] text-[rgba(255,255,255,1)]"
            >
              <Plus className="size-3.5 mr-1.5" />
              Neu
            </Button>
          </div>

          <CollapsibleContent>
            {inspirationsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#6E59A5]" />
              </div>
            ) : inspirations.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 mb-2">Noch keine Inspirationen</p>
                <p className="text-sm text-slate-500 mb-4">
                  Füge visuelle Referenzen hinzu für Inspiration
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingInspiration(null);
                    setShowAddInspirationDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Erste Inspiration hinzufügen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {inspirations.map((inspiration) => (
                  <InspirationCard
                    key={inspiration.id}
                    inspiration={inspiration}
                    onEdit={onEditInspiration}
                    onDelete={(id) => onDeleteInspiration(id)}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* New Scene Dialog */}
      <Dialog open={showNewScene} onOpenChange={(open) => {
        setShowNewScene(open);
        if (!open) resetNewSceneForm();
      }}>
        <DialogContent className="w-[95vw] max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto md:w-auto">
          <DialogHeader>
            <DialogTitle>Neue Szene</DialogTitle>
            <DialogDescription>Füge eine neue Szene zu deinem Projekt hinzu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input 
                  placeholder="z.B. Eröffnungsszene" 
                  className="h-11"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Szenen-Nummer</Label>
                <Input 
                  type="number" 
                  placeholder={`${scenesState.length + 1}`}
                  className="h-11"
                  value={newSceneNumber}
                  onChange={(e) => setNewSceneNumber(e.target.value)}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">Leer = ans Ende</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea 
                placeholder="Kurze Beschreibung der Szene..." 
                rows={3}
                value={newSceneDescription}
                onChange={(e) => setNewSceneDescription(e.target.value)}
              />
            </div>
            
            {/* Scene Image Upload */}
            <div className="space-y-2">
              <Label>Szenen-Bild (Optional)</Label>
              {newSceneImage ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30 max-w-[60%]">
                  <img src={newSceneImage} alt="Preview" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setNewSceneImage(undefined)}
                    className="absolute top-2 right-2 h-8"
                  >
                    <X className="size-4 mr-1" />
                    Entfernen
                  </Button>
                </div>
              ) : (
                <button 
                  onClick={() => newSceneImageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex flex-col items-center justify-center">
                    <ImageIcon className="size-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm mb-1">Bild hochladen</p>
                    <p className="text-xs text-muted-foreground">Empfohlen: 16:9 Format</p>
                  </div>
                </button>
              )}
              <input
                ref={newSceneImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleNewSceneImageChange}
                className="hidden"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowNewScene(false);
              resetNewSceneForm();
            }} className="h-11">Abbrechen</Button>
            <Button onClick={handleCreateScene} className="h-11" disabled={!newSceneTitle.trim()}>
              Szene erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="w-[95vw] max-w-xl rounded-2xl md:w-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Szenen-Konflikt</AlertDialogTitle>
            <AlertDialogDescription>
              An Position #{conflictSceneData?.number} existiert bereits eine Szene. 
              Wie sollen die bestehenden Szenen verschoben werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowConflictDialog(false)} className="h-11">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                insertScene(conflictSceneData, "up");
                setShowConflictDialog(false);
              }}
              className="h-11 bg-primary"
            >
              Bestehende nach oben verschieben
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={() => {
                insertScene(conflictSceneData, "down");
                setShowConflictDialog(false);
              }}
              className="h-11 bg-primary"
            >
              Bestehende nach unten verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Character Dialog */}
      <Dialog open={showNewCharacter} onOpenChange={(open) => {
        setShowNewCharacter(open);
        if (!open) resetNewCharacterForm();
      }}>
        <DialogContent className="w-[95vw] max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto md:w-auto">
          <DialogHeader>
            <DialogTitle>Neuer Charakter</DialogTitle>
            <DialogDescription>Erstelle einen neuen Charakter für dein Projekt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Character Image Upload - First */}
            <div className="space-y-2">
              <Label>Profilbild (Optional)</Label>
              {newCharacterImage ? (
                <div className="relative w-32 h-32 mx-auto">
                  <img src={newCharacterImage} alt="Preview" className="w-full h-full object-cover rounded-full border-4 border-character-blue-light" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setNewCharacterImage(undefined)}
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button 
                  onClick={() => newCharacterImageInputRef.current?.click()}
                  className="w-32 h-32 mx-auto border-2 border-dashed border-border rounded-full text-center hover:border-primary/50 transition-colors active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center bg-muted/10"
                >
                  <Camera className="size-8 mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Bild hochladen</p>
                </button>
              )}
              <input
                ref={newCharacterImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleNewCharacterImageChange}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                placeholder="z.B. Max Weber, Sarah Johnson" 
                className="h-11 border-2"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Input 
                placeholder="z.B. Protagonist, Antagonist, Unterstützer" 
                className="h-11 border-2"
                value={newCharacterRole}
                onChange={(e) => setNewCharacterRole(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea 
                placeholder="Kurze Zusammenfassung des Charakters..." 
                rows={3}
                className="border-2"
                value={newCharacterDescription}
                onChange={(e) => setNewCharacterDescription(e.target.value)}
              />
            </div>

            {/* Additional Character Details */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Alter</Label>
                <Input 
                  placeholder="z.B. 35" 
                  className="h-11 border-2"
                  value={newCharacterAge}
                  onChange={(e) => setNewCharacterAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Geschlecht</Label>
                <Input 
                  placeholder="Female, Male, ..." 
                  className="h-11 border-2"
                  value={newCharacterGender}
                  onChange={(e) => setNewCharacterGender(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Spezies</Label>
                <Input 
                  placeholder="Human, Alien, ..." 
                  className="h-11 border-2"
                  value={newCharacterSpecies}
                  onChange={(e) => setNewCharacterSpecies(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Story</Label>
              <Textarea 
                placeholder="Die Hintergrundgeschichte des Charakters - Herkunft, wichtige Ereignisse, Motivation..." 
                rows={3}
                className="border-2"
                value={newCharacterBackgroundStory}
                onChange={(e) => setNewCharacterBackgroundStory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <Textarea 
                placeholder="Fähigkeiten kommagetrennt (z.B. Piloting, Schwertkampf, Hacking, Heilung)" 
                rows={2}
                className="border-2"
                value={newCharacterSkills}
                onChange={(e) => setNewCharacterSkills(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Stärken</Label>
              <Textarea 
                placeholder="Was macht den Charakter stark? (z.B. Entscheidungsfreudig, Mutig, Intelligent, Loyal)" 
                rows={2}
                className="border-2"
                value={newCharacterStrengths}
                onChange={(e) => setNewCharacterStrengths(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Schwächen</Label>
              <Textarea 
                placeholder="Schwachstellen und Verletzlichkeiten (z.B. Impulsiv, Vertrauensselig, Sturköpfig)" 
                rows={2}
                className="border-2"
                value={newCharacterWeaknesses}
                onChange={(e) => setNewCharacterWeaknesses(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Charakter Traits</Label>
              <Textarea 
                placeholder="Persönlichkeitsmerkmale (z.B. Mutig, Sarkastisch, Mitf��hlend, Neugierig, Introvertiert)" 
                rows={2}
                className="border-2"
                value={newCharacterTraits}
                onChange={(e) => setNewCharacterTraits(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowNewCharacter(false);
              resetNewCharacterForm();
            }} className="h-11">Abbrechen</Button>
            <Button onClick={handleCreateCharacter} className="h-11" disabled={!newCharacterName.trim()}>
              Charakter erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {showImageCropDialog && tempImageForCrop && (
        <ImageCropDialog
          image={tempImageForCrop}
          onComplete={handleCroppedImage}
          onCancel={() => {
            setShowImageCropDialog(false);
            setTempImageForCrop(undefined);
          }}
        />
      )}

      {/* Delete Project Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
                  Das Projekt <strong>"{project.title}"</strong> wird permanent gelöscht, 
                  inklusive aller:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Szenen</li>
                  <li>Charaktere</li>
                  <li>Episoden</li>
                  <li>Projekt-Einstellungen</li>
                </ul>
                <div className="pt-2 space-y-2">
                  <Label htmlFor="delete-password" className="text-foreground">
                    Gib dein Passwort ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    placeholder="Dein Passwort"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deleteLoading}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deletePassword.trim()) {
                        onDelete();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeletePassword("");
              }}
              disabled={deleteLoading}
            >
              Abbrechen
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteLoading || !deletePassword.trim()}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Projekt löschen
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Stats & Logs Dialog */}
      <ProjectStatsLogsDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        project={project}
      />

      {/* Add/Edit Inspiration Dialog */}
      <AddInspirationDialog
        projectId={project.id}
        open={showAddInspirationDialog}
        onOpenChange={(open) => {
          setShowAddInspirationDialog(open);
          if (!open) {
            setEditingInspiration(null);
          }
        }}
        onSave={onSaveInspiration}
        editInspiration={editingInspiration}
      />

    </div>
  );
}