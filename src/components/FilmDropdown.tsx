/**
 * 🎬 FILM DROPDOWN - Hierarchical Structure View
 * 
 * Acts > Sequences > Scenes > Shots (Dropdown/Collapsible View)
 * Minimalistic inline editing with clean collapsed/expanded states
 * Drag & Drop: Within containers + Cross-container
 * Optimistic UI + Performance optimizations
 * 
 * ⚡ PERFORMANCE FIX (2025-11-02):
 * - Removed layout animation from motion.div (conflicts with Collapsible)
 * - Reduced animation complexity for smoother expand/collapse
 * - overflow-hidden on Collapsible prevents layout shift
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, MoreVertical, Copy, Edit, Info } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { cn } from './ui/utils';
import { useIsMobile } from './ui/use-mobile';
import { undoManager } from '../lib/undo-manager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ShotCard } from './ShotCard';
import { TimelineNodeStatsDialog } from './TimelineNodeStatsDialog';
import { FilmDropdownMobile } from './FilmDropdownMobile';
import { useAuth } from '../hooks/useAuth';
import * as ShotsAPI from '../lib/api/shots-api';
import {
  validateImageFile,
  needsGifUserConfirmation,
  type ImageUploadGifMode,
} from '../lib/api/image-upload-api';
import { STORAGE_CONFIG } from '../lib/config';
import { GifAnimationUploadDialog } from './GifAnimationUploadDialog';
import * as TimelineAPI from '../lib/api/timeline-api';
import * as TimelineAPIV2 from '../lib/api/timeline-api-v2';
import type { Act, Sequence, Scene, Shot, Character } from '../lib/types';
import { toast } from 'sonner';
import { perfMonitor } from '../lib/performance-monitor';
import { cacheManager } from '../lib/cache-manager';
import { useOptimizedFilmDropdown } from '../hooks/useOptimizedFilmDropdown';
import { LoadingSkeleton } from './OptimizedDropdownComponents';

// Timeline Cache Data Structure
export interface TimelineData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
}

interface FilmDropdownProps {
  projectId: string;
  projectType?: string; // 🎯 NEW: Project type for dynamic labels (film/series/book/audio)
  characters?: Character[]; // Optionally pass characters from parent to avoid double-loading
  initialData?: TimelineData; // 🚀 PERFORMANCE: Pre-loaded timeline data for instant rendering
  onDataChange?: (data: TimelineData) => void; // Callback to update parent cache
  containerRef?: React.RefObject<HTMLDivElement>; // 🎯 Ref for BeatColumn synchronization
  // 🎯 Controlled Collapse States for dynamic beat alignment
  expandedActs?: Set<string>;
  expandedSequences?: Set<string>;
  expandedScenes?: Set<string>;
  onExpandedActsChange?: (expanded: Set<string>) => void;
  onExpandedSequencesChange?: (expanded: Set<string>) => void;
  onExpandedScenesChange?: (expanded: Set<string>) => void;
  /** From timeline: expand act→sequence→scene→shot and scroll into view once. */
  expandShotId?: string | null;
  onExpandShotIdConsumed?: () => void;
}

// DnD Types
const ItemTypes = {
  ACT: 'act',
  SEQUENCE: 'sequence',
  SCENE: 'scene',
  SHOT: 'shot',
};

// =====================================================
// DROP ZONE (Einfügemarke zwischen Items) - volle Höhe!
// =====================================================

interface DropZoneProps {
  type: string;
  index: number;
  onDrop: (draggedItemId: string, targetIndex: number) => void;
  label: string;
  height?: 'act' | 'sequence' | 'scene' | 'shot';
}

function DropZone({ type, index, onDrop, label, height = 'act' }: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: type,
    drop: (item: { id: string; index: number }) => {
      onDrop(item.id, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Höhe basierend auf Item-Typ (eingeklappt)
  const heightClass = {
    act: 'h-20',      // Act Header Höhe
    sequence: 'h-14', // Sequence Header Höhe
    scene: 'h-12',    // Scene Header Höhe
    shot: 'h-24',     // Shot Card Höhe
  }[height];

  const normalHeight = {
    act: 'h-8',       // Basis-Höhe wenn nicht gehovered
    sequence: 'h-6',
    scene: 'h-6',
    shot: 'h-8',
  }[height];

  return (
    <div
      ref={drop}
      className={cn(
        'transition-all duration-100 flex items-center justify-center my-1',
        canDrop ? (isOver ? heightClass : normalHeight) : 'h-1'
      )}
    >
      {canDrop && (
        <div className={cn(
          'w-full h-full rounded-lg flex items-center justify-center transition-all duration-100',
          isOver 
            ? 'border-2 border-dashed border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-900/20'
            : 'border border-dashed border-gray-300/50 dark:border-gray-600/30 bg-transparent'
        )}>
          {isOver && (
            <span className="text-violet-700 dark:text-violet-300 text-sm font-medium">
              ↓ {label} hier einfügen
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// DRAGGABLE ACT CONTAINER (mit Swap-Drop)
// =====================================================

interface DraggableActProps {
  act: Act;
  index: number;
  onSwap: (draggedId: string, targetId: string) => void;
  children: React.ReactNode;
}

function DraggableAct({ act, index, onSwap, children }: DraggableActProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ACT,
    item: { id: act.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.ACT,
    drop: (item: { id: string; index: number }) => {
      if (item.id !== act.id) {
        onSwap(item.id, act.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        "relative transition-opacity duration-150",
        isDragging && "opacity-40 scale-[0.98]"
      )}
    >
      {isOver && !isDragging && (
        <div className="absolute -inset-0.5 border-2 border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 rounded-lg pointer-events-none z-10" />
      )}
      
      {children}
    </div>
  );
}

// =====================================================
// DRAGGABLE SEQUENCE CONTAINER (mit Swap-Drop)
// =====================================================

interface DraggableSequenceProps {
  sequence: Sequence;
  index: number;
  onSwap: (draggedId: string, targetId: string) => void;
  children: React.ReactNode;
}

function DraggableSequence({ sequence, index, onSwap, children }: DraggableSequenceProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SEQUENCE,
    item: { id: sequence.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SEQUENCE,
    drop: (item: { id: string; index: number }) => {
      if (item.id !== sequence.id) {
        onSwap(item.id, sequence.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        "relative transition-opacity duration-150",
        isDragging && "opacity-40 scale-[0.98]"
      )}
    >
      {isOver && !isDragging && (
        <div className="absolute -inset-0.5 border-2 border-green-400 dark:border-green-500 bg-green-50/20 dark:bg-green-900/10 rounded-lg pointer-events-none z-10" />
      )}
      
      {children}
    </div>
  );
}

// =====================================================
// DRAGGABLE SCENE CONTAINER (mit Swap-Drop)
// =====================================================

interface DraggableSceneProps {
  scene: Scene;
  index: number;
  onSwap: (draggedId: string, targetId: string) => void;
  children: React.ReactNode;
}

function DraggableScene({ scene, index, onSwap, children }: DraggableSceneProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SCENE,
    item: { id: scene.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SCENE,
    drop: (item: { id: string; index: number }) => {
      if (item.id !== scene.id) {
        onSwap(item.id, scene.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        "relative transition-opacity duration-150",
        isDragging && "opacity-40 scale-[0.98]"
      )}
    >
      {isOver && !isDragging && (
        <div className="absolute -inset-0.5 border-2 border-orange-400 dark:border-orange-500 bg-orange-50/20 dark:bg-orange-900/10 rounded-lg pointer-events-none z-10" />
      )}
      
      {children}
    </div>
  );
}

// =====================================================
// DRAGGABLE SHOT CONTAINER (mit Swap-Drop)
// =====================================================

interface DraggableShotProps {
  shot: Shot;
  index: number;
  onSwap: (draggedId: string, targetId: string) => void;
  children: React.ReactNode;
}

function DraggableShot({ shot, index, onSwap, children }: DraggableShotProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SHOT,
    item: { id: shot.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SHOT,
    drop: (item: { id: string; index: number }) => {
      if (item.id !== shot.id) {
        onSwap(item.id, shot.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={cn(
        "relative transition-opacity duration-150",
        isDragging && "opacity-40 scale-[0.98]"
      )}
    >
      {isOver && !isDragging && (
        <div className="absolute -inset-0.5 border-2 border-red-400 dark:border-red-500 bg-red-50/20 dark:bg-red-900/10 rounded-lg pointer-events-none z-10" />
      )}
      
      {children}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function FilmDropdown({ 
  projectId,
  projectType = 'film', // Default to film if not provided
  characters: externalCharacters,
  initialData,
  onDataChange,
  containerRef,
  expandShotId,
  onExpandShotIdConsumed,
}: FilmDropdownProps) {
  const { getAccessToken } = useAuth();
  const isMobile = useIsMobile();

  // 🎯 DYNAMIC LABELS based on project type
  const getLabels = () => {
    if (projectType === 'book') {
      return {
        sequence: 'Kapitel',
        sequences: 'Kapitel',
        addSequence: 'Kapitel hinzufügen',
        scene: 'Abschnitt',
        scenes: 'Abschnitte',
        addScene: 'Abschnitt hinzufügen',
        shot: 'Shot', // Not used for books
        shots: 'Shots',
        addShot: 'Shot hinzufügen',
        showShots: false, // Hide shots for books
      };
    }
    // Default: film/series/audio
    return {
      sequence: 'Sequence',
      sequences: 'Sequences',
      addSequence: 'Sequence hinzufügen',
      scene: 'Szene',
      scenes: 'Szenen',
      addScene: 'Szene hinzufügen',
      shot: 'Shot',
      shots: 'Shots',
      addShot: 'Shot hinzufügen',
      showShots: true,
    };
  };

  const labels = getLabels();

  // State - Initialize with initialData if available for instant rendering 🚀
  const [acts, setActs] = useState<Act[]>(initialData?.acts || []);
  const [sequences, setSequences] = useState<Sequence[]>(initialData?.sequences || []);
  const [scenes, setScenes] = useState<Scene[]>(initialData?.scenes || []);
  const [shots, setShots] = useState<Shot[]>(initialData?.shots || []);
  const [loading, setLoading] = useState(!initialData); // No loading if we have initialData!

  // Expand/Collapse State
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [expandedShots, setExpandedShots] = useState<Set<string>>(new Set());
  const [loadingSceneShots, setLoadingSceneShots] = useState<Set<string>>(new Set());
  
  // Project Characters for @-mentions
  // Use external characters if provided, otherwise load from API
  const [characters, setCharacters] = useState<Character[]>(externalCharacters || []);

  // Edit State (for inline editing)
  const [editingAct, setEditingAct] = useState<string | null>(null);
  const [editingSequence, setEditingSequence] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { title?: string; description?: string }>>({});

  // Creating State
  const [creating, setCreating] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Info Dialog State
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogData, setInfoDialogData] = useState<{
    type: 'act' | 'sequence' | 'scene' | 'shot';
    node: Act | Sequence | Scene | Shot;
  } | null>(null);

  const [gifShotPending, setGifShotPending] = useState<{ shotId: string; file: File } | null>(null);
  const [shotImageUploadingId, setShotImageUploadingId] = useState<string | null>(null);
  /** Verhindert, dass beim Schließen des GIF-Dialogs nach „Konvertieren“ der Upload-Overlay sofort gelöscht wird */
  const shotImageUploadInFlightRef = useRef(false);

  // 🚀 PERFORMANCE OPTIMIZATION: Memoized filtering for 10x faster rendering
  const optimized = useOptimizedFilmDropdown({
    acts,
    sequences,
    scenes,
    shots,
    expandedActs,
    expandedSequences,
    expandedScenes,
  });

  const ensureSceneShotsLoaded = useCallback(async (sceneId: string) => {
    if (!labels.showShots) return;
    if (!sceneId || loadingSceneShots.has(sceneId)) return;
    const hasLoaded = shots.some((s) => s.sceneId === sceneId);
    if (hasLoaded) return;

    try {
      setLoadingSceneShots((prev) => new Set(prev).add(sceneId));
      const token = await getAccessToken();
      if (!token) return;
      const sceneShots = await ShotsAPI.getShots(sceneId, token);
      setShots((prev) => {
        const others = prev.filter((s) => s.sceneId !== sceneId);
        return [...others, ...(sceneShots || [])];
      });
    } catch (error) {
      console.error('[FilmDropdown] Failed lazy loading shots for scene:', sceneId, error);
    } finally {
      setLoadingSceneShots((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  }, [getAccessToken, labels.showShots, loadingSceneShots, shots]);

  // =====================================================
  // LOAD DATA - Single path (ultra batch) + optional initialData
  // =====================================================

  useEffect(() => {
    if (initialData) {
      setActs(initialData.acts || []);
      setSequences(initialData.sequences || []);
      setScenes(initialData.scenes || []);
      setShots(initialData.shots || []);
      setLoading(false);
      return;
    }
    console.time(`⏱️ [PERF] FilmDropdown Full Load: ${projectId}`);
    void loadTimelineData();
  }, [projectId, initialData]);

  // Update characters when external characters change
  useEffect(() => {
    if (externalCharacters) {
      console.log('[FilmDropdown] External characters updated:', externalCharacters.length);
      setCharacters(externalCharacters);
    }
  }, [externalCharacters]);

  // Timeline → öffne Shot wie in der Dropdown-Ansicht (alle Felder / ShotCard-Menü)
  useEffect(() => {
    if (!expandShotId) return;
    const shot = shots.find((s) => s.id === expandShotId);
    if (!shot) return;

    const scene = scenes.find((sc) => sc.id === shot.sceneId);
    if (!scene) return;
    const sequence = sequences.find((seq) => seq.id === scene.sequenceId);
    if (!sequence) return;
    const act = acts.find((a) => a.id === sequence.actId);
    if (!act) return;

    setExpandedActs((prev) => new Set([...prev, act.id]));
    setExpandedSequences((prev) => new Set([...prev, sequence.id]));
    setExpandedScenes((prev) => new Set([...prev, scene.id]));
    void ensureSceneShotsLoaded(scene.id);
    setExpandedShots((prev) => new Set([...prev, shot.id]));

    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-shot-id="${expandShotId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onExpandShotIdConsumed?.();
    }, 120);
    return () => window.clearTimeout(t);
  }, [expandShotId, shots, scenes, sequences, acts, onExpandShotIdConsumed, ensureSceneShotsLoaded]);

  // 🚀 PERFORMANCE: Notify parent of data changes to update cache
  // Use ref to avoid re-triggering the effect on every render
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Update parent cache whenever data changes (immediate update to prevent race conditions)
  useEffect(() => {
    // 🚀 FIX: Update parent immediately to prevent race conditions with React re-renders
    // The 100ms timeout was causing stale data to overwrite fresh data
    if (onDataChangeRef.current && !loading) {
      onDataChangeRef.current({
        acts,
        sequences,
        scenes,
        shots,
      });
    }
  }, [acts, sequences, scenes, shots, loading]);

  const loadTimelineData = async () => {
    const cacheKey = `timeline:${projectId}`;
    const perfId = `timeline-load-${projectId}`;

    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht angemeldet');
        return;
      }

      // 🚀 CACHE: Try to load from cache first (Stale-While-Revalidate)
      const cached = cacheManager.get<TimelineData>(cacheKey);
      if (cached.data) {
        console.log(`[FilmDropdown] 💾 Loading from cache (${cached.isStale ? 'stale' : 'fresh'})`);
        setActs(cached.data.acts);
        setSequences(cached.data.sequences);
        setScenes(cached.data.scenes);
        setShots(cached.data.shots);
        
        // If fresh, we're done!
        if (!cached.isStale) {
          setLoading(false);
          perfMonitor.end(perfId, 'CACHE_READ', `Timeline Load (cached): ${projectId}`);
          return;
        }
        // If stale, continue loading in background
        console.log('[FilmDropdown] 🔄 Revalidating stale cache in background...');
      }

      perfMonitor.start(perfId);

      // Single fast path: one ultra-batch call, no eager shots, no scene content.
      const ultra = await TimelineAPIV2.ultraBatchLoadProject(projectId, token, {
        includeShots: false,
        excludeContent: true,
      });
      const loadedActs = (ultra.timeline?.acts || []).map((n: any) => TimelineAPI.nodeToAct(n));
      const loadedSequences = (ultra.timeline?.sequences || []).map((n: any) => TimelineAPI.nodeToSequence(n));
      const loadedScenes = (ultra.timeline?.scenes || []).map((n: any) => TimelineAPI.nodeToScene(n));
      const loadedShots: Shot[] = [];
      const loadedCharacters = externalCharacters
        ? []
        : ((ultra.characters || []) as Character[]);
      
      console.log('[FilmDropdown] ✅ Parallel load complete:', {
        acts: loadedActs.length,
        sequences: loadedSequences.length,
        scenes: loadedScenes.length,
        shots: loadedShots.length,
        characters: loadedCharacters.length,
      });

      // If no acts exist, initialize 3-Act structure (OUTSIDE perf tracking)
      let finalActs = loadedActs;
      let finalSequences = loadedSequences;
      let finalScenes = loadedScenes;
      if (!finalActs || finalActs.length === 0) {
        // Stop perf monitoring before initialization
        perfMonitor.end(perfId, 'TIMELINE_LOAD', `Timeline Load (API): ${projectId}`, {
          acts: 0,
          sequences: loadedSequences.length,
          scenes: loadedScenes.length,
          shots: loadedShots.length,
        });
        
        console.log('[FilmDropdown] 🏗️ Initializing 3-act structure...');
        await ShotsAPI.initializeThreeActStructure(projectId, token);
        
        // Reload minimal structure after initialization (single path).
        const ultraReload = await TimelineAPIV2.ultraBatchLoadProject(projectId, token, {
          includeShots: false,
          excludeContent: true,
        });
        finalActs = (ultraReload.timeline?.acts || []).map((n: any) => TimelineAPI.nodeToAct(n));
        finalSequences = (ultraReload.timeline?.sequences || []).map((n: any) => TimelineAPI.nodeToSequence(n));
        finalScenes = (ultraReload.timeline?.scenes || []).map((n: any) => TimelineAPI.nodeToScene(n));
        console.log('[FilmDropdown] ✅ 3-act structure initialized:', finalActs.length);
      }
      
      setActs(finalActs);
      setSequences(finalSequences);
      setScenes(finalScenes);
      setShots(loadedShots);

      // Use characters from parallel load (only if not provided by parent)
      if (!externalCharacters) {
        console.log('[FilmDropdown] Using characters from parallel load:', loadedCharacters.length);
        setCharacters(loadedCharacters);
      } else {
        console.log('[FilmDropdown] Using characters from parent:', externalCharacters.length);
      }

      // 🚀 CACHE: Save to cache
      const timelineData: TimelineData = {
        acts: finalActs,
        sequences: finalSequences,
        scenes: finalScenes,
        shots: loadedShots,
      };
      cacheManager.set(cacheKey, timelineData, {
        ttl: 10 * 60 * 1000,     // 10 minutes (increased from 5)
        staleTime: 60 * 1000,    // 60 seconds (increased from 30)
      });

      // Only end perf tracking if it wasn't already ended during initialization
      if (finalActs.length > 0 || loadedActs.length > 0) {
        perfMonitor.end(perfId, 'TIMELINE_LOAD', `Timeline Load (API): ${projectId}`, {
          acts: finalActs.length,
          sequences: finalSequences.length,
          scenes: finalScenes.length,
          shots: loadedShots.length,
        });
      }

    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast.error('Fehler beim Laden der Timeline-Daten');
      perfMonitor.end(perfId, 'TIMELINE_LOAD', `Timeline Load (ERROR): ${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ADD HANDLERS
  // =====================================================

  const handleAddAct = async () => {
    if (creating === 'act') return;

    // 🔥 FIX: Filter out temp acts and calculate correct act number
    const realActs = acts.filter(a => !a.id.startsWith('temp-'));
    const maxActNumber = realActs.reduce((max, a) => Math.max(max, a.actNumber), 0);
    const newActNumber = maxActNumber + 1;
    
    const tempId = `temp-act-${Date.now()}`;
    const optimisticAct: Act = {
      id: tempId,
      projectId,
      actNumber: newActNumber,
      title: `Act ${newActNumber}`,
      description: '',
      orderIndex: realActs.length,
    };

    setActs([...acts, optimisticAct]);
    setExpandedActs(new Set([...expandedActs, tempId]));
    setPendingIds(prev => new Set([...prev, tempId]));
    setCreating('act');

    try {
      const token = await getAccessToken();
      if (!token) {
        setActs(acts.filter(a => a.id !== tempId));
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        toast.error('Nicht angemeldet');
        setCreating(null);
        return;
      }

      const newAct = await TimelineAPI.createAct(projectId, {
        actNumber: newActNumber,
        title: `Act ${newActNumber}`,
      }, token);

      // 🚀 PERFORMANCE: Batch state updates
      setActs(acts => acts.map(a => a.id === tempId ? newAct : a));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // 🚀 CACHE: Invalidate timeline cache
      cacheManager.invalidate(`timeline:${projectId}`);
      
      // Success toast removed for instant feel - user sees the node appear!
    } catch (error) {
      console.error('Error creating act:', error);
      setActs(acts.filter(a => a.id !== tempId));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      toast.error('Fehler beim Erstellen des Acts');
    } finally {
      setCreating(null);
    }
  };

  const handleAddSequence = async (actId: string) => {
    if (creating === `sequence-${actId}`) return;

    // 🔥 FIX: Filter out temp sequences and calculate correct sequence number
    const actSequences = sequences.filter(s => 
      s && 
      s.actId === actId && 
      !s.id.startsWith('temp-')
    );
    
    // Find max sequence number to avoid duplicates
    const maxSeqNumber = actSequences.reduce((max, s) => Math.max(max, s.sequenceNumber), 0);
    const newSeqNumber = maxSeqNumber + 1;
    
    const tempId = `temp-seq-${Date.now()}`;
    const optimisticSequence: Sequence = {
      id: tempId,
      projectId,
      actId,
      sequenceNumber: newSeqNumber,
      title: `Sequence ${newSeqNumber}`,
      description: '',
      color: '#ECFDF5',
      orderIndex: actSequences.length,
    };

    setSequences([...sequences, optimisticSequence]);
    setExpandedActs(new Set([...expandedActs, actId]));
    setPendingIds(prev => new Set([...prev, tempId]));
    setCreating(`sequence-${actId}`);

    try {
      const token = await getAccessToken();
      if (!token) {
        setSequences(sequences.filter(s => s.id !== tempId));
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        toast.error('Nicht angemeldet');
        setCreating(null);
        return;
      }

      const newSequence = await TimelineAPI.createSequence(actId, {
        sequenceNumber: newSeqNumber,
        title: `Sequence ${newSeqNumber}`,
        color: '#ECFDF5',
      }, token);

      // 🚀 PERFORMANCE: Batch state updates
      setSequences(seqs => seqs.map(s => s.id === tempId ? newSequence : s));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      // Success toast removed for instant feel - user sees the node appear!
    } catch (error) {
      console.error('Error creating sequence:', error);
      setSequences(seqs => seqs.filter(s => s.id !== tempId));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      toast.error('Fehler beim Erstellen der Sequenz');
    } finally {
      setCreating(null);
    }
  };

  const handleAddScene = async (sequenceId: string) => {
    if (creating === `scene-${sequenceId}`) return;

    // 🚨 CRITICAL FIX: Don't allow scene creation under temp sequences
    if (sequenceId.startsWith('temp-')) {
      toast.error('Bitte warte, bis die Sequence gespeichert wurde');
      return;
    }

    // 🔥 FIX: Filter out temp scenes and calculate correct scene number
    const seqScenes = scenes.filter(s => 
      s && 
      s.sequenceId === sequenceId && 
      !s.id.startsWith('temp-')
    );
    
    // Find max scene number to avoid duplicates
    const maxSceneNumber = seqScenes.reduce((max, s) => Math.max(max, s.sceneNumber), 0);
    const newSceneNumber = maxSceneNumber + 1;
    
    const tempId = `temp-scene-${Date.now()}`;
    const optimisticScene: Scene = {
      id: tempId,
      projectId,
      sequenceId,
      sceneNumber: newSceneNumber,
      title: `Scene ${newSceneNumber}`,
      description: '',
      location: '',
      timeOfDay: 'day',
      characters: [],
      orderIndex: seqScenes.length,
    };

    setScenes([...scenes, optimisticScene]);
    setExpandedSequences(new Set([...expandedSequences, sequenceId]));
    setPendingIds(prev => new Set([...prev, tempId]));
    setCreating(`scene-${sequenceId}`);

    try {
      const token = await getAccessToken();
      if (!token) {
        setScenes(scenes.filter(s => s.id !== tempId));
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        toast.error('Nicht angemeldet');
        setCreating(null);
        return;
      }

      const newScene = await TimelineAPI.createScene(sequenceId, {
        sceneNumber: newSceneNumber,
        title: `Scene ${newSceneNumber}`,
      }, token);

      // 🚀 PERFORMANCE: Batch state updates
      setScenes(scenes => scenes.map(s => s.id === tempId ? newScene : s));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      // Success toast removed for instant feel - user sees the node appear!
    } catch (error) {
      console.error('Error creating scene:', error);
      setScenes(scenes => scenes.filter(s => s.id !== tempId));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      toast.error('Fehler beim Erstellen der Scene');
    } finally {
      setCreating(null);
    }
  };

  const handleAddShot = async (sceneId: string) => {
    // 🚫 Block if scene is still pending (temp-ID)
    if (sceneId.startsWith('temp-')) {
      toast.error('Warte bis die Scene erstellt ist');
      return;
    }
    
    if (creating === `shot-${sceneId}`) return;

    // 🔥 FIX: Filter out temp shots and calculate correct shot number
    const sceneShots = shots.filter(s => 
      s && 
      s.sceneId === sceneId && 
      !s.id.startsWith('temp-')
    );
    
    // Find max shot number to avoid duplicates
    // shotNumber is stored as string like "Shot 1", so we need to extract the number
    const maxShotNumber = sceneShots.reduce((max, s) => {
      const match = s.shotNumber?.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, num);
    }, 0);
    const newShotNumber = maxShotNumber + 1;
    
    const tempId = `temp-shot-${Date.now()}`;
    const optimisticShot: Shot = {
      id: tempId,
      projectId,
      sceneId,
      shotNumber: `Shot ${newShotNumber}`,
      description: '',
      orderIndex: sceneShots.length,
    };

    setShots([...shots, optimisticShot]);
    setExpandedScenes(new Set([...expandedScenes, sceneId]));
    setPendingIds(prev => new Set([...prev, tempId]));
    setCreating(`shot-${sceneId}`);

    try {
      const token = await getAccessToken();
      if (!token) {
        setShots(shots.filter(s => s.id !== tempId));
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        toast.error('Nicht angemeldet');
        setCreating(null);
        return;
      }

      const newShot = await ShotsAPI.createShot(sceneId, {
        shotNumber: `Shot ${newShotNumber}`,
        description: '',
        projectId, // ✅ Add projectId
      }, token);

      // 🚀 PERFORMANCE: Batch state updates
      setShots(shots => shots.map(s => s.id === tempId ? newShot : s));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      // Success toast removed for instant feel - user sees the node appear!
    } catch (error) {
      console.error('Error creating shot:', error);
      setShots(shots.filter(s => s.id !== tempId));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      toast.error('Fehler beim Erstellen des Shots');
    } finally {
      setCreating(null);
    }
  };

  // =====================================================
  // UPDATE HANDLERS (Inline Editing)
  // =====================================================

  const handleUpdateAct = async (actId: string) => {
    const updates = editValues[actId];
    if (!updates) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      await TimelineAPI.updateAct(actId, updates, token);
      
      setActs(acts => acts.map(a => 
        a.id === actId ? { ...a, ...updates } : a
      ));
      
      setEditingAct(null);
      setEditValues(prev => {
        const next = { ...prev };
        delete next[actId];
        return next;
      });
      
      toast.success('Act aktualisiert');
    } catch (error) {
      console.error('Error updating act:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateSequence = async (sequenceId: string) => {
    const updates = editValues[sequenceId];
    if (!updates) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      await TimelineAPI.updateSequence(sequenceId, updates, token);
      
      setSequences(seqs => seqs.map(s => 
        s.id === sequenceId ? { ...s, ...updates } : s
      ));
      
      setEditingSequence(null);
      setEditValues(prev => {
        const next = { ...prev };
        delete next[sequenceId];
        return next;
      });
      
      toast.success('Sequenz aktualisiert');
    } catch (error) {
      console.error('Error updating sequence:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateScene = async (sceneId: string) => {
    const updates = editValues[sceneId];
    if (!updates) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      await TimelineAPI.updateScene(sceneId, updates, token);
      
      setScenes(scenes => scenes.map(s => 
        s.id === sceneId ? { ...s, ...updates } : s
      ));
      
      setEditingScene(null);
      setEditValues(prev => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
      
      toast.success('Szene aktualisiert');
    } catch (error) {
      console.error('Error updating scene:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // =====================================================
  // DELETE HANDLERS
  // =====================================================

  const handleDeleteAct = async (actId: string) => {
    // Find the act to get its title for confirmation
    const actToDelete = acts.find(a => a.id === actId);
    if (!actToDelete) {
      console.error('[FilmDropdown] Act not found for deletion:', actId);
      toast.error('Act nicht gefunden');
      return;
    }

    console.log('[FilmDropdown] 🗑️ Deleting act:', {
      id: actId,
      title: actToDelete.title,
      number: actToDelete.actNumber
    });

    if (!confirm(`Act "${actToDelete.title}" und alle untergeordneten Elemente löschen?`)) {
      console.log('[FilmDropdown] Deletion cancelled by user');
      return;
    }

    const actSequences = sequences.filter(s => s.actId === actId);
    const sequenceIds = actSequences.map(s => s.id);
    const actScenes = scenes.filter(s => sequenceIds.includes(s.sequenceId));
    const sceneIds = actScenes.map(s => s.id);

    console.log('[FilmDropdown] Deleting act with:', {
      sequences: actSequences.length,
      scenes: actScenes.length,
      sequenceIds,
      sceneIds
    });

    // Optimistic delete
    setActs(prevActs => prevActs.filter(a => a.id !== actId));
    setSequences(seqs => seqs.filter(s => s.actId !== actId));
    setScenes(sc => sc.filter(s => !sequenceIds.includes(s.sequenceId)));
    setShots(sh => sh.filter(s => !sceneIds.includes(s.sceneId)));

    try {
      const token = await getAccessToken();
      if (!token) return;

      console.log('[FilmDropdown] Calling API to delete act:', actId);
      await TimelineAPI.deleteAct(actId, token);
      console.log('[FilmDropdown] ✅ Act deleted successfully');
      
      // Register undo action
      undoManager.push({
        type: 'delete',
        entity: 'act',
        id: actId,
        previousData: {
          act: actToDelete,
          sequences: actSequences,
          scenes: actScenes,
        },
        timestamp: new Date(),
        description: `Act "${actToDelete.title}" gelöscht`,
      });

      // Register undo callback
      undoManager.registerCallback(`undo:delete:act:${actId}`, {
        execute: async () => {
          // Restore act
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');
          
          // Recreate act
          const newAct = await TimelineAPI.createAct(projectId, {
            actNumber: actToDelete.actNumber,
            title: actToDelete.title,
            description: actToDelete.description,
          }, token);
          
          // Restore to state
          setActs(prevActs => [...prevActs, newAct].sort((a, b) => a.actNumber - b.actNumber));
          
          toast.success(`Act "${actToDelete.title}" wiederhergestellt`);
        },
        description: `Act "${actToDelete.title}" wiederherstellen`,
      });
      
      toast.success('Act gelöscht (CMD+Z zum Rückgängigmachen)');
    } catch (error) {
      console.error('Error deleting act:', error);
      toast.error('Fehler beim Löschen');
      loadTimelineData(); // Reload on error
    }
  };

  const handleDuplicateAct = async (actId: string) => {
    const actToDuplicate = acts.find(a => a.id === actId);
    if (!actToDuplicate) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      // Show loading toast
      toast.loading('Act wird dupliziert...');

      // Create new act with duplicated data
      const maxActNumber = acts.reduce((max, a) => Math.max(max, a.actNumber), 0);
      const newAct = await TimelineAPI.createAct(projectId, {
        actNumber: maxActNumber + 1,
        title: `${actToDuplicate.title} (Kopie)`,
        description: actToDuplicate.description,
        color: actToDuplicate.color,
      }, token);

      // Get all sequences in this act
      const actSequences = sequences.filter(s => s.actId === actId);
      
      // 🚀 OPTIMISTIC UI: Create ALL temp data INSTANTLY
      const tempSequences = actSequences.map((seq, seqIdx) => ({
        ...seq,
        id: `temp-seq-${Date.now()}-${seqIdx}`,
        actId: newAct.id,
      }));
      
      const tempScenesMap: Record<string, typeof scenes> = {};
      const tempShotsMap: Record<string, typeof shots> = {};
      
      actSequences.forEach((seq, seqIdx) => {
        const seqScenes = scenes.filter(sc => sc.sequenceId === seq.id);
        tempScenesMap[seq.id] = seqScenes.map((sc, scIdx) => ({
          ...sc,
          id: `temp-scene-${Date.now()}-${seqIdx}-${scIdx}`,
          sequenceId: tempSequences[seqIdx].id,
        }));
        
        seqScenes.forEach((sc, scIdx) => {
          const sceneShots = shots.filter(sh => sh.sceneId === sc.id);
          const tempSceneId = tempScenesMap[seq.id][scIdx].id;
          tempShotsMap[sc.id] = sceneShots.map((shot, shotIdx) => ({
            ...shot,
            id: `temp-shot-${Date.now()}-${seqIdx}-${scIdx}-${shotIdx}`,
            sceneId: tempSceneId,
          }));
        });
      });
      
      const allTempScenes = Object.values(tempScenesMap).flat();
      const allTempShots = Object.values(tempShotsMap).flat();
      
      // Show EVERYTHING immediately! User sees instant result 🚀
      setActs(prevActs => [...prevActs, newAct]);
      setSequences(prevSequences => [...prevSequences, ...tempSequences]);
      setScenes(prevScenes => [...prevScenes, ...allTempScenes]);
      setShots(prevShots => [...prevShots, ...allTempShots]);
      toast.dismiss();
      toast.success(`Act mit ${tempSequences.length} Sequenzen, ${allTempScenes.length} Szenen und ${allTempShots.length} Shots dupliziert`);
      
      // 🚀 PARALLEL: Create everything in background with maximum parallelization
      const sequencePromises = actSequences.map(async (seq, seqIdx) => {
        const newSeq = await TimelineAPI.createSequence(newAct.id, {
          sequenceNumber: seq.sequenceNumber,
          title: seq.title,
          description: seq.description,
          color: seq.color,
        }, token);
        
        const seqScenes = tempScenesMap[seq.id];
        const originalScenes = scenes.filter(sc => sc.sequenceId === seq.id);
        
        // Create ALL scenes in this sequence in PARALLEL
        const scenePromises = originalScenes.map(async (scene, scIdx) => {
          const newScene = await TimelineAPI.createScene(newSeq.id, {
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            description: scene.description,
            location: scene.location,
            timeOfDay: scene.timeOfDay,
            characters: scene.characters,
          }, token);
          
          const originalShots = shots.filter(sh => sh.sceneId === scene.id);
          const tempSceneShots = tempShotsMap[scene.id];
          
          // Create ALL shots for this scene in PARALLEL
          const shotPromises = originalShots.map((shot, shotIdx) =>
            ShotsAPI.createShot(newScene.id, {
              shotNumber: shot.shotNumber,
              description: shot.description,
              cameraAngle: shot.cameraAngle,
              cameraMovement: shot.cameraMovement,
              framing: shot.framing,
              lens: shot.lens,
              duration: shot.duration,
              shotlengthMinutes: shot.shotlengthMinutes,
              shotlengthSeconds: shot.shotlengthSeconds,
              notes: shot.notes,
              dialog: shot.dialog,
              projectId, // ✅ Add projectId
            }, token).then(realShot => ({
              tempId: tempSceneShots[shotIdx].id,
              realShot
            }))
          );
          
          const shotResults = await Promise.all(shotPromises);
          
          return {
            tempSceneId: seqScenes[scIdx].id,
            realScene: newScene,
            shotResults
          };
        });
        
        const sceneResults = await Promise.all(scenePromises);
        
        return {
          tempSeqId: tempSequences[seqIdx].id,
          realSeq: newSeq,
          sceneResults
        };
      });
      
      const sequenceResults = await Promise.all(sequencePromises);
      
      // Replace ALL temp data with real data
      setSequences(prevSequences => {
        const updated = [...prevSequences];
        sequenceResults.forEach(({ tempSeqId, realSeq }) => {
          const idx = updated.findIndex(s => s.id === tempSeqId);
          if (idx >= 0) updated[idx] = realSeq;
        });
        return updated;
      });
      
      setScenes(prevScenes => {
        const updated = [...prevScenes];
        sequenceResults.forEach(({ sceneResults }) => {
          sceneResults.forEach(({ tempSceneId, realScene }) => {
            const idx = updated.findIndex(s => s.id === tempSceneId);
            if (idx >= 0) updated[idx] = realScene;
          });
        });
        return updated;
      });
      
      setShots(prevShots => {
        const updated = [...prevShots];
        sequenceResults.forEach(({ sceneResults }) => {
          sceneResults.forEach(({ shotResults }) => {
            shotResults.forEach(({ tempId, realShot }) => {
              const idx = updated.findIndex(s => s.id === tempId);
              if (idx >= 0) updated[idx] = realShot;
            });
          });
        });
        return updated;
      });
    } catch (error) {
      console.error('Error duplicating act:', error);
      toast.dismiss();
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleDuplicateSequence = async (sequenceId: string) => {
    const sequenceToDuplicate = sequences.find(s => s.id === sequenceId);
    if (!sequenceToDuplicate) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      // Show loading toast
      toast.loading('Sequenz wird dupliziert...');

      // Create new sequence with duplicated data
      const actSequences = sequences.filter(s => s.actId === sequenceToDuplicate.actId);
      const maxSeqNumber = actSequences.reduce((max, s) => Math.max(max, s.sequenceNumber), 0);
      const newSequence = await TimelineAPI.createSequence(sequenceToDuplicate.actId, {
        sequenceNumber: maxSeqNumber + 1,
        title: `${sequenceToDuplicate.title} (Kopie)`,
        description: sequenceToDuplicate.description,
        color: sequenceToDuplicate.color,
      }, token);

      // Get all scenes in this sequence
      const seqScenes = scenes.filter(sc => sc.sequenceId === sequenceId);
      
      // 🚀 OPTIMISTIC UI: Create temp data instantly
      const tempScenes = seqScenes.map((sc, idx) => ({
        ...sc,
        id: `temp-scene-${Date.now()}-${idx}`,
        sequenceId: newSequence.id,
      }));
      
      const tempShotsMap: Record<string, typeof shots> = {};
      seqScenes.forEach((sc, idx) => {
        const sceneShots = shots.filter(sh => sh.sceneId === sc.id);
        tempShotsMap[sc.id] = sceneShots.map((shot, shotIdx) => ({
          ...shot,
          id: `temp-shot-${Date.now()}-${idx}-${shotIdx}`,
          sceneId: tempScenes[idx].id,
        }));
      });
      
      const allTempShots = Object.values(tempShotsMap).flat();
      
      // Show everything immediately!
      setSequences(prevSequences => [...prevSequences, newSequence]);
      setScenes(prevScenes => [...prevScenes, ...tempScenes]);
      setShots(prevShots => [...prevShots, ...allTempShots]);
      toast.dismiss();
      toast.success(`Sequenz mit ${tempScenes.length} Szenen und ${allTempShots.length} Shots dupliziert`);
      
      // 🚀 PARALLEL: Create scenes and shots in background
      const scenePromises = seqScenes.map(async (scene, sceneIdx) => {
        const newScene = await TimelineAPI.createScene(newSequence.id, {
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          description: scene.description,
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          characters: scene.characters,
        }, token);
        
        const sceneShots = tempShotsMap[scene.id];
        const originalShots = shots.filter(sh => sh.sceneId === scene.id);
        
        // Create ALL shots for this scene in PARALLEL
        const shotPromises = originalShots.map((shot, shotIdx) => 
          ShotsAPI.createShot(newScene.id, {
            shotNumber: shot.shotNumber,
            description: shot.description,
            cameraAngle: shot.cameraAngle,
            cameraMovement: shot.cameraMovement,
            framing: shot.framing,
            lens: shot.lens,
            duration: shot.duration,
            shotlengthMinutes: shot.shotlengthMinutes,
            shotlengthSeconds: shot.shotlengthSeconds,
            notes: shot.notes,
            dialog: shot.dialog,
            projectId, // ✅ Add projectId
          }, token).then(realShot => ({
            tempId: sceneShots[shotIdx].id,
            realShot
          }))
        );
        
        const shotResults = await Promise.all(shotPromises);
        
        return {
          tempSceneId: tempScenes[sceneIdx].id,
          realScene: newScene,
          shotResults
        };
      });
      
      const sceneResults = await Promise.all(scenePromises);
      
      // Replace temp data with real data
      setScenes(prevScenes => {
        const updated = [...prevScenes];
        sceneResults.forEach(({ tempSceneId, realScene }) => {
          const idx = updated.findIndex(s => s.id === tempSceneId);
          if (idx >= 0) updated[idx] = realScene;
        });
        return updated;
      });
      
      setShots(prevShots => {
        const updated = [...prevShots];
        sceneResults.forEach(({ shotResults }) => {
          shotResults.forEach(({ tempId, realShot }) => {
            const idx = updated.findIndex(s => s.id === tempId);
            if (idx >= 0) updated[idx] = realShot;
          });
        });
        return updated;
      });
    } catch (error) {
      console.error('Error duplicating sequence:', error);
      toast.dismiss();
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleDuplicateScene = async (sceneId: string) => {
    const sceneToDuplicate = scenes.find(s => s.id === sceneId);
    if (!sceneToDuplicate) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      // Show loading toast
      toast.loading('Scene wird dupliziert...');

      // Create new scene with duplicated data
      const seqScenes = scenes.filter(s => s.sequenceId === sceneToDuplicate.sequenceId);
      const maxSceneNumber = seqScenes.reduce((max, s) => Math.max(max, s.sceneNumber), 0);
      const newScene = await TimelineAPI.createScene(sceneToDuplicate.sequenceId, {
        sceneNumber: maxSceneNumber + 1,
        title: `${sceneToDuplicate.title} (Kopie)`,
        description: sceneToDuplicate.description,
        location: sceneToDuplicate.location,
        timeOfDay: sceneToDuplicate.timeOfDay,
        characters: sceneToDuplicate.characters,
      }, token);

      // Get all shots in this scene
      const sceneShots = shots.filter(sh => sh.sceneId === sceneId);
      
      // 🚀 PERFORMANCE: Create temp shots for instant UI update
      const tempShots = sceneShots.map((shot, idx) => ({
        ...shot,
        id: `temp-shot-${Date.now()}-${idx}`,
        sceneId: newScene.id,
      }));
      
      // Show shots immediately (optimistic UI)
      setScenes(prevScenes => [...prevScenes, newScene]);
      setShots(prevShots => [...prevShots, ...tempShots]);
      toast.dismiss();
      toast.success(`Scene mit ${tempShots.length} Shots dupliziert`);
      
      // 🚀 PERFORMANCE: Create ALL shots in PARALLEL (not serial!)
      const shotPromises = sceneShots.map((shot, idx) => 
        ShotsAPI.createShot(newScene.id, {
          shotNumber: shot.shotNumber,
          description: shot.description,
          cameraAngle: shot.cameraAngle,
          cameraMovement: shot.cameraMovement,
          framing: shot.framing,
          lens: shot.lens,
          duration: shot.duration,
          shotlengthMinutes: shot.shotlengthMinutes,
          shotlengthSeconds: shot.shotlengthSeconds,
          notes: shot.notes,
          dialog: shot.dialog,
          projectId, // ✅ Add projectId
        }, token).then(realShot => ({ tempId: tempShots[idx].id, realShot }))
      );
      
      // Wait for all shots to be created
      const shotResults = await Promise.all(shotPromises);
      
      // Replace temp shots with real shots
      setShots(prevShots => {
        const updated = [...prevShots];
        shotResults.forEach(({ tempId, realShot }) => {
          const tempIdx = updated.findIndex(s => s.id === tempId);
          if (tempIdx >= 0) {
            updated[tempIdx] = realShot;
          }
        });
        return updated;
      });


    } catch (error) {
      console.error('Error duplicating scene:', error);
      toast.dismiss();
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!confirm('Sequenz und alle Szenen löschen?')) return;

    const seqScenes = scenes.filter(s => s.sequenceId === sequenceId);
    const sceneIds = seqScenes.map(s => s.id);

    // Optimistic delete
    setSequences(seqs => seqs.filter(s => s.id !== sequenceId));
    setScenes(sc => sc.filter(s => s.sequenceId !== sequenceId));
    setShots(sh => sh.filter(s => !sceneIds.includes(s.sceneId)));

    try {
      const token = await getAccessToken();
      if (!token) return;

      await TimelineAPI.deleteSequence(sequenceId, token);
      
      // 🚀 CACHE: Invalidate timeline cache
      cacheManager.invalidate(`timeline:${projectId}`);
      
      toast.success('Sequenz gelöscht');
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast.error('Fehler beim Löschen');
      loadTimelineData();
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('Scene und alle Shots löschen?')) return;

    // Optimistic delete - 🔥 FIX: Use functional updates to prevent stale state
    setScenes(prevScenes => prevScenes.filter(s => s.id !== sceneId));
    setShots(prevShots => prevShots.filter(s => s.sceneId !== sceneId));

    try {
      const token = await getAccessToken();
      if (!token) return;

      await TimelineAPI.deleteScene(sceneId, token);
      
      // 🚀 CACHE: Invalidate timeline cache
      cacheManager.invalidate(`timeline:${projectId}`);
      
      toast.success('Scene gelöscht');
    } catch (error) {
      console.error('Error deleting scene:', error);
      toast.error('Fehler beim Löschen');
      loadTimelineData();
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    // Optimistic delete - 🔥 FIX: Use functional updates to prevent stale state
    setShots(prevShots => prevShots.filter(s => s.id !== shotId));

    try {
      const token = await getAccessToken();
      if (!token) return;

      await ShotsAPI.deleteShot(shotId, token);
      toast.success('Shot gelöscht');
    } catch (error) {
      console.error('Error deleting shot:', error);
      toast.error('Fehler beim Löschen');
      loadTimelineData();
    }
  };

  // =====================================================
  // DRAG & DROP HANDLERS
  // =====================================================

  // ACTS - Einfügen an Index (Drop Zone)
  const handleActDropAtIndex = (draggedId: string, targetIndex: number) => {
    const draggedIndex = acts.findIndex(a => a.id === draggedId);
    if (draggedIndex === -1) return;

    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    const reordered = [...acts];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(adjustedTargetIndex, 0, removed);

    // Optimistic Update - SOFORT!
    setActs(reordered);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const actIds = reordered.map(a => a.id);
          await TimelineAPI.reorderNodes(actIds, token);
        }
      } catch (error) {
        console.error('Error reordering acts:', error);
        toast.error('Fehler beim Sortieren');
        loadTimelineData();
      }
    })();
  };

  // ACTS - Platz tauschen (Drop auf Item)
  const handleActSwap = (draggedId: string, targetId: string) => {
    const draggedIndex = acts.findIndex(a => a.id === draggedId);
    const targetIndex = acts.findIndex(a => a.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...acts];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Optimistic Update - SOFORT!
    setActs(reordered);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const actIds = reordered.map(a => a.id);
          await TimelineAPI.reorderNodes(actIds, token);
        }
      } catch (error) {
        console.error('Error swapping acts:', error);
        toast.error('Fehler beim Tauschen');
        loadTimelineData();
      }
    })();
  };

  // SEQUENCES - Einfügen an Index
  const handleSequenceDropAtIndex = (draggedId: string, targetIndex: number, actId: string) => {
    const draggedSeq = sequences.find(s => s.id === draggedId);
    if (!draggedSeq || draggedSeq.actId !== actId) return;

    const actSequences = sequences.filter(s => s.actId === actId);
    const draggedIndex = actSequences.findIndex(s => s.id === draggedId);
    if (draggedIndex === -1) return;

    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    const reordered = [...actSequences];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(adjustedTargetIndex, 0, removed);

    const otherSequences = sequences.filter(s => s.actId !== actId);
    
    // Optimistic Update - SOFORT!
    setSequences([...otherSequences, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const seqIds = reordered.map(s => s.id);
          await TimelineAPI.reorderNodes(seqIds, token);
        }
      } catch (error) {
        console.error('Error reordering sequences:', error);
        toast.error('Fehler beim Sortieren');
        loadTimelineData();
      }
    })();
  };

  // SEQUENCES - Platz tauschen
  const handleSequenceSwap = (draggedId: string, targetId: string) => {
    const draggedSeq = sequences.find(s => s.id === draggedId);
    const targetSeq = sequences.find(s => s.id === targetId);
    
    if (!draggedSeq || !targetSeq || draggedSeq.actId !== targetSeq.actId) return;

    const actSequences = sequences.filter(s => s.actId === draggedSeq.actId);
    const draggedIndex = actSequences.findIndex(s => s.id === draggedId);
    const targetIndex = actSequences.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...actSequences];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const otherSequences = sequences.filter(s => s.actId !== draggedSeq.actId);
    
    // Optimistic Update - SOFORT!
    setSequences([...otherSequences, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const seqIds = reordered.map(s => s.id);
          await TimelineAPI.reorderNodes(seqIds, token);
        }
      } catch (error) {
        console.error('Error swapping sequences:', error);
        toast.error('Fehler beim Tauschen');
        loadTimelineData();
      }
    })();
  };

  // SCENES - Einfügen an Index
  const handleSceneDropAtIndex = (draggedId: string, targetIndex: number, sequenceId: string) => {
    const draggedScene = scenes.find(s => s.id === draggedId);
    if (!draggedScene || draggedScene.sequenceId !== sequenceId) return;

    const seqScenes = scenes.filter(s => s.sequenceId === sequenceId);
    const draggedIndex = seqScenes.findIndex(s => s.id === draggedId);
    if (draggedIndex === -1) return;

    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    const reordered = [...seqScenes];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(adjustedTargetIndex, 0, removed);

    const otherScenes = scenes.filter(s => s.sequenceId !== sequenceId);
    
    // Optimistic Update - SOFORT!
    setScenes([...otherScenes, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const sceneIds = reordered.map(s => s.id);
          await TimelineAPI.reorderNodes(sceneIds, token);
        }
      } catch (error) {
        console.error('Error reordering scenes:', error);
        toast.error('Fehler beim Sortieren');
        loadTimelineData();
      }
    })();
  };

  // SCENES - Platz tauschen
  const handleSceneSwap = (draggedId: string, targetId: string) => {
    const draggedScene = scenes.find(s => s.id === draggedId);
    const targetScene = scenes.find(s => s.id === targetId);
    
    if (!draggedScene || !targetScene || draggedScene.sequenceId !== targetScene.sequenceId) return;

    const seqScenes = scenes.filter(s => s.sequenceId === draggedScene.sequenceId);
    const draggedIndex = seqScenes.findIndex(s => s.id === draggedId);
    const targetIndex = seqScenes.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...seqScenes];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const otherScenes = scenes.filter(s => s.sequenceId !== draggedScene.sequenceId);
    
    // Optimistic Update - SOFORT!
    setScenes([...otherScenes, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const sceneIds = reordered.map(s => s.id);
          await TimelineAPI.reorderNodes(sceneIds, token);
        }
      } catch (error) {
        console.error('Error swapping scenes:', error);
        toast.error('Fehler beim Tauschen');
        loadTimelineData();
      }
    })();
  };

  // =====================================================
  // CROSS-CONTAINER DRAG & DROP
  // =====================================================

  const handleSceneMoveToSequence = async (sceneId: string, targetSequenceId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || scene.sequenceId === targetSequenceId) return;

    console.log('🔄 Moving scene to new sequence:', { sceneId, targetSequenceId });

    // Optimistic update
    setScenes(scenes => scenes.map(s => 
      s.id === sceneId ? { ...s, sequenceId: targetSequenceId } : s
    ));

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht angemeldet');
        loadTimelineData();
        return;
      }

      await TimelineAPI.updateScene(sceneId, { 
        sequenceId: targetSequenceId 
      }, token);
      
      toast.success('Szene verschoben');
    } catch (error) {
      console.error('Error moving scene:', error);
      toast.error('Fehler beim Verschieben');
      loadTimelineData();
    }
  };

  const handleShotMoveToScene = async (shotId: string, targetSceneId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot || shot.sceneId === targetSceneId) return;

    console.log('🔄 Moving shot to new scene:', { shotId, targetSceneId });

    // Optimistic update
    setShots(shots => shots.map(s => 
      s.id === shotId ? { ...s, sceneId: targetSceneId } : s
    ));

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht angemeldet');
        loadTimelineData();
        return;
      }

      await ShotsAPI.updateShot(shotId, { 
        sceneId: targetSceneId 
      }, token);
      
      toast.success('Shot verschoben');
    } catch (error) {
      console.error('Error moving shot:', error);
      toast.error('Fehler beim Verschieben');
      loadTimelineData();
    }
  };

  // =====================================================
  // SHOT HANDLERS
  // =====================================================

  const handleUpdateShot = async (shotId: string, updates: Partial<Shot>) => {
    // Optimistic update
    setShots(shots => shots.map(s => 
      s.id === shotId ? { ...s, ...updates } : s
    ));

    try {
      const token = await getAccessToken();
      if (!token) return;

      const saved = await ShotsAPI.updateShot(shotId, updates, token);
      if (saved !== undefined) {
        toast.success('Shot aktualisiert');
      }
    } catch (error) {
      console.error('Error updating shot:', error);
      toast.error('Fehler beim Aktualisieren');
      loadTimelineData();
    }
  };

  const handleDuplicateShot = async (shotId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      const sceneShots = shots.filter(s => s.sceneId === shot.sceneId && !s.id.startsWith('temp-'));
      
      // Extract numeric part from shotNumber strings like "Shot 1", "Shot 2"
      const shotNumbers = sceneShots.map(s => {
        const match = String(s.shotNumber).match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      });
      const maxShotNumber = Math.max(0, ...shotNumbers);
      
      const newShot = await ShotsAPI.createShot(shot.sceneId, {
        shotNumber: `${shot.shotNumber} (Kopie)`,
        description: shot.description,
        cameraAngle: shot.cameraAngle,
        cameraMovement: shot.cameraMovement,
        framing: shot.framing,
        lens: shot.lens,
        duration: shot.duration,
        shotlengthMinutes: shot.shotlengthMinutes,
        shotlengthSeconds: shot.shotlengthSeconds,
        notes: shot.notes,
        dialog: shot.dialog,
        projectId, // ✅ Add projectId
      }, token);

      setShots([...shots, newShot]);
      toast.success('Shot dupliziert');
    } catch (error) {
      console.error('Error duplicating shot:', error);
      toast.error('Fehler beim Duplizieren');
    }
  };

  // SHOTS - Einfügen an Index
  const handleShotDropAtIndex = (draggedId: string, targetIndex: number, sceneId: string) => {
    const draggedShot = shots.find(s => s.id === draggedId);
    if (!draggedShot || draggedShot.sceneId !== sceneId) return;

    const sceneShots = shots.filter(s => s.sceneId === sceneId);
    const draggedIndex = sceneShots.findIndex(s => s.id === draggedId);
    if (draggedIndex === -1) return;

    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

    const reordered = [...sceneShots];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(adjustedTargetIndex, 0, removed);

    const otherShots = shots.filter(s => s.sceneId !== sceneId);
    
    // Optimistic Update - SOFORT!
    setShots([...otherShots, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const shotIds = reordered.map(s => s.id);
          await ShotsAPI.reorderShots(sceneId, shotIds, token);
        }
      } catch (error) {
        console.error('Error reordering shots:', error);
        toast.error('Fehler beim Sortieren');
        loadTimelineData();
      }
    })();
  };

  // SHOTS - Platz tauschen
  const handleShotSwap = (draggedId: string, targetId: string) => {
    const draggedShot = shots.find(s => s.id === draggedId);
    const targetShot = shots.find(s => s.id === targetId);
    
    if (!draggedShot || !targetShot || draggedShot.sceneId !== targetShot.sceneId) return;

    const sceneShots = shots.filter(s => s.sceneId === draggedShot.sceneId);
    const draggedIndex = sceneShots.findIndex(s => s.id === draggedId);
    const targetIndex = sceneShots.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...sceneShots];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const otherShots = shots.filter(s => s.sceneId !== draggedShot.sceneId);
    
    // Optimistic Update - SOFORT!
    setShots([...otherShots, ...reordered]);

    // Backend async
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const shotIds = reordered.map(s => s.id);
          await ShotsAPI.reorderShots(draggedShot.sceneId, shotIds, token);
        }
      } catch (error) {
        console.error('Error swapping shots:', error);
        toast.error('Fehler beim Tauschen');
        loadTimelineData();
      }
    })();
  };

  const runShotImageUpload = async (
    shotId: string,
    file: File,
    gifMode?: ImageUploadGifMode
  ) => {
    shotImageUploadInFlightRef.current = true;
    setShotImageUploadingId(shotId);
    const previewUrl = URL.createObjectURL(file);
    setShots((shots) =>
      shots.map((s) => (s.id === shotId ? { ...s, imageUrl: previewUrl } : s))
    );

    toast.loading('Bild wird hochgeladen...');

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.dismiss();
        toast.error('Nicht authentifiziert');
        URL.revokeObjectURL(previewUrl);
        setShots((shots) =>
          shots.map((s) => (s.id === shotId ? { ...s, imageUrl: undefined } : s))
        );
        return;
      }

      const imageUrl = await ShotsAPI.uploadShotImage(shotId, file, token, { gifMode });

      URL.revokeObjectURL(previewUrl);

      setShots((shots) =>
        shots.map((s) => (s.id === shotId ? { ...s, imageUrl } : s))
      );

      toast.dismiss();
      toast.success('Bild hochgeladen! ✅');
    } catch (error) {
      console.error('❌ Error uploading shot image:', error);

      URL.revokeObjectURL(previewUrl);
      setShots((shots) =>
        shots.map((s) => (s.id === shotId ? { ...s, imageUrl: undefined } : s))
      );

      toast.dismiss();
      toast.error(
        `Fehler beim Hochladen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
      throw error;
    } finally {
      setShotImageUploadingId(null);
      shotImageUploadInFlightRef.current = false;
    }
  };

  const handleShotImageUpload = async (shotId: string, file: File) => {
    try {
      validateImageFile(file, 5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ungültiges Bild');
      return;
    }

    if (needsGifUserConfirmation(file)) {
      setShotImageUploadingId(shotId);
      setGifShotPending({ shotId, file });
      return;
    }

    await runShotImageUpload(shotId, file, undefined);
  };

  const handleShotAudioUpload = async (
    shotId: string, 
    file: File, 
    type: 'music' | 'sfx', 
    label?: string,
    startTime?: number,
    endTime?: number,
    fadeIn?: number,
    fadeOut?: number
  ) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await ShotsAPI.uploadShotAudio(shotId, file, type, token, label, startTime, endTime, fadeIn, fadeOut);
      
      // Reload shot data to get new audio
      const updatedShot = await ShotsAPI.getShot(shotId, token);
      setShots(shots => shots.map(s => s.id === shotId ? updatedShot : s));
      
      toast.success('Audio hochgeladen');
    } catch (error) {
      console.error('Error uploading shot audio:', error);
      toast.error('Fehler beim Hochladen');
    }
  };

  const handleShotAudioDelete = async (audioId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await ShotsAPI.deleteShotAudio(audioId, token);
      
      // Remove audio from local state
      setShots(shots => shots.map(shot => ({
        ...shot,
        audioFiles: shot.audioFiles?.filter(a => a.id !== audioId)
      })));
      
      toast.success('Audio gelöscht');
    } catch (error) {
      console.error('Error deleting shot audio:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleShotAudioUpdate = async (
    audioId: string, 
    updates: { 
      label?: string; 
      startTime?: number; 
      endTime?: number; 
      fadeIn?: number; 
      fadeOut?: number 
    }
  ) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await ShotsAPI.updateShotAudio(audioId, updates, token);
      
      // Update audio in local state
      setShots(shots => shots.map(shot => ({
        ...shot,
        audioFiles: shot.audioFiles?.map(a => 
          a.id === audioId ? { ...a, ...updates } : a
        )
      })));
      
      toast.success('Audio aktualisiert');
    } catch (error) {
      console.error('Error updating shot audio:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleShotCharacterAdd = async (shotId: string, characterId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    const currentCharacters = shot.characters || [];
    if (currentCharacters.some(c => c.id === characterId)) {
      toast.error('Character bereits hinzugefügt');
      return;
    }

    // Find character data for optimistic update
    const character = characters.find(c => c.id === characterId);
    if (!character) {
      toast.error('Character nicht gefunden');
      return;
    }

    const optimisticCharacters = [...currentCharacters, character];

    // Optimistic update
    setShots(shots => shots.map(s => 
      s.id === shotId ? { ...s, characters: optimisticCharacters } : s
    ));

    try {
      const token = await getAccessToken();
      if (!token) {
        // Rollback
        setShots(shots => shots.map(s => 
          s.id === shotId ? { ...s, characters: currentCharacters } : s
        ));
        toast.error('Nicht angemeldet');
        return;
      }

      // Use the new dedicated API endpoint
      const updatedShot = await ShotsAPI.addCharacterToShot(shotId, characterId, token);
      
      // Update with real data from server
      setShots(shots => shots.map(s => 
        s.id === shotId ? { ...s, characters: updatedShot.characters } : s
      ));
      
      toast.success('Character hinzugefügt');
    } catch (error) {
      console.error('Error adding character to shot:', error);
      toast.error('Fehler beim Hinzufügen');
      // Rollback
      setShots(shots => shots.map(s => 
        s.id === shotId ? { ...s, characters: currentCharacters } : s
      ));
    }
  };

  const handleShotCharacterRemove = async (shotId: string, characterId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    const currentCharacters = shot.characters || [];
    const updatedCharacters = currentCharacters.filter(c => c.id !== characterId);

    // Optimistic update
    setShots(shots => shots.map(s => 
      s.id === shotId ? { ...s, characters: updatedCharacters } : s
    ));

    try {
      const token = await getAccessToken();
      if (!token) {
        // Rollback
        setShots(shots => shots.map(s => 
          s.id === shotId ? { ...s, characters: currentCharacters } : s
        ));
        toast.error('Nicht angemeldet');
        return;
      }

      // Use the dedicated API endpoint
      await ShotsAPI.removeCharacterFromShot(shotId, characterId, token);
      
      toast.success('Character entfernt');
    } catch (error) {
      console.error('Error removing character from shot:', error);
      toast.error('Fehler beim Entfernen');
      // Rollback
      setShots(shots => shots.map(s => 
        s.id === shotId ? { ...s, characters: currentCharacters } : s
      ));
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  // 🚀 PERFORMANCE LOGGING (only in development, once per data load)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !loading && sequences.length > 0) {
      console.log('🚀 [FilmDropdown] Performance Stats:', {
        totalItems: {
          acts: acts.length,
          sequences: sequences.length,
          scenes: scenes.length,
          shots: shots.length,
        },
        visibleItems: {
          sequences: optimized.stats.visibleSequences,
          scenes: optimized.stats.visibleScenes,
          shots: optimized.stats.visibleShots,
        },
        renderReduction: {
          sequences: sequences.length > 0 ? `${Math.round((1 - optimized.stats.visibleSequences / sequences.length) * 100)}%` : '0%',
          scenes: scenes.length > 0 ? `${Math.round((1 - optimized.stats.visibleScenes / scenes.length) * 100)}%` : '0%',
          shots: shots.length > 0 ? `${Math.round((1 - optimized.stats.visibleShots / shots.length) * 100)}%` : '0%',
        },
      });
    }
  }, [loading, sequences.length, scenes.length, shots.length, optimized.stats]);

  const gifUploadDialog = (
    <GifAnimationUploadDialog
      open={gifShotPending !== null}
      onOpenChange={(open) => {
        if (!open) {
          setGifShotPending(null);
          if (!shotImageUploadInFlightRef.current) {
            setShotImageUploadingId(null);
          }
        }
      }}
      fileName={gifShotPending?.file.name}
      allowKeepGif={
        gifShotPending ? gifShotPending.file.size <= STORAGE_CONFIG.MAX_FILE_SIZE : true
      }
      onConvert={() => {
        const p = gifShotPending;
        if (!p) return;
        void runShotImageUpload(p.shotId, p.file, 'convert-static');
        setGifShotPending(null);
      }}
      onKeepGif={() => {
        const p = gifShotPending;
        if (!p) return;
        if (p.file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
          toast.error(
            `GIF ist größer als ${(STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB — bitte mit Konvertierung oder ein kleineres GIF wählen.`
          );
          return;
        }
        void runShotImageUpload(p.shotId, p.file, 'keep-animation');
        setGifShotPending(null);
      }}
    />
  );

  if (loading) {
    return (
      <>
        <LoadingSkeleton count={3} />
        {gifUploadDialog}
      </>
    );
  }

  // 📱 MOBILE VIEW: Simplified flat structure
  if (isMobile) {
    return (
      <>
      <DndProvider backend={HTML5Backend}>
        <div ref={containerRef} data-beat-container className="p-2">
          <FilmDropdownMobile
            acts={acts}
            sequences={sequences}
            scenes={scenes}
            shots={shots}
            characters={characters}
            onAddAct={handleAddAct}
            onAddSequence={handleAddSequence}
            onAddScene={handleAddScene}
            onAddShot={handleAddShot}
            onUpdateAct={handleUpdateAct}
            onUpdateSequence={handleUpdateSequence}
            onUpdateScene={handleUpdateScene}
            onUpdateShot={handleUpdateShot}
            onDeleteAct={handleDeleteAct}
            onDeleteSequence={handleDeleteSequence}
            onDeleteScene={handleDeleteScene}
            onDeleteShot={handleDeleteShot}
            onDuplicateShot={handleDuplicateShot}
            projectId={projectId}
            projectType={projectType}
          />
        </div>
      </DndProvider>
      {gifUploadDialog}
      </>
    );
  }

  // 💻 DESKTOP VIEW: Full nested structure with Drag & Drop
  return (
    <>
    <DndProvider backend={HTML5Backend}>
      <div ref={containerRef} data-beat-container className="flex flex-col gap-1.5 p-4">
        {/* Add Act Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddAct}
          disabled={creating === 'act'}
          className="w-1/2 md:w-1/4 ml-auto bg-white text-center border-2 border-dashed border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          <Plus className="size-3.5 mr-1.5" />
          Act hinzufügen
        </Button>

        {/* Acts mit Drop Zones */}
        {acts.map((act, actIndex) => {
          // 🚀 OPTIMIZED: Use memoized filter instead of sequences.filter()
          const actSequences = optimized.getSequencesForAct(act.id);
          const isExpanded = expandedActs.has(act.id);
          const isEditing = editingAct === act.id;
          const isPending = pendingIds.has(act.id);

          return (
            <div key={act.id}>
              {/* Drop Zone VOR diesem Act */}
              <DropZone
                type={ItemTypes.ACT}
                index={actIndex}
                onDrop={handleActDropAtIndex}
                label="Act"
                height="act"
              />
              
              {/* Act selbst (droppable für Swap) */}
              <DraggableAct
                act={act}
                index={actIndex}
                onSwap={handleActSwap}
              >
                <Collapsible
                  open={isExpanded}
                  onOpenChange={(open) => {
                    const next = new Set(expandedActs);
                    if (open) {
                      next.add(act.id);
                    } else {
                      next.delete(act.id);
                    }
                    setExpandedActs(next);
                  }}
                >
                  <div 
                    data-act-card
                    data-act-id={act.id}
                    className={cn(
                      "border-2 rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-700 overflow-hidden",
                      isPending && "opacity-90 animate-pulse"
                    )}
                  >
                    {/* Act Header */}
                  <div 
                    data-act-header
                    data-act-header-id={act.id}
                    className="flex items-center gap-2 py-4 px-3"
                  >
                    <GripVertical className="size-4 text-muted-foreground cursor-move flex-shrink-0" />
                    
                    <CollapsibleTrigger asChild>
                      <button className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                  {isEditing ? (
                    <>
                      <Input
                        value={editValues[act.id]?.title ?? act.title}
                        onChange={(e) => setEditValues(prev => ({
                          ...prev,
                          [act.id]: { ...prev[act.id], title: e.target.value }
                        }))}
                        className="h-7 flex-1 bg-white text-[18px] border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500 focus-visible:ring-blue-400/20"
                        placeholder="Titel"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateAct(act.id)}
                        className="h-7 px-2"
                      >
                        Speichern
                      </Button>
                    </>
                  ) : (
                    <>
                      <span 
                        className="flex-1 font-semibold text-[18px] text-[rgb(21,93,252)] cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const next = new Set(expandedActs);
                          if (isExpanded) {
                            next.delete(act.id);
                          } else {
                            next.add(act.id);
                          }
                          setExpandedActs(next);
                        }}
                      >
                        {act.title}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setInfoDialogData({ type: 'act', node: act });
                              setInfoDialogOpen(true);
                            }}
                          >
                            <Info className="size-3.5 mr-2" />
                            Informationen
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingAct(act.id);
                              setEditValues(prev => ({
                                ...prev,
                                [act.id]: { title: act.title, description: act.description }
                              }));
                            }}
                          >
                            <Edit className="size-3.5 mr-2" />
                            Edit Act
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateAct(act.id)}>
                            <Copy className="size-3.5 mr-2" />
                            Duplicate Act
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAct(act.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete Act
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                <CollapsibleContent>
                  {/* Act Description */}
                  <div className="px-3 pb-2 space-y-2">
                    {isEditing ? (
                      <Textarea
                        value={editValues[act.id]?.description ?? act.description ?? ''}
                        onChange={(e) => setEditValues(prev => ({
                          ...prev,
                          [act.id]: { ...prev[act.id], description: e.target.value }
                        }))}
                        className="bg-white text-sm border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500 focus-visible:ring-blue-400/20"
                        placeholder="Beschreibung"
                        rows={2}
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingAct(act.id);
                          setEditValues(prev => ({
                            ...prev,
                            [act.id]: { title: act.title, description: act.description }
                          }));
                        }}
                        className="text-sm text-[rgb(21,93,252)] cursor-pointer hover:text-foreground transition-colors min-h-[2rem] flex items-center"
                      >
                        {act.description || '+ Beschreibung'}
                      </div>
                    )}
                  </div>

                  {/* Sequences */}
                  <div className="px-3 pb-3 flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSequence(act.id)}
                      disabled={creating === `sequence-${act.id}`}
                      className="w-1/2 md:w-1/4 ml-auto h-7 text-xs bg-white text-center border-2 border-dashed border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                    >
                      <Plus className="size-3 mr-1" />
                      Sequenz hinzufügen
                    </Button>

                    {actSequences.map((sequence, seqIndex) => {
                      // 🚀 OPTIMIZED: Use memoized filter instead of scenes.filter()
                      const seqScenes = optimized.getScenesForSequence(sequence.id);
                      const isSeqExpanded = expandedSequences.has(sequence.id);
                      const isSeqEditing = editingSequence === sequence.id;
                      const isSeqPending = pendingIds.has(sequence.id);

                      return (
                        <div key={sequence.id}>
                          {/* Drop Zone VOR dieser Sequence */}
                          <DropZone
                            type={ItemTypes.SEQUENCE}
                            index={seqIndex}
                            onDrop={(draggedId, targetIndex) => handleSequenceDropAtIndex(draggedId, targetIndex, act.id)}
                            label="Sequence"
                            height="sequence"
                          />
                          
                          {/* Sequence selbst (droppable für Swap) */}
                          <DraggableSequence
                            sequence={sequence}
                            index={seqIndex}
                            onSwap={handleSequenceSwap}
                          >
                            <Collapsible
                              open={isSeqExpanded}
                              onOpenChange={(open) => {
                                const next = new Set(expandedSequences);
                                if (open) {
                                  next.add(sequence.id);
                                } else {
                                  next.delete(sequence.id);
                                }
                                setExpandedSequences(next);
                              }}
                            >
                              <div 
                                data-sequence-id={sequence.id}
                                className={cn(
                                  "border-2 rounded-lg bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-700 overflow-hidden",
                                  isSeqPending && "opacity-90 animate-pulse"
                                )}
                              >
                                {/* Sequence Header */}
                              <div className="flex items-center gap-2 p-2">
                                <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
                                
                                <CollapsibleTrigger asChild>
                                  <button className="flex-shrink-0">
                                    {isSeqExpanded ? (
                                      <ChevronDown className="size-3.5" />
                                    ) : (
                                      <ChevronRight className="size-3.5" />
                                    )}
                                  </button>
                                </CollapsibleTrigger>

                              {isSeqEditing ? (
                                <>
                                  <Input
                                    value={editValues[sequence.id]?.title ?? sequence.title}
                                    onChange={(e) => setEditValues(prev => ({
                                      ...prev,
                                      [sequence.id]: { ...prev[sequence.id], title: e.target.value }
                                    }))}
                                    className="h-6 flex-1 bg-white text-sm border-green-200 dark:border-green-700 focus:border-green-400 dark:focus:border-green-500 focus-visible:ring-green-400/20"
                                    placeholder="Titel"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateSequence(sequence.id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Speichern
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span 
                                    className="flex-1 text-sm font-semibold text-[14px] text-[rgb(0,166,62)] cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      const next = new Set(expandedSequences);
                                      if (isSeqExpanded) {
                                        next.delete(sequence.id);
                                      } else {
                                        next.add(sequence.id);
                                      }
                                      setExpandedSequences(next);
                                    }}
                                  >
                                    {sequence.title}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="size-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setInfoDialogData({ type: 'sequence', node: sequence });
                                          setInfoDialogOpen(true);
                                        }}
                                      >
                                        <Info className="size-3 mr-2" />
                                        Informationen
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setEditingSequence(sequence.id);
                                          setEditValues(prev => ({
                                            ...prev,
                                            [sequence.id]: { title: sequence.title, description: sequence.description }
                                          }));
                                        }}
                                      >
                                        <Edit className="size-3 mr-2" />
                                        Edit Sequence
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDuplicateSequence(sequence.id)}>
                                        <Copy className="size-3 mr-2" />
                                        Duplicate Sequence
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteSequence(sequence.id)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="size-3 mr-2" />
                                        Delete Sequence
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                            </div>

                            <CollapsibleContent>
                              {/* Sequence Description */}
                              <div className="px-2 pb-2 space-y-2">
                                {isSeqEditing ? (
                                  <Textarea
                                    value={editValues[sequence.id]?.description ?? sequence.description ?? ''}
                                    onChange={(e) => setEditValues(prev => ({
                                      ...prev,
                                      [sequence.id]: { ...prev[sequence.id], description: e.target.value }
                                    }))}
                                    className="bg-white text-xs border-green-200 dark:border-green-700 focus:border-green-400 dark:focus:border-green-500 focus-visible:ring-green-400/20"
                                    placeholder="Beschreibung"
                                    rows={2}
                                  />
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingSequence(sequence.id);
                                      setEditValues(prev => ({
                                        ...prev,
                                        [sequence.id]: { title: sequence.title, description: sequence.description }
                                      }));
                                    }}
                                    className="text-xs text-[rgb(0,166,62)] cursor-pointer hover:text-foreground transition-colors min-h-[1.5rem] flex items-center"
                                  >
                                    {sequence.description || '+ Beschreibung'}
                                  </div>
                                )}
                              </div>

                              {/* Scenes */}
                              <div className="px-2 pb-2 flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddScene(sequence.id)}
                                  disabled={creating === `scene-${sequence.id}` || pendingIds.has(sequence.id)}
                                  className="w-1/2 md:w-1/4 ml-auto h-6 text-xs bg-white text-center border-2 border-dashed border-pink-200 dark:border-pink-700 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40"
                                >
                                  <Plus className="size-3 mr-1" />
                                  {pendingIds.has(sequence.id) ? 'Wird gespeichert...' : 'Scene hinzufügen'}
                                </Button>

                                {seqScenes.map((scene, sceneIndex) => {
                                  // 🚀 OPTIMIZED: Use memoized filter instead of shots.filter()
                                  const sceneShots = optimized.getShotsForScene(scene.id);
                                  const isSceneExpanded = expandedScenes.has(scene.id);
                                  const isSceneEditing = editingScene === scene.id;
                                  const isScenePending = pendingIds.has(scene.id);

                                  return (
                                    <div key={scene.id}>
                                      {/* Drop Zone VOR dieser Scene */}
                                      <DropZone
                                        type={ItemTypes.SCENE}
                                        index={sceneIndex}
                                        onDrop={(draggedId, targetIndex) => handleSceneDropAtIndex(draggedId, targetIndex, sequence.id)}
                                        label="Scene"
                                        height="scene"
                                      />
                                      
                                      {/* Scene selbst (droppable für Swap) */}
                                      <DraggableScene
                                        scene={scene}
                                        index={sceneIndex}
                                        onSwap={handleSceneSwap}
                                      >
                                        <Collapsible
                                          open={isSceneExpanded}
                                          onOpenChange={(open) => {
                                            const next = new Set(expandedScenes);
                                            if (open) {
                                              next.add(scene.id);
                                              void ensureSceneShotsLoaded(scene.id);
                                            } else {
                                              next.delete(scene.id);
                                            }
                                            setExpandedScenes(next);
                                          }}
                                        >
                                          <div 
                                            data-scene-id={scene.id}
                                            className={cn(
                                              "border-2 rounded-lg bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-700 overflow-hidden",
                                              isScenePending && "opacity-90 animate-pulse"
                                            )}
                                          >
                                            {/* Scene Header */}
                                            <div className="flex items-center gap-2 p-2">
                                              <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
                                              
                                              <CollapsibleTrigger asChild>
                                                <button className="flex-shrink-0">
                                                  {isSceneExpanded ? (
                                                    <ChevronDown className="size-3.5" />
                                                  ) : (
                                                    <ChevronRight className="size-3.5" />
                                                  )}
                                                </button>
                                              </CollapsibleTrigger>

                                          {isSceneEditing ? (
                                            <>
                                              <Input
                                                value={editValues[scene.id]?.title ?? scene.title}
                                                onChange={(e) => setEditValues(prev => ({
                                                  ...prev,
                                                  [scene.id]: { ...prev[scene.id], title: e.target.value }
                                                }))}
                                                className="h-6 flex-1 bg-white text-xs border-pink-200 dark:border-pink-700 focus:border-pink-400 dark:focus:border-pink-500 focus-visible:ring-pink-400/20"
                                                placeholder="Titel"
                                              />
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleUpdateScene(scene.id)}
                                                className="h-6 px-2 text-xs"
                                              >
                                                Speichern
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <span 
                                                className="flex-1 text-xs font-semibold text-[14px] text-[rgb(230,0,118)] cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => {
                                                  const next = new Set(expandedScenes);
                                                  if (isSceneExpanded) {
                                                    next.delete(scene.id);
                                                  } else {
                                                    next.add(scene.id);
                                                    void ensureSceneShotsLoaded(scene.id);
                                                  }
                                                  setExpandedScenes(next);
                                                }}
                                              >
                                                {scene.title}
                                              </span>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-1.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <MoreVertical className="size-3" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem 
                                                    onClick={() => {
                                                      setInfoDialogData({ type: 'scene', node: scene });
                                                      setInfoDialogOpen(true);
                                                    }}
                                                  >
                                                    <Info className="size-3 mr-2" />
                                                    Informationen
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    onClick={() => {
                                                      setEditingScene(scene.id);
                                                      setEditValues(prev => ({
                                                        ...prev,
                                                        [scene.id]: { title: scene.title, description: scene.description }
                                                      }));
                                                    }}
                                                  >
                                                    <Edit className="size-3 mr-2" />
                                                    Edit Scene
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleDuplicateScene(scene.id)}>
                                                    <Copy className="size-3 mr-2" />
                                                    Duplicate Scene
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    onClick={() => handleDeleteScene(scene.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                  >
                                                    <Trash2 className="size-3 mr-2" />
                                                    Delete Scene
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </>
                                          )}
                                        </div>

                                        <CollapsibleContent>
                                          {/* Scene Description */}
                                          <div className="px-2 pb-2 space-y-2">
                                            {isSceneEditing ? (
                                              <Textarea
                                                value={editValues[scene.id]?.description ?? scene.description ?? ''}
                                                onChange={(e) => setEditValues(prev => ({
                                                  ...prev,
                                                  [scene.id]: { ...prev[scene.id], description: e.target.value }
                                                }))}
                                                className="bg-white text-xs border-pink-200 dark:border-pink-700 focus:border-pink-400 dark:focus:border-pink-500 focus-visible:ring-pink-400/20"
                                                placeholder="Beschreibung"
                                                rows={2}
                                              />
                                            ) : (
                                              <div
                                                onClick={() => {
                                                  setEditingScene(scene.id);
                                                  setEditValues(prev => ({
                                                    ...prev,
                                                    [scene.id]: { title: scene.title, description: scene.description }
                                                  }));
                                                }}
                                                className="text-xs text-[rgb(230,0,118)] cursor-pointer hover:text-foreground transition-colors min-h-[1.5rem] flex items-center"
                                              >
                                                {scene.description || '+ Beschreibung'}
                                              </div>
                                            )}
                                          </div>

                                          {/* Shots */}
                                          <div className="px-2 pb-2 flex flex-col gap-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleAddShot(scene.id)}
                                              disabled={creating === `shot-${scene.id}` || scene.id.startsWith('temp-') || pendingIds.has(scene.id)}
                                              className="w-1/2 md:w-1/4 ml-auto h-6 text-xs bg-white text-center border-2 border-dashed border-yellow-400 dark:border-yellow-600 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                            >
                                              <Plus className="size-3 mr-1" />
                                              {pendingIds.has(scene.id) ? 'Wird gespeichert...' : 'Shot hinzufügen'}
                                            </Button>

                                            {loadingSceneShots.has(scene.id) ? (
                                              <div className="text-[11px] text-muted-foreground px-1 py-1">
                                                Shots werden geladen…
                                              </div>
                                            ) : null}

                                            {sceneShots.map((shot, shotIndex) => {
                                              const isShotPending = pendingIds.has(shot.id);
                                              
                                              return (
                                                <div key={shot.id}>
                                                  {/* Drop Zone VOR diesem Shot */}
                                                  <DropZone
                                                    type={ItemTypes.SHOT}
                                                    index={shotIndex}
                                                    onDrop={(draggedId, targetIndex) => handleShotDropAtIndex(draggedId, targetIndex, scene.id)}
                                                    label="Shot"
                                                    height="shot"
                                                  />
                                                  
                                                  {/* Shot selbst (droppable für Swap) */}
                                                  <DraggableShot
                                                    shot={shot}
                                                    index={shotIndex}
                                                    onSwap={handleShotSwap}
                                                  >
                                                    <ShotCard
                                                    shot={shot}
                                                    sceneId={scene.id}
                                                    projectId={projectId}
                                                    isPending={isShotPending}
                                                    imageUploadWaiting={shotImageUploadingId === shot.id}
                                                  projectCharacters={characters}
                                                  isExpanded={expandedShots.has(shot.id)}
                                                  onToggleExpand={() => {
                                                    const next = new Set(expandedShots);
                                                    if (expandedShots.has(shot.id)) {
                                                      next.delete(shot.id);
                                                    } else {
                                                      next.add(shot.id);
                                                    }
                                                    setExpandedShots(next);
                                                  }}
                                                  onUpdate={handleUpdateShot}
                                                  onDelete={handleDeleteShot}
                                                  onDuplicate={handleDuplicateShot}
                                                  onShowInfo={(shotId) => {
                                                    const shotData = shots.find(s => s.id === shotId);
                                                    if (shotData) {
                                                      setInfoDialogData({ type: 'shot', node: shotData });
                                                      setInfoDialogOpen(true);
                                                    }
                                                  }}
                                                  onImageUpload={handleShotImageUpload}
                                                  onAudioUpload={handleShotAudioUpload}
                                                  onAudioDelete={handleShotAudioDelete}
                                                  onAudioUpdate={handleShotAudioUpdate}
                                                  onCharacterAdd={handleShotCharacterAdd}
                                                  onCharacterRemove={handleShotCharacterRemove}
                                                />
                                              </DraggableShot>
                                              
                                              {/* Drop Zone NACH diesem Shot (nur beim letzten) */}
                                              {shotIndex === sceneShots.length - 1 && (
                                                <DropZone
                                                  type={ItemTypes.SHOT}
                                                  index={sceneShots.length}
                                                  onDrop={(draggedId, targetIndex) => handleShotDropAtIndex(draggedId, targetIndex, scene.id)}
                                                  label="Shot"
                                                  height="shot"
                                                />
                                              )}
                                              </div>
                                            );
                                            })}
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                    </DraggableScene>
                                    
                                    {/* Drop Zone NACH dieser Scene (nur beim letzten) */}
                                    {sceneIndex === seqScenes.length - 1 && (
                                      <DropZone
                                        type={ItemTypes.SCENE}
                                        index={seqScenes.length}
                                        onDrop={(draggedId, targetIndex) => handleSceneDropAtIndex(draggedId, targetIndex, sequence.id)}
                                        label="Scene"
                                        height="scene"
                                      />
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                        </DraggableSequence>
                        
                        {/* Drop Zone NACH dieser Sequence (nur beim letzten) */}
                        {seqIndex === actSequences.length - 1 && (
                          <DropZone
                            type={ItemTypes.SEQUENCE}
                            index={actSequences.length}
                            onDrop={(draggedId, targetIndex) => handleSequenceDropAtIndex(draggedId, targetIndex, act.id)}
                            label="Sequence"
                            height="sequence"
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
            </DraggableAct>
            
            {/* Drop Zone NACH diesem Act (nur beim letzten) */}
            {actIndex === acts.length - 1 && (
              <DropZone
                type={ItemTypes.ACT}
                index={acts.length}
                onDrop={handleActDropAtIndex}
                label="Act"
                height="act"
              />
            )}
          </div>
          );
        })}
      </div>

      {/* Statistics & Logs Dialog */}
      {infoDialogData && (
        <TimelineNodeStatsDialog
          open={infoDialogOpen}
          onOpenChange={setInfoDialogOpen}
          nodeType={infoDialogData.type}
          node={infoDialogData.node}
          projectId={projectId}
          projectType={projectType}
        />
      )}
    </DndProvider>
    {gifUploadDialog}
    </>
  );
}
