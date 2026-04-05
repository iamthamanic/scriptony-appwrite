import { useState, useRef, useEffect, useMemo, useCallback, type RefObject } from 'react';
import {
  Play,
  Pause,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  MoreVertical,
  Camera,
  ListTree,
  Magnet,
  Clapperboard,
  Crosshair,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { cn } from './ui/utils';
import * as BeatsAPI from '../lib/api/beats-api';
import * as TimelineAPI from '../lib/api/timeline-api';
import * as ShotsAPI from '../lib/api/shots-api';
import { useAuth } from '../hooks/useAuth';
import type { TimelineData } from './FilmDropdown';
import type { BookTimelineData } from './BookDropdown';
import type { Character, Clip, ShotAudio } from '../lib/types';
import * as ClipsAPI from '../lib/api/clips-api';
import { computeFilmShotSpans, buildEffectiveFilmTimelineData, type FilmManualTimings } from '../lib/timeline-film-geometry';
import { expandStructurePctToFitClip } from '../lib/timeline-container-expand';
import {
  maxDescendantEndInAct,
  minDescendantStartInAct,
  maxDescendantEndInSequence,
  minDescendantStartInSequence,
  maxDescendantEndInScene,
  minDescendantStartInScene,
  maxClipEndForShot,
  minClipStartForShot,
  clampBoundaryToChildren,
} from '../lib/timeline-structure-trim-clamp';
import { RichTextEditorModal } from './RichTextEditorModal';
import { ReadonlyTiptapView } from './ReadonlyTiptapView';
import { TimelineTextPreview } from './TimelineTextPreview';
import { trimBeatLeft, trimBeatRight } from './timeline-helpers';
import { calculateActBlocks, calculateSequenceBlocks, calculateSceneBlocks } from './timeline-blocks';
import { toast } from 'sonner';
import { ShotCardModal } from './ShotCardModal';
import { useOptionalTimelineState } from '../contexts/TimelineStateContext';
import { useTrimDragEngine, applyBeatPreviewToDOM } from '../lib/trim-drag-engine';
import { getTrimGrabHandleStyles, TRIM_END_CAP_WIDTH } from '../hooks/useTrimGrabHandles';
import { TRIM_GRAB_PRESET_BASE_HEX } from '../lib/trim-handle-colors';
import { enrichBookTimelineData, loadProjectTimelineBundle } from '../lib/timeline-map';
import {
  getTimelineTrackClipClasses,
  TIMELINE_TRACK_REGISTRY,
} from '../lib/timeline-track-tokens';
import { isPersistedTimelineNodeId } from '../lib/timeline-node-ids';
import {
  computeParentPctPatchesAfterSceneTrim,
  computeParentPctPatchesAfterSequenceTrim,
  computeParentPctPatchesAfterActTrim,
} from '../lib/timeline-trim-parent-sync';
import {
  outerTrimAdjustFirstPair,
  outerTrimAdjustLastPair,
  clampOuterFirstDurationToChildHull,
  clampOuterLastDurationToChildHull,
} from '../lib/timeline-structure-outer-trim';
import { buildPctMapFromOrderedSegmentSeconds } from '../lib/timeline-structure-trim-pct';
import type { FrozenGlobalBounds } from '../lib/timeline-structure-preserve-global';
import {
  preserveSequenceSceneTimingsAfterActPctChange,
  preserveSceneTimingsAfterSequencePctChange,
} from '../lib/timeline-structure-preserve-global';

function snapshotSeqSceneFrozenBoundsFromRefs(
  seqBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>
): { frozenSeq: FrozenGlobalBounds; frozenScene: FrozenGlobalBounds } {
  const frozenSeq: FrozenGlobalBounds = {};
  for (const b of seqBlocks) frozenSeq[b.id] = { startSec: b.startSec, endSec: b.endSec };
  const frozenScene: FrozenGlobalBounds = {};
  for (const b of sceneBlocks) frozenScene[b.id] = { startSec: b.startSec, endSec: b.endSec };
  return { frozenSeq, frozenScene };
}

function snapshotSceneFrozenBoundsFromRefs(
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>
): FrozenGlobalBounds {
  const frozenScene: FrozenGlobalBounds = {};
  for (const b of sceneBlocks) frozenScene[b.id] = { startSec: b.startSec, endSec: b.endSec };
  return frozenScene;
}

/**
 * Volle Act-PCT-Karte für DOM-Vorschau beim Clip-Trim (kein React-setState).
 * Reihenfolge/Fallback wie calculateActBlocks (Film): td.acts-Array, nicht orderIndex-Sort.
 * layoutSnapshot = Act-Blöcke beim Pointerdown — für Acts ohne manual-Eintrag bleibt die sichtbare Position erhalten.
 */
function buildFullActPctPreviewMapForTrim(
  td: TimelineData,
  manual: Record<string, { pct_from: number; pct_to: number }>,
  durationSec: number,
  layoutSnapshot: Array<{ id: string; startSec: number; endSec: number }> | undefined
): Record<string, { pct_from: number; pct_to: number }> {
  const acts = td.acts || [];
  const n = acts.length || 1;
  const B = Math.max(1e-9, durationSec);
  const out: Record<string, { pct_from: number; pct_to: number }> = {};
  acts.forEach((a: any, actIndex: number) => {
    const o = manual[a.id];
    if (o && Number.isFinite(o.pct_from) && Number.isFinite(o.pct_to) && o.pct_from < o.pct_to) {
      out[a.id] = { pct_from: o.pct_from, pct_to: o.pct_to };
      return;
    }
    const snap = layoutSnapshot?.find((b) => b.id === a.id);
    if (snap) {
      out[a.id] = {
        pct_from: (snap.startSec / B) * 100,
        pct_to: (snap.endSec / B) * 100,
      };
      return;
    }
    const meta = a?.metadata ?? {};
    const pctFrom = typeof meta?.pct_from === 'number' ? meta.pct_from : undefined;
    const pctTo = typeof meta?.pct_to === 'number' ? meta.pct_to : undefined;
    if (pctFrom !== undefined && pctTo !== undefined) {
      out[a.id] = { pct_from: pctFrom, pct_to: pctTo };
      return;
    }
    out[a.id] = {
      pct_from: actIndex * (100 / n),
      pct_to: (actIndex + 1) * (100 / n),
    };
  });
  return out;
}

/** Act-Trim: globale Act-Sekunden für Clamp/Handles — gleiche Quelle wie Live-Preview (manual ref + Snapshot). */
function mergeActBlocksWithTrimLivePct(
  baseBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  livePctByAct: Record<string, { pct_from: number; pct_to: number }>,
  durationSec: number
): Array<{ id: string; startSec: number; endSec: number }> {
  const B = Math.max(1e-9, durationSec);
  const map = new Map(baseBlocks.map((b) => [b.id, { ...b }]));
  for (const [id, p] of Object.entries(livePctByAct)) {
    map.set(id, {
      id,
      startSec: (p.pct_from / 100) * B,
      endSec: (p.pct_to / 100) * B,
    });
  }
  return [...map.values()];
}

const SCRIPTONY_DEBUG_INGEST =
  import.meta.env.DEV
    ? '/__scriptony-debug-ingest'
    : 'http://127.0.0.1:7638/ingest/9ae19260-7b19-4079-a44e-3346133bcc1e';

/**
 * 🎬 VIDEO EDITOR TIMELINE (CapCut Style)
 * 
 * NEW ARCHITECTURE:
 * - Unit-based system (seconds or reading-seconds)
 * - Dynamic ticks based on zoom level (no overlaps!)
 * - Anchor-based zoom (zooms to cursor position)
 * - Viewport culling (only render visible items)
 * - Dynamic zoom range: zoom=0 always shows ENTIRE timeline (like CapCut!)
 * - Exponential zoom mapping from fitPxPerSec (dynamic) to MAX_PX_PER_SEC (200)
 * - Shot track: shows each shot’s image (thumbnail or full-bleed when the block is narrow).
 * - Film: Musik- und SFX-Zeilen nutzen dieselbe x/Breite wie der Shot (mit Shot-Trim); Clips proportional nach Audiolänge/Trim.
 */

interface VideoEditorTimelineProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData | BookTimelineData | null;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  /**
   * Project timeline length in seconds. Structure pct math and expansion clamp to this range;
   * extending the timeline requires updating duration upstream (project “Dauer” / API).
   */
  duration?: number;
  /**
   * Optional: notify parent when merged structure/content would ideally use a longer timeline than
   * `duration` (e.g. editorial clips or patches reaching the right edge). Parent may ignore or open
   * “extend project duration”.
   */
  onProjectDurationSecondsHint?: (minSeconds: number) => void;
  beats?: any[];
  totalWords?: number;
  wordsPerPage?: number;
  targetPages?: number;
  readingSpeedWpm?: number; // Reading speed in words per minute for books
  /** Film: switch to structure dropdown, expand act→scene→shot and scroll to shot (full ShotCard menu). */
  onOpenShotInStructureTree?: (shotId: string) => void;
}

type AddNodeKind = 'act' | 'sequence' | 'scene' | 'shot';
type EditableTitleKind = AddNodeKind | 'beat';

// 🎯 ZOOM CONFIGURATION
const MAX_PX_PER_SEC = 200;  // Maximum zoom in
const FALLBACK_MIN_PX_PER_SEC = 2; // Fallback minimum (only used if calculation fails)

// 🎯 TICK CONFIGURATION
const MIN_LABEL_SPACING_PX = 80; // Minimum space between labels

// Time steps for ruler markers (in seconds)
const TIME_STEPS_SECONDS = [
  1, 2, 5, 10, 15, 30,
  60, 120, 300, 600, 900,
  1800, 3600, 7200, 10800
];

// Page steps for page markers (in pages)
const PAGE_STEPS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500
];

// 🎯 Calculate the minimum pxPerSec to fit entire timeline in viewport
function getFitPxPerSec(totalDurationSec: number, viewportWidthPx: number): number {
  if (totalDurationSec <= 0 || viewportWidthPx <= 0) return FALLBACK_MIN_PX_PER_SEC; // Fallback
  return viewportWidthPx / totalDurationSec; // Entire timeline fits in viewport
}

// Convert zoom [0-1] to pixels per second (exponential for natural feel)
// zoom = 0 → fitPxPerSec (entire timeline visible)
// zoom = 1 → MAX_PX_PER_SEC (maximum zoom in)
function pxPerSecFromZoom(zoom: number, fitPxPerSec: number): number {
  const minPx = fitPxPerSec; // Dynamic minimum based on project duration
  const ratio = MAX_PX_PER_SEC / minPx;
  return minPx * Math.pow(ratio, zoom);
}

// Convert pixels per second to zoom [0-1]
function zoomFromPxPerSec(px: number, fitPxPerSec: number): number {
  const minPx = fitPxPerSec; // Dynamic minimum based on project duration
  const ratio = MAX_PX_PER_SEC / minPx;
  return Math.log(px / minPx) / Math.log(ratio);
}

// Choose tick step based on current zoom to avoid overlaps
function chooseTickStep(pxPerSecond: number): number {
  const minSecondsBetweenTicks = MIN_LABEL_SPACING_PX / pxPerSecond;
  return (
    TIME_STEPS_SECONDS.find(step => step >= minSecondsBetweenTicks) ??
    TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]
  );
}

// Format time label (HH:MM:SS or MM:SS)
function formatTimeLabel(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function shotBlockPreviewUrl(shot: { imageUrl?: string; image_url?: string; thumbnailUrl?: string; thumbnail_url?: string }): string {
  return (
    shot.imageUrl ||
    shot.image_url ||
    shot.thumbnailUrl ||
    shot.thumbnail_url ||
    ''
  );
}

/** Playback length of one clip (trim region or file duration) for proportional layout inside the shot bar. */
function shotAudioPlayDurationSec(a: ShotAudio): number {
  const s = a.startTime;
  const e = a.endTime;
  if (typeof s === 'number' && typeof e === 'number' && e > s) return e - s;
  if (typeof a.duration === 'number' && a.duration > 0) return a.duration;
  return 1;
}

function layoutShotAudioSegments(files: ShotAudio[]): { id: string; widthFrac: number; title: string }[] {
  if (files.length === 0) return [];
  const durs = files.map(shotAudioPlayDurationSec);
  const sum = durs.reduce((x, y) => x + y, 0) || 1;
  return files.map((f, i) => ({
    id: f.id,
    widthFrac: durs[i]! / sum,
    title: (f.label || f.fileName || 'Audio').slice(0, 48),
  }));
}

// 🎯 ADAPTIVE TEXT RENDERING: Choose text display based on block width
type BlockType = 'beat' | 'act' | 'chapter' | 'scene' | 'shot';

function getBlockText(
  fullText: string, 
  widthPx: number, 
  type: BlockType,
  index: number
): string {
  // Hide label for ultra-small blocks to prevent visual noise/overlap.
  if (!Number.isFinite(widthPx) || widthPx < 18) {
    return '';
  }

  // Define thresholds for each track type
  const thresholds: Record<BlockType, { full: number; abbreviated: number }> = {
    beat: { full: 60, abbreviated: 30 },
    act: { full: 80, abbreviated: 40 },
    chapter: { full: 100, abbreviated: 50 },
    scene: { full: 120, abbreviated: 60 },
    shot: { full: 80, abbreviated: 40 },
  };
  
  const { full, abbreviated } = thresholds[type];
  
  // 3 levels: Full, Abbreviated, Minimal
  if (widthPx >= full) {
    // Full text
    return fullText;
  } else if (widthPx >= abbreviated) {
    // Abbreviated text with "..."
    const maxChars = Math.floor(widthPx / 7); // Rough estimate: 7px per char
    if (fullText.length <= maxChars) return fullText;
    return fullText.substring(0, maxChars - 3) + '...';
  } else {
    // Minimal text: B1, A1, K1, S1
    const prefix = type === 'beat' ? 'B' : 
                   type === 'act' ? 'A' : 
                   type === 'chapter' ? 'K' :
                   type === 'scene' ? 'S' : 'SH';
    return `${prefix}${index + 1}`;
  }
}

// 🎯 ADAPTIVE TIME MARKERS: Choose interval based on pxPerSec to prevent overlaps
function getTimeMarkerInterval(pxPerSec: number): number {
  const minSecondsBetweenTicks = MIN_LABEL_SPACING_PX / pxPerSec;
  return (
    TIME_STEPS_SECONDS.find(step => step >= minSecondsBetweenTicks) ??
    TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]
  );
}

// 🎯 ADAPTIVE PAGE MARKERS: Choose interval based on available space (intelligent like time markers!)
function getPageMarkerInterval(pxPerSec: number, wordsPerPage: number, readingSpeedWpm: number): number {
  // Calculate how many pixels one page occupies
  const secondsPerPage = (wordsPerPage / readingSpeedWpm) * 60;
  const pxPerPage = pxPerSec * secondsPerPage;
  
  // Calculate minimum pages between ticks to maintain MIN_LABEL_SPACING_PX
  const minPagesBetweenTicks = MIN_LABEL_SPACING_PX / pxPerPage;
  
  // Find the smallest page step that satisfies the spacing requirement
  return (
    PAGE_STEPS.find(step => step >= minPagesBetweenTicks) ??
    PAGE_STEPS[PAGE_STEPS.length - 1]
  );
}

// 📖 Calculate word count from TipTap content (same logic as BookDropdown)
function calculateWordCountFromContent(content: any): number {
  if (!content?.content || !Array.isArray(content.content)) {
    return 0;
  }
  
  let totalWords = 0;
  for (const node of content.content) {
    if (node.type === 'paragraph' && node.content) {
      for (const child of node.content) {
        if (child.type === 'text' && child.text) {
          const words = child.text.trim().split(/\s+/).filter((w: string) => w.length > 0);
          totalWords += words.length;
        }
      }
    }
  }
  return totalWords;
}

/**
 * Einmal pro Track-Preset — `baseColorHex` erzwingt berechnete Inline-Farben (wie bei Shots/Beats mit Farbe).
 * Nur Tailwind-`bg-*` würde bei zusammengesetzten Klassennamen im Build oft fehlen → Griffe unsichtbar.
 */
const ACT_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: 'act',
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.act,
});
const SEQUENCE_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: 'sequence',
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.sequence,
});
const SCENE_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: 'scene',
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.scene,
});
const SHOT_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: 'shot',
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.shot,
});

export function VideoEditorTimeline({ 
  projectId, 
  projectType = 'film',
  initialData, 
  onDataChange,
  duration = 300,
  onProjectDurationSecondsHint,
  beats: parentBeats,
  totalWords,
  wordsPerPage = 250,
  targetPages,
  readingSpeedWpm = 150, // Default reading speed in words per minute
  onOpenShotInStructureTree,
}: VideoEditorTimelineProps) {
  const { getAccessToken } = useAuth();

  // 🎬 SHOT MODAL: Open ShotCard directly in timeline (no view switch)
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const timelineCtx = useOptionalTimelineState(); // May be null if no provider

  /** Open shot: prefer modal (if context available), fallback to structure tree */
  const canOpenShot = !!(timelineCtx || onOpenShotInStructureTree);
  const openShot = useCallback((shotId: string) => {
    if (timelineCtx) {
      setSelectedShotId(shotId);
    } else if (onOpenShotInStructureTree) {
      onOpenShotInStructureTree(shotId);
    }
  }, [timelineCtx, onOpenShotInStructureTree]);
  
  // 🎯 ZOOM & VIEWPORT STATE (MUST BE DECLARED FIRST!)
  const [zoom, setZoom] = useState(0); // Start at zoom = 0 (entire timeline visible)
  const [pxPerSec, setPxPerSec] = useState(FALLBACK_MIN_PX_PER_SEC); // Will be recalculated
  const [fitPxPerSec, setFitPxPerSec] = useState(FALLBACK_MIN_PX_PER_SEC); // Dynamic minimum
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Track if initial zoom has been set
  const initialZoomSetRef = useRef(false);
  
  // Track previous fitPxPerSec to detect changes
  const prevFitPxPerSecRef = useRef(FALLBACK_MIN_PX_PER_SEC);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Timeline data
  const [timelineData, setTimelineData] = useState<TimelineData | BookTimelineData | null>(initialData || null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Beats from database
  const [beats, setBeats] = useState<BeatsAPI.StoryBeat[]>([]);
  const [beatsLoading, setBeatsLoading] = useState(false);
  
  // 🎯 TRACK DB BEATS: Set of beat IDs that exist in the database
  const [dbBeatIds, setDbBeatIds] = useState<Set<string>>(new Set());
  
  // 🧲 BEAT MAGNET (nur Beat-Trim / Ripple)
  const [beatMagnetEnabled, setBeatMagnetEnabled] = useState(true);
  /** Master: wenn aus, kein Snapping am Beat-Trim (CapCut „Autosnap“). */
  const [beatAutosnapEnabled, setBeatAutosnapEnabled] = useState(true);

  // 🧲 CLIP MAGNETS (Act / Sequence / Scene / Shot / Editorial — „Magnet“ = alle Kanten snappen)
  const CLIP_MAGNETS_STORAGE_KEY = `scriptony-timeline-clip-magnets-${projectId}`;
  const [clipMagnets, setClipMagnets] = useState(() => {
    const defaults = { act: true, sequence: true, scene: true, shot: true, editorialClip: true };
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(CLIP_MAGNETS_STORAGE_KEY);
      if (!raw) return defaults;
      const p = JSON.parse(raw) as Record<string, unknown>;
      return {
        act: p.act !== false,
        sequence: p.sequence !== false,
        scene: p.scene !== false,
        shot: p.shot !== false,
        editorialClip: p.editorialClip !== false,
      };
    } catch {
      return defaults;
    }
  });

  const TRACK_AUTOSNAP_STORAGE_KEY = `scriptony-timeline-track-autosnap-v1-${projectId}`;
  type TrackAutosnapKey = 'beat' | 'act' | 'sequence' | 'scene' | 'shot' | 'editorialClip' | 'music';
  const [trackAutosnap, setTrackAutosnap] = useState(() => {
    const defaults: Record<TrackAutosnapKey, boolean> = {
      beat: true,
      act: true,
      sequence: true,
      scene: true,
      shot: true,
      editorialClip: true,
      music: true,
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(TRACK_AUTOSNAP_STORAGE_KEY);
      if (!raw) return defaults;
      const p = JSON.parse(raw) as Record<string, unknown>;
      (Object.keys(defaults) as TrackAutosnapKey[]).forEach((k) => {
        if (p[k] === false) defaults[k] = false;
      });
      return defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CLIP_MAGNETS_STORAGE_KEY, JSON.stringify(clipMagnets));
  }, [clipMagnets, CLIP_MAGNETS_STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TRACK_AUTOSNAP_STORAGE_KEY, JSON.stringify(trackAutosnap));
  }, [trackAutosnap, TRACK_AUTOSNAP_STORAGE_KEY]);
  
  // 🎯 BEAT TRIM STATE
  const [trimingBeat, setTrimingBeat] = useState<{ id: string; handle: 'left' | 'right' } | null>(null);
  const trimStartXRef = useRef(0);
  const trimStartSecRef = useRef(0);
  /** Snapshot at beat trim pointerdown — used on pointerup to diff DB updates via engine commit. */
  const beatTrimSnapshotRef = useRef<BeatsAPI.StoryBeat[] | null>(null);

  // 🎬 CAPCUT-LIKE TRIM STATE (Act / Sequence / Scene / Shot)
  type TrimKind = 'act' | 'sequence' | 'scene' | 'shot';
  const [trimingClip, setTrimingClip] = useState<{
    kind: TrimKind;
    id: string;
    handle: 'left' | 'right';
  } | null>(null);
  /** Erzwingt Re-Render nach Act-Trim-Ref-Updates; die sichtbare Map kommt immer aus useMemo + Refs (nie veraltetes Map-State). */
  const [actTrimLayoutTick, setActTrimLayoutTick] = useState(0);
  const trimStartXRefClip = useRef(0);
  const trimClipBoundaryStartRef = useRef(0);
  const trimClipCtxRef = useRef<{
    kind: TrimKind;
    actIds?: string[];
    actIndex?: number;
    sequenceIds?: string[];
    seqIndex?: number;
    sceneIds?: string[];
    sceneIndex?: number;
    actStartSec?: number;
    actDurSec?: number;
    seqStartSec?: number;
    seqDurSec?: number;
    sceneStartSec?: number;
    sceneDurSec?: number;
    actDurations?: number[];
    sequenceDurations?: number[];
    sceneDurations?: number[];
    shotIds?: string[];
    shotIndex?: number;
    shotDurations?: number[];
    /** Last shot: drag right edge — grow/shrink last shot, take/give time to earlier shots (same scene duration). */
    trimLastRight?: boolean;
    /** First shot: drag left edge — grow/shrink first shot, take/give time to later shots. */
    trimFirstLeft?: boolean;
    /** Absolute sec end of first shot (boundary shot0|shot1); fixed while trimFirstLeft drag. */
    anchorEndFirstSec?: number;
  } | null>(null);
  const trimClipSnapshotRef = useRef<{
    manualActTimings: Record<string, { pct_from: number; pct_to: number }>;
    manualSequenceTimings: Record<string, { pct_from: number; pct_to: number }>;
    manualSceneTimings: Record<string, { pct_from: number; pct_to: number }>;
    manualShotDurations: Record<string, number>;
  } | null>(null);
  const trimingClipRef = useRef<typeof trimingClip>(null);
  trimingClipRef.current = trimingClip;

  /** Set synchronously on beat trim pointerdown; window listeners use this (not React state). */
  const beatTrimActiveRef = useRef<{ id: string; handle: 'left' | 'right' } | null>(null);
  /** Set synchronously on clip trim pointerdown before setTrimingClip. */
  const clipTrimActiveRef = useRef<typeof trimingClip>(null);
  /** Act-Zeilen-Layout (global sec) beim Start des Act-Trims — DOM-Vorschau für Acts ohne manual-Key. */
  const actTrimBlocksSnapshotRef = useRef<Array<{ id: string; startSec: number; endSec: number }>>([]);
  const beatTrimWindowCleanupRef = useRef<(() => void) | null>(null);
  const clipTrimWindowCleanupRef = useRef<(() => void) | null>(null);
  const beatTrimEndGuardRef = useRef(false);
  const clipTrimEndGuardRef = useRef(false);
  const handleTrimMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleTrimEndRef = useRef<(e?: PointerEvent) => void | Promise<void>>(() => {});
  const handleTrimClipMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleTrimClipEndRef = useRef<() => void | Promise<void>>(() => {});
  const registerBeatTrimWindowListenersRef = useRef<() => void>(() => {});
  const registerClipTrimWindowListenersRef = useRef<() => void>(() => {});
  const handleNleClipMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleNleClipEndRef = useRef<() => void | Promise<void>>(() => {});
  const registerNleClipTrimWindowListenersRef = useRef<() => void>(() => {});

  // 🚀 EPHEMERAL DRAG ENGINE — ref-based state during drag, single commit on pointerup
  const trimEngine = useTrimDragEngine();
  const beatTrackContainerRef = useRef<HTMLElement | null>(null);
  const actTrackContainerRef = useRef<HTMLElement | null>(null);
  const sequenceTrackContainerRef = useRef<HTMLElement | null>(null);
  const sceneTrackContainerRef = useRef<HTMLElement | null>(null);
  const shotTrackContainerRef = useRef<HTMLElement | null>(null);
  const beatTrimPointerIdRef = useRef<number | null>(null);

  // Local overrides so UI can update while dragging (we commit only on mouse up).
  const [manualActTimings, setManualActTimings] = useState<
    Record<string, { pct_from: number; pct_to: number }>
  >({});
  const [manualSequenceTimings, setManualSequenceTimings] = useState<
    Record<string, { pct_from: number; pct_to: number }>
  >({}); // pct values are relative to parent act
  const [manualSceneTimings, setManualSceneTimings] = useState<
    Record<string, { pct_from: number; pct_to: number }>
  >({}); // pct values are relative to parent sequence
  const [manualShotDurations, setManualShotDurations] = useState<
    Record<string, number>
  >({}); // duration in seconds

  const manualActTimingsRef = useRef(manualActTimings);
  const manualSequenceTimingsRef = useRef(manualSequenceTimings);
  const manualSceneTimingsRef = useRef(manualSceneTimings);
  const manualShotDurationsRef = useRef(manualShotDurations);
  // Während Clip-Trim schreibt queueManual* nur in die Refs (kein setState). Ohne Guard überschreibt
  // jeder Re-Render die Refs wieder mit veraltetem React-State → Live-Vorschau kaputt.
  if (!clipTrimActiveRef.current) {
    manualActTimingsRef.current = manualActTimings;
    manualSequenceTimingsRef.current = manualSequenceTimings;
    manualSceneTimingsRef.current = manualSceneTimings;
    manualShotDurationsRef.current = manualShotDurations;
  }

  type TimingUpdater<T> = (prev: T) => T;

  /** Legacy hook: früher Queue-Flush vor Pointerup; Clip-Trim nutzt nur noch Refs + DOM-Preview. */
  const flushQueuedTimingUpdatesNow = useCallback(() => {}, []);

  const queueManualActTimings = useCallback(
    (action: React.SetStateAction<Record<string, { pct_from: number; pct_to: number }>>) => {
      const updater: TimingUpdater<Record<string, { pct_from: number; pct_to: number }>> =
        typeof action === 'function' ? (action as TimingUpdater<Record<string, { pct_from: number; pct_to: number }>>) : () => action;
      if (!clipTrimActiveRef.current) {
        setManualActTimings(action);
        return;
      }
      // Clip-Trim: Ref + Act-Zeile per actTrimLayoutTick + useMemo aus Refs (React left/width); Seq/Szene weiterhin applyClipTimingPreviewToDOM
      manualActTimingsRef.current = updater(manualActTimingsRef.current);
    },
    []
  );

  const queueManualSequenceTimings = useCallback(
    (action: React.SetStateAction<Record<string, { pct_from: number; pct_to: number }>>) => {
      const updater: TimingUpdater<Record<string, { pct_from: number; pct_to: number }>> =
        typeof action === 'function' ? (action as TimingUpdater<Record<string, { pct_from: number; pct_to: number }>>) : () => action;
      if (!clipTrimActiveRef.current) {
        setManualSequenceTimings(action);
        return;
      }
      manualSequenceTimingsRef.current = updater(manualSequenceTimingsRef.current);
    },
    []
  );

  const queueManualSceneTimings = useCallback(
    (action: React.SetStateAction<Record<string, { pct_from: number; pct_to: number }>>) => {
      const updater: TimingUpdater<Record<string, { pct_from: number; pct_to: number }>> =
        typeof action === 'function' ? (action as TimingUpdater<Record<string, { pct_from: number; pct_to: number }>>) : () => action;
      if (!clipTrimActiveRef.current) {
        setManualSceneTimings(action);
        return;
      }
      manualSceneTimingsRef.current = updater(manualSceneTimingsRef.current);
    },
    []
  );

  const queueManualShotDurations = useCallback(
    (action: React.SetStateAction<Record<string, number>>) => {
      const updater: TimingUpdater<Record<string, number>> =
        typeof action === 'function' ? (action as TimingUpdater<Record<string, number>>) : () => action;
      if (!clipTrimActiveRef.current) {
        setManualShotDurations(action);
        return;
      }
      manualShotDurationsRef.current = updater(manualShotDurationsRef.current);
    },
    []
  );

  const actBlocksRef = useRef<any[]>([]);
  const sequenceBlocksRef = useRef<any[]>([]);
  const sceneBlocksRef = useRef<any[]>([]);
  const shotBlocksRef = useRef<any[]>([]);
  /** Editorial clip blocks (film); used for structure-trim child clamp + NLE track. */
  const clipBlocksRef = useRef<
    Array<{ id: string; sceneId: string; shotId?: string; startSec: number; endSec: number }>
  >([]);
  const timelineDataRef = useRef(timelineData);
  timelineDataRef.current = timelineData;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const pxPerSecRef = useRef(pxPerSec);
  pxPerSecRef.current = pxPerSec;
  const beatMagnetEnabledRef = useRef(beatMagnetEnabled);
  beatMagnetEnabledRef.current = beatMagnetEnabled;
  const beatAutosnapEnabledRef = useRef(beatAutosnapEnabled);
  beatAutosnapEnabledRef.current = beatAutosnapEnabled;
  const clipMagnetsRef = useRef(clipMagnets);
  clipMagnetsRef.current = clipMagnets;
  const trackAutosnapRef = useRef(trackAutosnap);
  trackAutosnapRef.current = trackAutosnap;
  const beatsRef = useRef(beats);
  beatsRef.current = beats;

  const MIN_CLIP_DURATION_SEC = 1; // Consistent with Beat min duration

  /** Live editorial clip bounds during NLE trim drag (pointer session). */
  const [nleClipPreview, setNleClipPreview] = useState<Record<string, { startSec: number; endSec: number }> | null>(
    null
  );
  const nleClipDragRef = useRef<{
    clipId: string;
    handle: 'left' | 'right';
    startClientX: number;
    anchorSec: number;
    origStart: number;
    origEnd: number;
    sceneId: string;
    shotId?: string;
  } | null>(null);
  const nleClipTrimCleanupRef = useRef<(() => void) | null>(null);
  const nleClipFinalBoundsRef = useRef<{ clipId: string; startSec: number; endSec: number } | null>(null);
  const clipMigrationAttemptedRef = useRef(false);
  
  // 🎯 MODAL STATE: Scene Content Editor
  const [editingSceneForModal, setEditingSceneForModal] = useState<any | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{
    kind: EditableTitleKind;
    id: string;
    value: string;
  } | null>(null);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState<{
    kind: AddNodeKind;
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingAddKind, setPendingAddKind] = useState<AddNodeKind | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  
  // 🎯 DURATION & VIEWPORT (NOW SAFE TO USE timelineData!)
  const totalDurationMin = duration / 60; // Total timeline duration in MINUTES (from prop)
  const totalDurationSec = duration; // Convert to SECONDS for timeline calculations
  
  // 📖 BOOK METRICS: Default duration for empty acts
  const DEFAULT_EMPTY_ACT_MIN = 5; // 5 minutes
  const isBookProject = (projectType ?? '').toLowerCase() === 'book';
  /** Magnete für Act/Seq/Scene/Shot: alles außer reinem Buch-Projekt (Film, Serie, …). */
  const showFilmClipMagnets = !isBookProject;
  /** Graue NLE-Spur (persistierte `clips`) — nur Film; linke Spur „Clip“ + Inhalt gemeinsam schalten. */
  const showEditorialClipTrack = !isBookProject;
  const labelByKind: Record<AddNodeKind, string> = isBookProject
    ? { act: 'Kapitel', sequence: 'Abschnitt', scene: 'Szene', shot: 'Shot' }
    : { act: 'Akt', sequence: 'Sequence', scene: 'Scene', shot: 'Shot' };
  
  // 📖 PLAYBACK STATE: Word-by-word text display (MUST BE AFTER isBookProject)
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [wordsArray, setWordsArray] = useState<string[]>([]);
  const playbackSceneStartTimeRef = useRef<number>(0); // Timeline position where current scene started
  const playbackAnimationRef = useRef<number | null>(null);
  const lastStateUpdateTimeRef = useRef<number>(0); // Throttle State updates to avoid re-render spam
  
  // 🎯 CURSOR DRAG STATE
  const [isDraggingCursor, setIsDraggingCursor] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  
  // 🎯 FULLSCREEN STATE
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 🚀 SMOOTH PLAYHEAD REFS (60fps animation via RAF)
  const playheadRulerRef = useRef<HTMLDivElement>(null);
  const playheadBeatRef = useRef<HTMLDivElement>(null);
  const playheadActRef = useRef<HTMLDivElement>(null);
  const playheadSequenceRef = useRef<HTMLDivElement>(null);
  const playheadSceneRef = useRef<HTMLDivElement>(null);
  const playheadShotRef = useRef<HTMLDivElement>(null);
  const playheadMusicRef = useRef<HTMLDivElement>(null);
  const playheadSfxRef = useRef<HTMLDivElement>(null);
  const smoothPlayheadRAF = useRef<number | null>(null);
  
  // 🚀 DELTA TIME INTERPOLATION (for smooth 60fps independent of React renders!)
  // NOTE: playbackStartTimeRef (line 166) is used by Book Playback - we need separate refs for RAF!
  const rafPlaybackStartTimeRef = useRef<number>(0); // performance.now() for RAF
  const rafPlaybackStartCurrentTimeRef = useRef<number>(0); // currentTime at RAF playback start
  const isPlayingRef = useRef<boolean>(false);
  const isBookProjectRef = useRef<boolean>(isBookProject);
  const viewStartSecRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0); // 🎯 Current playhead time (for snapping!)
  
  // 🎯 TRACK HEIGHTS (CapCut-Style with localStorage)
  const TRACK_CONSTRAINTS = {
    beat: { min: 40, max: 120, default: 64 },
    act: { min: 40, max: 100, default: 48 },
    sequence: { min: 40, max: 80, default: 40 },
    /** min wie Act/Seq — schmale Zeile möglich; volle Scene-Vorschau braucht eher default 120 */
    scene: { min: 40, max: 400, default: 120 },
    shot: { min: 32, max: 90, default: 40 },
    music: { min: 22, max: 72, default: 28 },
    sfx: { min: 22, max: 72, default: 28 },
    editorialClip: { min: 22, max: 72, default: 28 },
  };
  
  const STORAGE_KEY = `scriptony-timeline-heights-${projectId}`;
  
  const [trackHeights, setTrackHeights] = useState(() => {
    // Load from localStorage or use defaults
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            beat: parsed.beat ?? TRACK_CONSTRAINTS.beat.default,
            act: parsed.act ?? TRACK_CONSTRAINTS.act.default,
            sequence: parsed.sequence ?? TRACK_CONSTRAINTS.sequence.default,
            scene: parsed.scene ?? TRACK_CONSTRAINTS.scene.default,
            shot: parsed.shot ?? TRACK_CONSTRAINTS.shot.default,
            music: parsed.music ?? TRACK_CONSTRAINTS.music.default,
            sfx: parsed.sfx ?? TRACK_CONSTRAINTS.sfx.default,
            editorialClip: parsed.editorialClip ?? TRACK_CONSTRAINTS.editorialClip.default,
          };
        } catch (e) {
          console.error('[VideoEditorTimeline] Failed to parse stored heights:', e);
        }
      }
    }
    return {
      beat: TRACK_CONSTRAINTS.beat.default,
      act: TRACK_CONSTRAINTS.act.default,
      sequence: TRACK_CONSTRAINTS.sequence.default,
      scene: TRACK_CONSTRAINTS.scene.default,
      shot: TRACK_CONSTRAINTS.shot.default,
      music: TRACK_CONSTRAINTS.music.default,
      sfx: TRACK_CONSTRAINTS.sfx.default,
      editorialClip: TRACK_CONSTRAINTS.editorialClip.default,
    };
  });
  
  // 🎯 RESIZE STATE
  const [resizingTrack, setResizingTrack] = useState<string | null>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);
  
  // 💾 SAVE HEIGHTS TO LOCALSTORAGE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackHeights));
      console.log('[VideoEditorTimeline] 💾 Saved track heights:', trackHeights);
    }
  }, [trackHeights, STORAGE_KEY]);
  
  // 🎯 RESIZE HANDLERS
  const handleResizeStart = (track: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingTrack(track);
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = trackHeights[track as keyof typeof trackHeights];
    console.log(`[Resize] 🎯 Start resizing ${track} at Y=${e.clientY}, height=${resizeStartHeightRef.current}px`);
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingTrack) return;
    
    const deltaY = e.clientY - resizeStartYRef.current;
    const newHeight = resizeStartHeightRef.current + deltaY;
    const constraints = TRACK_CONSTRAINTS[resizingTrack as keyof typeof TRACK_CONSTRAINTS];
    const clampedHeight = Math.max(constraints.min, Math.min(constraints.max, newHeight));
    
    setTrackHeights(prev => ({
      ...prev,
      [resizingTrack]: clampedHeight
    }));
  };
  
  const handleResizeEnd = () => {
    if (resizingTrack) {
      console.log(`[Resize] ✅ Finished resizing ${resizingTrack} to ${trackHeights[resizingTrack as keyof typeof trackHeights]}px`);
    }
    setResizingTrack(null);
  };
  
  // 🎯 BEAT TRIM HANDLERS (Pointer Events + Ephemeral Engine)
  const handleTrimStart = (beatId: string, handle: 'left' | 'right', e: React.PointerEvent) => {
    if (clipTrimActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    beatTrimActiveRef.current = { id: beatId, handle };
    setTrimingBeat({ id: beatId, handle });
    trimStartXRef.current = e.clientX;

    // Pointer capture for touch/pen support — events stay on this element even outside
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    beatTrimPointerIdRef.current = e.pointerId;
    
    const beat = beats.find(b => b.id === beatId);
    if (beat) {
      if (handle === 'left') {
        trimStartSecRef.current = (beat.pct_from / 100) * duration;
      } else {
        trimStartSecRef.current = (beat.pct_to / 100) * duration;
      }
    }
    beatTrimSnapshotRef.current = beats.map((b) => ({ ...b }));
    
    // Start the ephemeral drag engine (stores snapshot in ref, zero re-renders during drag)
    trimEngine.startBeatTrim(beatId, handle, e.clientX, trimStartSecRef.current, beats as any[]);

    registerBeatTrimWindowListenersRef.current();

    console.log(`[Beat Trim] 🎯 Start trimming ${handle} handle of ${beatId} (pointer capture)`);
  };
  
  // 🧲 BEAT RIPPLE FUNCTIONS (CapCut-Style Magnetic Timeline)
  const MIN_BEAT_DURATION_SEC = 1; // Minimum beat duration (like CapCut's 0.1s, but 1s for beats)
  const SNAP_THRESHOLD_PX = 8; // Pixel-based snapping threshold (CapCut/DaVinci style!)
  
  /**
   * 🧲 SNAP TIME TO NEAREST EDGE (CapCut/DaVinci Style)
   * 
   * Snaps a time value to nearby beats or playhead based on PIXEL distance,
   * not percentage. This ensures consistent snapping behavior at all zoom levels.
   * 
   * @param rawSec - Raw time in seconds to snap
   * @param beatsArray - Array of all beats
   * @param duration - Total timeline duration in seconds
   * @param pxPerSec - Current pixels per second (for pixel-based threshold)
   * @param options - Optional: excludeBeatId, snapToPlayheadSec
   * @returns Snapped time in seconds
   */
  function snapTime(
    rawSec: number,
    beatsArray: BeatsAPI.StoryBeat[],
    duration: number,
    pxPerSec: number,
    options?: {
      excludeBeatId?: string;
      snapToPlayheadSec?: number;
    }
  ): number {
    const thresholdSec = SNAP_THRESHOLD_PX / pxPerSec;
    
    const edges: number[] = [];
    
    // Add beat edges
    for (const b of beatsArray) {
      if (options?.excludeBeatId && b.id === options.excludeBeatId) continue;
      edges.push((b.pct_from / 100) * duration);
      edges.push((b.pct_to / 100) * duration);
    }
    
    // Add playhead edge
    if (typeof options?.snapToPlayheadSec === 'number') {
      edges.push(options.snapToPlayheadSec);
    }
    
    let best = rawSec;
    let bestDelta = thresholdSec;
    
    for (const edge of edges) {
      const delta = Math.abs(rawSec - edge);
      if (delta <= bestDelta) {
        bestDelta = delta;
        best = edge;
      }
    }
    
    return Math.max(0, Math.min(duration, best));
  }

  /** Snap a timeline boundary (sec) to extra edges + 0/duration; uses same px threshold as beats when magnet is on. */
  function snapClipBoundary(
    rawSec: number,
    extraEdges: number[],
    totalDur: number,
    pxs: number,
    magnet: boolean
  ): number {
    if (!magnet) return rawSec;
    const thresholdSec = SNAP_THRESHOLD_PX / pxs;
    const edges = [...extraEdges, 0, totalDur];
    let best = rawSec;
    let bestDelta = thresholdSec;
    for (const edge of edges) {
      const d = Math.abs(rawSec - edge);
      if (d <= bestDelta) {
        bestDelta = d;
        best = edge;
      }
    }
    return Math.max(0, Math.min(totalDur, best));
  }

  function resolveActPct(
    actId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    actsOrdered: any[]
  ): { from: number; to: number } {
    const o = manual[actId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const i = actsOrdered.findIndex((a) => a.id === actId);
    const act = actsOrdered[i];
    const m = act?.metadata;
    if (typeof m?.pct_from === 'number' && typeof m?.pct_to === 'number') {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = actsOrdered.length || 1;
    return { from: (i / n) * 100, to: ((i + 1) / n) * 100 };
  }

  function resolveSeqPct(
    seqId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    seqsOrdered: any[]
  ): { from: number; to: number } {
    const o = manual[seqId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const j = seqsOrdered.findIndex((s) => s.id === seqId);
    const seq = seqsOrdered[j];
    const m = seq?.metadata;
    if (typeof m?.pct_from === 'number' && typeof m?.pct_to === 'number') {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = seqsOrdered.length || 1;
    return { from: (j / n) * 100, to: ((j + 1) / n) * 100 };
  }

  function resolveScenePct(
    sceneId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    scenesOrdered: any[]
  ): { from: number; to: number } {
    const o = manual[sceneId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const j = scenesOrdered.findIndex((s) => s.id === sceneId);
    const sc = scenesOrdered[j];
    const m = sc?.metadata;
    if (typeof m?.pct_from === 'number' && typeof m?.pct_to === 'number') {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = scenesOrdered.length || 1;
    return { from: (j / n) * 100, to: ((j + 1) / n) * 100 };
  }

  function collectClipSnapEdgesFilm(includeBeatPct: boolean): number[] {
    const out: number[] = [];
    const dur = durationRef.current;
    const b = beatsRef.current;
    if (includeBeatPct) {
      for (const beat of b) {
        out.push((beat.pct_from / 100) * dur, (beat.pct_to / 100) * dur);
      }
    }
    out.push(currentTimeRef.current);
    for (const ab of actBlocksRef.current) {
      out.push(ab.startSec, ab.endSec);
    }
    for (const sb of sequenceBlocksRef.current) {
      out.push(sb.startSec, sb.endSec);
    }
    for (const scb of sceneBlocksRef.current) {
      out.push(scb.startSec, scb.endSec);
    }
    for (const sh of shotBlocksRef.current) {
      out.push(sh.startSec, sh.endSec);
    }
    return out;
  }

  /** Autosnap master off → keine Kanten; Autosnap an + Magnet aus → nur Playhead; sonst alle Kanten. */
  function getStructureTrimSnapEdges(kind: 'act' | 'sequence' | 'scene' | 'shot'): number[] {
    const ta = trackAutosnapRef.current;
    const cm = clipMagnetsRef.current;
    if (!ta[kind]) return [];
    if (cm[kind]) return collectClipSnapEdgesFilm(true);
    return [currentTimeRef.current];
  }

  function getEditorialClipTrimSnapEdges(): number[] {
    const ta = trackAutosnapRef.current;
    const cm = clipMagnetsRef.current;
    if (!ta.editorialClip) return [];
    if (cm.editorialClip) return collectClipSnapEdgesFilm(true);
    return [currentTimeRef.current];
  }

  function snapTimePlayheadOnly(
    rawSec: number,
    _beatsArray: BeatsAPI.StoryBeat[],
    duration: number,
    pxPerSec: number,
    options?: { snapToPlayheadSec?: number }
  ): number {
    const ph = options?.snapToPlayheadSec;
    if (typeof ph !== 'number') return Math.max(0, Math.min(duration, rawSec));
    const thresholdSec = SNAP_THRESHOLD_PX / pxPerSec;
    const clamped = Math.max(0, Math.min(duration, rawSec));
    return Math.abs(clamped - ph) <= thresholdSec ? ph : clamped;
  }

  function applyClipTimingPreviewToDOM(
    kind: 'act' | 'sequence' | 'scene',
    updates: Record<string, { pct_from: number; pct_to: number }>
  ) {
    if (!updates || Object.keys(updates).length === 0) return;
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    const totalDur = durationRef.current;

    if (kind === 'act') {
      return;
    }

    if (kind === 'sequence') {
      const container = sequenceTrackContainerRef.current;
      if (!container) return;
      for (const [id, pct] of Object.entries(updates)) {
        const seqBlock = sequenceBlocksRef.current.find((b: any) => b.id === id);
        if (!seqBlock) continue;
        const actBlock = actBlocksRef.current.find((b: any) => b.id === seqBlock.actId);
        if (!actBlock) continue;
        const actDur = Math.max(0.0001, actBlock.endSec - actBlock.startSec);
        const start = actBlock.startSec + (pct.pct_from / 100) * actDur;
        const end = actBlock.startSec + (pct.pct_to / 100) * actDur;
        const el = container.querySelector(`[data-sequence-id="${id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(start - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (end - start) * pxs)}px`;
        el.style.left = '0';
      }
      return;
    }

    const container = sceneTrackContainerRef.current;
    if (!container) return;
    for (const [id, pct] of Object.entries(updates)) {
      const sceneBlock = sceneBlocksRef.current.find((b: any) => b.id === id);
      if (!sceneBlock) continue;
      const seqBlock = sequenceBlocksRef.current.find((b: any) => b.id === sceneBlock.sequenceId);
      if (!seqBlock) continue;
      const seqDur = Math.max(0.0001, seqBlock.endSec - seqBlock.startSec);
      const start = seqBlock.startSec + (pct.pct_from / 100) * seqDur;
      const end = seqBlock.startSec + (pct.pct_to / 100) * seqDur;
      const el = container.querySelector(`[data-scene-id="${id}"]`) as HTMLElement | null;
      if (!el) continue;
      el.style.transform = `translateX(${(start - viewStart) * pxs}px)`;
      el.style.width = `${Math.max(2, (end - start) * pxs)}px`;
      el.style.left = '0';
    }
  }

  /** Während Act-Trim: Sequence-/Scene-Spur live an neue Act-PCTs koppeln (global Sekunden aus Blocks). */
  function applySequenceScenePreviewFromMergedActs(
    actPctUpdates: Record<string, { pct_from: number; pct_to: number }>
  ) {
    const td = timelineDataRef.current as TimelineData | null;
    if (!td?.acts) return;
    const totalDur = durationRef.current;
    const px = 1;
    const ma = { ...manualActTimingsRef.current, ...actPctUpdates };
    const msq = manualSequenceTimingsRef.current;
    const msc = manualSceneTimingsRef.current;
    const merged: TimelineData = {
      ...td,
      acts: td.acts.map((a: any) => {
        const o = ma[a.id];
        if (!o) return a;
        return { ...a, metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      sequences: (td.sequences || []).map((s: any) => {
        const o = msq[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      scenes: (td.scenes || []).map((s: any) => {
        const o = msc[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
    };
    const seqBlocks = calculateSequenceBlocks(merged, totalDur, 0, totalDur, px, false);
    const sceneBlocks = calculateSceneBlocks(merged, totalDur, 0, totalDur, px, false);
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    const seqContainer = sequenceTrackContainerRef.current;
    const sceneContainer = sceneTrackContainerRef.current;
    if (seqContainer) {
      for (const sb of seqBlocks) {
        const el = seqContainer.querySelector(`[data-sequence-id="${sb.id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sb.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sb.endSec - sb.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
    if (sceneContainer) {
      for (const sc of sceneBlocks) {
        const el = sceneContainer.querySelector(`[data-scene-id="${sc.id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sc.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sc.endSec - sc.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
    const actTimings: FilmManualTimings = {
      manualActTimings: ma,
      manualSequenceTimings: msq,
      manualSceneTimings: msc,
      manualShotDurations: manualShotDurationsRef.current,
    };
    const shotSpans = computeFilmShotSpans(merged, totalDur, actTimings);
    const shotContainerAct = shotTrackContainerRef.current;
    if (shotContainerAct && shotSpans.length) {
      for (const sp of shotSpans) {
        const el = shotContainerAct.querySelector(`[data-shot-id="${sp.shotId}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sp.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sp.endSec - sp.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
  }

  /** Shot-Trim: DOM-Preview wie Act/Seq/Scene (Refs während Drag, kein useMemo pro Frame). */
  function applyShotTrimPreviewToDOM(sceneStartSec: number, shotIds: string[], durs: number[]) {
    const container = shotTrackContainerRef.current;
    if (!container || !shotIds.length || durs.length !== shotIds.length) return;
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    let cursor = sceneStartSec;
    for (let i = 0; i < shotIds.length; i++) {
      const dur = durs[i];
      const startSec = cursor;
      const endSec = startSec + dur;
      cursor = endSec;
      const el = container.querySelector(`[data-shot-id="${shotIds[i]}"]`) as HTMLElement | null;
      if (!el) continue;
      el.style.transform = `translateX(${(startSec - viewStart) * pxs}px)`;
      el.style.width = `${Math.max(2, (endSec - startSec) * pxs)}px`;
      el.style.left = '0';
    }
  }


  /** Sequence-Trim: Scene- und Shot-Spur live mitführen (globale Blocks + computeFilmShotSpans). */
  function applySequenceDescendantPreviewFromMergedSequences(
    sequencePctUpdates: Record<string, { pct_from: number; pct_to: number }>
  ) {
    const td = timelineDataRef.current as TimelineData | null;
    if (!td?.acts) return;
    const totalDur = durationRef.current;
    const px = 1;
    const ma = manualActTimingsRef.current;
    const msq = { ...manualSequenceTimingsRef.current, ...sequencePctUpdates };
    const msc = manualSceneTimingsRef.current;
    const merged: TimelineData = {
      ...td,
      acts: td.acts.map((a: any) => {
        const o = ma[a.id];
        if (!o) return a;
        return { ...a, metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      sequences: (td.sequences || []).map((s: any) => {
        const o = msq[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      scenes: (td.scenes || []).map((s: any) => {
        const o = msc[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
    };
    const seqBlocks = calculateSequenceBlocks(merged, totalDur, 0, totalDur, px, false);
    const sceneBlocks = calculateSceneBlocks(merged, totalDur, 0, totalDur, px, false);
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    const seqContainer = sequenceTrackContainerRef.current;
    const sceneContainer = sceneTrackContainerRef.current;
    if (seqContainer) {
      for (const sb of seqBlocks) {
        const el = seqContainer.querySelector(`[data-sequence-id="${sb.id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sb.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sb.endSec - sb.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
    if (sceneContainer) {
      for (const sc of sceneBlocks) {
        const el = sceneContainer.querySelector(`[data-scene-id="${sc.id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sc.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sc.endSec - sc.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
    const timings: FilmManualTimings = {
      manualActTimings: ma,
      manualSequenceTimings: msq,
      manualSceneTimings: msc,
      manualShotDurations: manualShotDurationsRef.current,
    };
    const spans = computeFilmShotSpans(merged, totalDur, timings);
    const shotContainer = shotTrackContainerRef.current;
    if (shotContainer && spans.length) {
      for (const sp of spans) {
        const el = shotContainer.querySelector(`[data-shot-id="${sp.shotId}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sp.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sp.endSec - sp.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
  }

  /** Scene-Trim: Shot-Spur live aus gemerged Szenen-PCT. */
  function applySceneDescendantPreviewFromMergedScenes(
    scenePctUpdates: Record<string, { pct_from: number; pct_to: number }>
  ) {
    const td = timelineDataRef.current as TimelineData | null;
    if (!td?.acts) return;
    const totalDur = durationRef.current;
    const px = 1;
    const ma = manualActTimingsRef.current;
    const msq = manualSequenceTimingsRef.current;
    const msc = { ...manualSceneTimingsRef.current, ...scenePctUpdates };
    const merged: TimelineData = {
      ...td,
      acts: td.acts.map((a: any) => {
        const o = ma[a.id];
        if (!o) return a;
        return { ...a, metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      sequences: (td.sequences || []).map((s: any) => {
        const o = msq[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
      scenes: (td.scenes || []).map((s: any) => {
        const o = msc[s.id];
        if (!o) return s;
        return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
      }),
    };
    const sceneBlocks = calculateSceneBlocks(merged, totalDur, 0, totalDur, px, false);
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    const sceneContainer = sceneTrackContainerRef.current;
    if (sceneContainer) {
      for (const sc of sceneBlocks) {
        const el = sceneContainer.querySelector(`[data-scene-id="${sc.id}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sc.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sc.endSec - sc.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
    const timings: FilmManualTimings = {
      manualActTimings: ma,
      manualSequenceTimings: msq,
      manualSceneTimings: msc,
      manualShotDurations: manualShotDurationsRef.current,
    };
    const spans = computeFilmShotSpans(merged, totalDur, timings);
    const shotContainer = shotTrackContainerRef.current;
    if (shotContainer && spans.length) {
      for (const sp of spans) {
        const el = shotContainer.querySelector(`[data-shot-id="${sp.shotId}"]`) as HTMLElement | null;
        if (!el) continue;
        el.style.transform = `translateX(${(sp.startSec - viewStart) * pxs}px)`;
        el.style.width = `${Math.max(2, (sp.endSec - sp.startSec) * pxs)}px`;
        el.style.left = '0';
      }
    }
  }

  function resetClipPreviewStyles() {
    const selectors: Array<[HTMLElement | null, string]> = [
      [actTrackContainerRef.current, '[data-act-id]'],
      [sequenceTrackContainerRef.current, '[data-sequence-id]'],
      [sceneTrackContainerRef.current, '[data-scene-id]'],
      [shotTrackContainerRef.current, '[data-shot-id]'],
    ];
    for (const [container, selector] of selectors) {
      if (!container) continue;
      const els = container.querySelectorAll(selector);
      els.forEach((el) => {
        const node = el as HTMLElement;
        node.style.transform = '';
        node.style.width = '';
        node.style.left = '';
      });
    }
  }

  function bumpActTrimReactPreviewFromRefs() {
    const td0 = timelineDataRef.current;
    if (!td0 || !('acts' in td0)) return;
    if (clipTrimActiveRef.current?.kind !== 'act') return;
    const map = buildFullActPctPreviewMapForTrim(
      td0 as TimelineData,
      manualActTimingsRef.current,
      durationRef.current,
      actTrimBlocksSnapshotRef.current
    );
    // #region agent log
    {
      const sigs = Object.values(map).map((v) => `${v.pct_from.toFixed(4)}|${v.pct_to.toFixed(4)}`);
      const actIdsList = (td0 as TimelineData).acts?.map((a: any) => a.id) ?? [];
      const duplicateActExtraRows = actIdsList.length - new Set(actIdsList).size;
      if (typeof window !== 'undefined') {
        (window as unknown as { __SCRIPTONY_LAST_ACT_TRIM_BUMP?: Record<string, unknown> }).__SCRIPTONY_LAST_ACT_TRIM_BUMP = {
          t: Date.now(),
          mapKeys: Object.keys(map).length,
          uniqPctSig: new Set(sigs).size,
          duplicateActExtraRows,
          trimingClipKind: trimingClipRef.current?.kind ?? null,
          clipTrimActiveKind: clipTrimActiveRef.current?.kind ?? null,
          actTrimLiveGate:
            trimingClipRef.current?.kind === 'act' ||
            clipTrimActiveRef.current?.kind === 'act',
          durationRef: durationRef.current,
          source: 'tick-invalidate',
        };
        try {
          if (import.meta.env.DEV) {
            sessionStorage.setItem(
              'scriptony_act_trim_debug',
              JSON.stringify({
                t: Date.now(),
                hypothesisId: 'H-DUP-ACT',
                duplicateActExtraRows,
                mapKeys: Object.keys(map).length,
                uniqPctSig: new Set(sigs).size,
              })
            );
          }
        } catch {
          /* private mode */
        }
      }
      fetch(SCRIPTONY_DEBUG_INGEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '47af82' },
        body: JSON.stringify({
          sessionId: '47af82',
          runId: 'verify',
          hypothesisId: 'H-TICK-BUMP',
          location: 'VideoEditorTimeline.tsx:bumpActTrimReactPreviewFromRefs',
          message: 'act trim bump → layout tick (map built from refs in useMemo)',
          data: {
            mapKeys: Object.keys(map).length,
            uniqPctSig: new Set(sigs).size,
            actTrimSnapLen: actTrimBlocksSnapshotRef.current?.length ?? 0,
            refMaKeys: Object.keys(manualActTimingsRef.current || {}).length,
            duplicateActExtraRows,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    setActTrimLayoutTick((t) => t + 1);
  }

  const handleTrimClipMouseDown = (
    kind: TrimKind,
    id: string,
    handle: 'left' | 'right',
    e: React.PointerEvent
  ) => {
    if (beatTrimActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const td = timelineDataRef.current;
    if (!td || !('acts' in td) || !td.acts?.length) return;
    // Book timeline: acts/sequences/scenes are positioned by word flow; film-style pct trim does not apply.
    if (isBookProject && kind !== 'shot') return;

    // Pointer capture for touch/pen support (after validation so we do not leave capture dangling)
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    trimClipSnapshotRef.current = {
      manualActTimings: { ...manualActTimingsRef.current },
      manualSequenceTimings: { ...manualSequenceTimingsRef.current },
      manualSceneTimings: { ...manualSceneTimingsRef.current },
      manualShotDurations: { ...manualShotDurationsRef.current },
    };

    const actsOrdered = [...(td.acts || [])].sort(
      (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

    if (kind === 'act') {
      const idx = actsOrdered.findIndex((a: any) => a.id === id);
      if (idx < 0) return;
      actTrimBlocksSnapshotRef.current = (actBlocksRef.current || []).map((b: any) => ({
        id: b.id,
        startSec: b.startSec,
        endSec: b.endSec,
      }));
      const sortedBlocks = [...actBlocksRef.current].sort((a: any, b: any) => a.startSec - b.startSec);
      const blockMap = new Map(sortedBlocks.map((b: any) => [b.id, b]));
      const cur = blockMap.get(id);
      if (!cur) return;
      const actIds = actsOrdered.map((a: any) => a.id);
      const actDurations = actIds.map((aid: string) => {
        const b = blockMap.get(aid);
        return b ? Math.max(MIN_CLIP_DURATION_SEC, b.endSec - b.startSec) : MIN_CLIP_DURATION_SEC;
      });
      trimClipBoundaryStartRef.current = handle === 'left' ? cur.startSec : cur.endSec;
      trimStartXRefClip.current = e.clientX;
      if (handle === 'right' && idx >= actsOrdered.length - 1) {
        trimClipCtxRef.current = {
          kind: 'act',
          actIds,
          actIndex: idx,
          actDurations,
          trimLastRight: true,
        };
        clipTrimActiveRef.current = { kind: 'act', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'act', id, handle });
        bumpActTrimReactPreviewFromRefs();
        return;
      }
      if (handle === 'left' && idx === 0) {
        trimClipCtxRef.current = {
          kind: 'act',
          actIds,
          actIndex: idx,
          actDurations,
          trimFirstLeft: true,
          anchorEndFirstSec: cur.endSec,
        };
        clipTrimActiveRef.current = { kind: 'act', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'act', id, handle });
        bumpActTrimReactPreviewFromRefs();
        return;
      }
      trimClipCtxRef.current = {
        kind: 'act',
        actIds,
        actIndex: idx,
        actDurations,
      };
      clipTrimActiveRef.current = { kind: 'act', id, handle };
      registerClipTrimWindowListenersRef.current();
      setTrimingClip({ kind: 'act', id, handle });
      bumpActTrimReactPreviewFromRefs();
      return;
    }

    if (kind === 'sequence') {
      const seq = (td.sequences || []).find((s: any) => s.id === id);
      if (!seq) return;
      const actId = seq.actId;
      const actBlock = actBlocksRef.current.find((b: any) => b.id === actId);
      if (!actBlock) return;
      const seqsOrdered = [...(td.sequences || [])]
        .filter((s: any) => s.actId === actId)
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const idx = seqsOrdered.findIndex((s: any) => s.id === id);
      if (idx < 0) return;
      const sb = sequenceBlocksRef.current.find((b: any) => b.id === id);
      if (!sb) return;
      const seqIds = seqsOrdered.map((s: any) => s.id);
      const sequenceDurations = seqIds.map((sid: string) => {
        const b = sequenceBlocksRef.current.find((x: any) => x.id === sid);
        return b ? Math.max(MIN_CLIP_DURATION_SEC, b.endSec - b.startSec) : MIN_CLIP_DURATION_SEC;
      });
      trimClipBoundaryStartRef.current = handle === 'left' ? sb.startSec : sb.endSec;
      trimStartXRefClip.current = e.clientX;
      if (handle === 'right' && idx >= seqsOrdered.length - 1) {
        trimClipCtxRef.current = {
          kind: 'sequence',
          sequenceIds: seqIds,
          seqIndex: idx,
          actStartSec: actBlock.startSec,
          actDurSec: Math.max(0, actBlock.endSec - actBlock.startSec),
          sequenceDurations,
          trimLastRight: true,
        };
        clipTrimActiveRef.current = { kind: 'sequence', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'sequence', id, handle });
        return;
      }
      if (handle === 'left' && idx === 0) {
        trimClipCtxRef.current = {
          kind: 'sequence',
          sequenceIds: seqIds,
          seqIndex: idx,
          actStartSec: actBlock.startSec,
          actDurSec: Math.max(0, actBlock.endSec - actBlock.startSec),
          sequenceDurations,
          trimFirstLeft: true,
          anchorEndFirstSec: sb.endSec,
        };
        clipTrimActiveRef.current = { kind: 'sequence', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'sequence', id, handle });
        return;
      }
      trimClipCtxRef.current = {
        kind: 'sequence',
        sequenceIds: seqIds,
        seqIndex: idx,
        actStartSec: actBlock.startSec,
        actDurSec: Math.max(0, actBlock.endSec - actBlock.startSec),
        sequenceDurations,
      };
      clipTrimActiveRef.current = { kind: 'sequence', id, handle };
      registerClipTrimWindowListenersRef.current();
      setTrimingClip({ kind: 'sequence', id, handle });
      return;
    }

    if (kind === 'scene') {
      const scene = (td.scenes || []).find((s: any) => s.id === id);
      if (!scene) return;
      const seqId = scene.sequenceId;
      const seqBlock = sequenceBlocksRef.current.find((b: any) => b.id === seqId);
      if (!seqBlock) return;
      const scenesOrdered = [...(td.scenes || [])]
        .filter((s: any) => s.sequenceId === seqId)
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const idx = scenesOrdered.findIndex((s: any) => s.id === id);
      if (idx < 0) return;
      const scb = sceneBlocksRef.current.find((b: any) => b.id === id);
      if (!scb) return;
      const sceneIds = scenesOrdered.map((s: any) => s.id);
      const sceneDurations = sceneIds.map((sid: string) => {
        const b = sceneBlocksRef.current.find((x: any) => x.id === sid);
        return b ? Math.max(MIN_CLIP_DURATION_SEC, b.endSec - b.startSec) : MIN_CLIP_DURATION_SEC;
      });
      trimClipBoundaryStartRef.current = handle === 'left' ? scb.startSec : scb.endSec;
      trimStartXRefClip.current = e.clientX;
      if (handle === 'right' && idx >= scenesOrdered.length - 1) {
        trimClipCtxRef.current = {
          kind: 'scene',
          sceneIds,
          sceneIndex: idx,
          seqStartSec: seqBlock.startSec,
          seqDurSec: Math.max(0, seqBlock.endSec - seqBlock.startSec),
          sceneDurations,
          trimLastRight: true,
        };
        clipTrimActiveRef.current = { kind: 'scene', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'scene', id, handle });
        return;
      }
      if (handle === 'left' && idx === 0) {
        trimClipCtxRef.current = {
          kind: 'scene',
          sceneIds,
          sceneIndex: idx,
          seqStartSec: seqBlock.startSec,
          seqDurSec: Math.max(0, seqBlock.endSec - seqBlock.startSec),
          sceneDurations,
          trimFirstLeft: true,
          anchorEndFirstSec: scb.endSec,
        };
        clipTrimActiveRef.current = { kind: 'scene', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'scene', id, handle });
        return;
      }
      trimClipCtxRef.current = {
        kind: 'scene',
        sceneIds,
        sceneIndex: idx,
        seqStartSec: seqBlock.startSec,
        seqDurSec: Math.max(0, seqBlock.endSec - seqBlock.startSec),
        sceneDurations,
      };
      clipTrimActiveRef.current = { kind: 'scene', id, handle };
      registerClipTrimWindowListenersRef.current();
      setTrimingClip({ kind: 'scene', id, handle });
      return;
    }

    if (kind === 'shot') {
      const shotsList =
        "shots" in td && Array.isArray(td.shots) ? td.shots : [];
      const shRow = shotsList.find((sh: any) => sh.id === id);
      const sceneId = shRow?.sceneId || shRow?.scene_id;
      if (!sceneId) return;
      const sceneBlock = sceneBlocksRef.current.find((b: any) => b.id === sceneId);
      if (!sceneBlock) return;
      const blocksInScene = shotBlocksRef.current
        .filter(
          (b: any) =>
            ((b as any).sceneId || (b as any).scene_id) === sceneId
        )
        .sort((a: any, b: any) => a.startSec - b.startSec);
      const idx = blocksInScene.findIndex((b: any) => b.id === id);
      if (idx < 0) return;
      const n = blocksInScene.length;
      const shb = blocksInScene[idx];
      const durs = blocksInScene.map((b: any) => Math.max(0, b.endSec - b.startSec));
      const sceneStartSec = sceneBlock.startSec;
      const sceneDurSec = Math.max(0, sceneBlock.endSec - sceneBlock.startSec);

      if (handle === 'right' && idx === n - 1) {
        trimClipBoundaryStartRef.current = shb.endSec;
        trimStartXRefClip.current = e.clientX;
        trimClipCtxRef.current = {
          kind: 'shot',
          shotIds: blocksInScene.map((b: any) => b.id),
          shotIndex: idx,
          sceneStartSec,
          sceneDurSec,
          shotDurations: durs,
          trimLastRight: true,
        };
        clipTrimActiveRef.current = { kind: 'shot', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'shot', id, handle });
        return;
      }
      if (handle === 'left' && idx === 0) {
        trimClipBoundaryStartRef.current = shb.startSec;
        trimStartXRefClip.current = e.clientX;
        trimClipCtxRef.current = {
          kind: 'shot',
          shotIds: blocksInScene.map((b: any) => b.id),
          shotIndex: idx,
          sceneStartSec,
          sceneDurSec,
          shotDurations: durs,
          trimFirstLeft: true,
          anchorEndFirstSec: shb.endSec,
        };
        clipTrimActiveRef.current = { kind: 'shot', id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: 'shot', id, handle });
        return;
      }
      trimClipBoundaryStartRef.current = handle === 'left' ? shb.startSec : shb.endSec;
      trimStartXRefClip.current = e.clientX;
      trimClipCtxRef.current = {
        kind: 'shot',
        shotIds: blocksInScene.map((b: any) => b.id),
        shotIndex: idx,
        sceneStartSec,
        sceneDurSec,
        shotDurations: durs,
      };
      clipTrimActiveRef.current = { kind: 'shot', id, handle };
      registerClipTrimWindowListenersRef.current();
      setTrimingClip({ kind: 'shot', id, handle });
    }
  };

  /**
   * Structure trim (film): outer handles use neighbor-pair segment budgets + pct map
   * (buildPctMapFromOrderedSegmentSeconds); inner handles move only one boundary between two siblings.
   * Parent expansion for overflow is applied on commit via timeline-trim-parent-sync; inner drag uses
   * descendant live preview only (no expansion of parents during the drag).
   */
  const handleTrimClipMove = (e: PointerEvent) => {
    const clip = clipTrimActiveRef.current ?? trimingClipRef.current;
    const ctx = trimClipCtxRef.current;
    if (!clip || !ctx || ctx.kind !== clip.kind) return;

    const dTotal = durationRef.current;
    const pxs = pxPerSecRef.current;
    const snapEdges = getStructureTrimSnapEdges(clip.kind);
    const magnet = snapEdges.length > 0;
    const deltaSec = (e.clientX - trimStartXRefClip.current) / pxs;
    let newBoundarySec = trimClipBoundaryStartRef.current + deltaSec;
    const td = timelineDataRef.current;
    if (!td || !('acts' in td)) return;
    if (isBookProjectRef.current && ctx.kind !== 'shot') return;

    if (ctx.kind === 'act' && ctx.actIds && ctx.actIndex !== undefined) {
      const actsOrdered = [...(td.acts || [])].sort(
        (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
      const idx = ctx.actIndex;
      const livePctMapForMove = buildFullActPctPreviewMapForTrim(
        td as TimelineData,
        manualActTimingsRef.current,
        dTotal,
        actTrimBlocksSnapshotRef.current
      );
      const actBlocksLive = mergeActBlocksWithTrimLivePct(
        actBlocksRef.current,
        livePctMapForMove,
        dTotal
      );
      const sortedBlocks = [...ctx.actIds]
        .map((aid: string) => actBlocksLive.find((x: any) => x.id === aid))
        .filter(
          (b): b is { id: string; startSec: number; endSec: number } =>
            b != null && Number.isFinite(b.startSec) && Number.isFinite(b.endSec)
        )
        .sort((a, b) => a.startSec - b.startSec);
      // #region agent log
      if (sortedBlocks.length !== ctx.actIds.length) {
        fetch(SCRIPTONY_DEBUG_INGEST, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '47af82' },
          body: JSON.stringify({
            sessionId: '47af82',
            runId: 'verify',
            hypothesisId: 'H-SORTED-MISS',
            location: 'VideoEditorTimeline.tsx:handleTrimClipMove:act',
            message: 'act trim sortedBlocks shorter than ctx.actIds',
            data: { want: ctx.actIds.length, got: sortedBlocks.length, actIds: ctx.actIds.slice(0, 8) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      if (ctx.trimLastRight || ctx.trimFirstLeft) {
        const ids = ctx.actIds;
        const n = ids.length;
        const minD = MIN_CLIP_DURATION_SEC;
        let durs =
          ctx.actDurations && ctx.actDurations.length === n
            ? [...ctx.actDurations]
            : ids.map((aid) => {
                const b = sortedBlocks.find((x: any) => x.id === aid);
                return b ? Math.max(minD, b.endSec - b.startSec) : minD;
              });
        const totalDur = dTotal;
        if (ctx.trimLastRight) {
          const lastStart = durs.slice(0, n - 1).reduce((s, x) => s + x, 0);
          let newEnd = newBoundarySec;
          newEnd = Math.max(lastStart + minD, Math.min(totalDur, newEnd));
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(lastStart + minD, Math.min(totalDur, newEnd));
          }
          let newLast = newEnd - lastStart;
          if (n > 1) {
            const pairStart = durs.slice(0, n - 2).reduce((s, x) => s + x, 0);
            const leftHullEnd = maxDescendantEndInAct(
              ids[n - 2],
              td as TimelineData,
              actBlocksLive,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInAct(
              ids[n - 1],
              td as TimelineData,
              actBlocksLive,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newLast = clampOuterLastDurationToChildHull({
              desiredLastDur: newLast,
              pairStartSec: pairStart,
              totalEndSec: totalDur,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustLastPair(durs, newLast, totalDur, minD);
        } else if (ctx.trimFirstLeft && ctx.anchorEndFirstSec !== undefined) {
          let newStart = newBoundarySec;
          const anchor = ctx.anchorEndFirstSec;
          newStart = Math.max(0, Math.min(anchor - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(0, Math.min(anchor - minD, newStart));
          }
          let newFirst = Math.max(minD, anchor - newStart);
          if (n > 1) {
            const pairEnd = durs[0] + durs[1];
            const leftHullEnd = maxDescendantEndInAct(
              ids[0],
              td as TimelineData,
              actBlocksLive,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInAct(
              ids[1],
              td as TimelineData,
              actBlocksLive,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newFirst = clampOuterFirstDurationToChildHull({
              desiredFirstDur: newFirst,
              totalStartSec: 0,
              pairEndSec: pairEnd,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustFirstPair(durs, newFirst, totalDur, minD);
        }
        trimClipCtxRef.current = { ...ctx, actDurations: durs };
        const next = buildPctMapFromOrderedSegmentSeconds({
          ids,
          segmentSeconds: durs,
          budgetSec: totalDur,
        });
        // #region agent log
        fetch(SCRIPTONY_DEBUG_INGEST, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '47af82' },
          body: JSON.stringify({
            sessionId: '47af82',
            runId: 'post-fix',
            hypothesisId: 'H4',
            location: 'VideoEditorTimeline.tsx:handleTrimClipMove:act-outer',
            message: 'outer act trim pct map',
            data: {
              n: ids.length,
              dursSum: durs.reduce((a, x) => a + x, 0),
              durs: durs.slice(0, 12),
              nextKeys: Object.keys(next).length,
              nextSample: Object.entries(next).slice(0, 4),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const { frozenSeq, frozenScene } = snapshotSeqSceneFrozenBoundsFromRefs(
          sequenceBlocksRef.current,
          sceneBlocksRef.current
        );
        queueManualActTimings((prev) => {
          const maNext = { ...prev, ...next };
          const preserved = preserveSequenceSceneTimingsAfterActPctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: maNext,
            msq: manualSequenceTimingsRef.current,
            msc: manualSceneTimingsRef.current,
            frozenSeq,
            frozenScene,
            affectedActIds: Object.keys(next),
          });
          manualSequenceTimingsRef.current = preserved.msq;
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            bumpActTrimReactPreviewFromRefs();
            applySequenceScenePreviewFromMergedActs(next);
          });
          return maNext;
        });
        return;
      }
      const prevId = ctx.actIds[idx - 1];
      const curId = ctx.actIds[idx];
      const prevB = sortedBlocks.find((b: any) => b.id === prevId);
      const curB = sortedBlocks.find((b: any) => b.id === curId);
      if (!prevB || !curB) return;

      const actTrimFrozen = snapshotSeqSceneFrozenBoundsFromRefs(
        sequenceBlocksRef.current,
        sceneBlocksRef.current
      );

      if (clip.handle === 'left') {
        const minB = prevB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = curB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const tdF = td as TimelineData;
          const maxL = maxDescendantEndInAct(
            prevId,
            tdF,
            actBlocksLive,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInAct(
            curId,
            tdF,
            actBlocksLive,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = (newBoundarySec / dTotal) * 100;
        queueManualActTimings((prev) => {
          const prevP = resolveActPct(prevId, prev, actsOrdered);
          const curP = resolveActPct(curId, prev, actsOrdered);
          const next = {
            ...prev,
            [prevId]: { pct_from: prevP.from, pct_to: newPct },
            [curId]: { pct_from: newPct, pct_to: curP.to },
          };
          const preserved = preserveSequenceSceneTimingsAfterActPctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: next,
            msq: manualSequenceTimingsRef.current,
            msc: manualSceneTimingsRef.current,
            frozenSeq: actTrimFrozen.frozenSeq,
            frozenScene: actTrimFrozen.frozenScene,
            affectedActIds: [prevId, curId],
          });
          manualSequenceTimingsRef.current = preserved.msq;
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            // #region agent log
            fetch(SCRIPTONY_DEBUG_INGEST, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '47af82' },
              body: JSON.stringify({
                sessionId: '47af82',
                runId: 'post-fix',
                hypothesisId: 'H3',
                location: 'VideoEditorTimeline.tsx:handleTrimClipMove:act-inner-left',
                message: 'inner act boundary trim (left handle) preview keys',
                data: {
                  prevId,
                  curId,
                  newPct,
                  prevKeysInRef: Object.keys(manualActTimingsRef.current || {}).length,
                },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion
            bumpActTrimReactPreviewFromRefs();
            applySequenceScenePreviewFromMergedActs(next);
          });
          return next;
        });
      } else {
        const nextId = ctx.actIds[idx + 1];
        const nextB = sortedBlocks.find((b: any) => b.id === nextId);
        if (!nextB) return;
        const minB = curB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = nextB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const tdF = td as TimelineData;
          const maxL = maxDescendantEndInAct(
            curId,
            tdF,
            actBlocksLive,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInAct(
            nextId,
            tdF,
            actBlocksLive,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = (newBoundarySec / dTotal) * 100;
        queueManualActTimings((prev) => {
          const curP = resolveActPct(curId, prev, actsOrdered);
          const nextP = resolveActPct(nextId, prev, actsOrdered);
          const next = {
            ...prev,
            [curId]: { pct_from: curP.from, pct_to: newPct },
            [nextId]: { pct_from: newPct, pct_to: nextP.to },
          };
          const preserved = preserveSequenceSceneTimingsAfterActPctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: next,
            msq: manualSequenceTimingsRef.current,
            msc: manualSceneTimingsRef.current,
            frozenSeq: actTrimFrozen.frozenSeq,
            frozenScene: actTrimFrozen.frozenScene,
            affectedActIds: [curId, nextId],
          });
          manualSequenceTimingsRef.current = preserved.msq;
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            bumpActTrimReactPreviewFromRefs();
            applySequenceScenePreviewFromMergedActs(next);
          });
          return next;
        });
      }
      return;
    }

    if (
      ctx.kind === 'sequence' &&
      ctx.sequenceIds &&
      ctx.seqIndex !== undefined &&
      ctx.actStartSec !== undefined &&
      ctx.actDurSec !== undefined
    ) {
      const actStart = ctx.actStartSec;
      const actDur = Math.max(1e-6, ctx.actDurSec);
      const seqsOrdered = [...(td.sequences || [])]
        .filter((s: any) => ctx.sequenceIds!.includes(s.id))
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const idx = ctx.seqIndex;
      const sortedBlocks = [...sequenceBlocksRef.current].sort(
        (a: any, b: any) => a.startSec - b.startSec
      );
      if (ctx.trimLastRight || ctx.trimFirstLeft) {
        const ids = ctx.sequenceIds;
        const n = ids.length;
        const minD = MIN_CLIP_DURATION_SEC;
        let durs =
          ctx.sequenceDurations && ctx.sequenceDurations.length === n
            ? [...ctx.sequenceDurations]
            : ids.map((sid) => {
                const b = sortedBlocks.find((x: any) => x.id === sid);
                return b ? Math.max(minD, b.endSec - b.startSec) : minD;
              });
        if (ctx.trimLastRight) {
          const lastStartRel = durs.slice(0, n - 1).reduce((s, x) => s + x, 0);
          const lastStart = actStart + lastStartRel;
          let newEnd = newBoundarySec;
          newEnd = Math.max(lastStart + minD, Math.min(actStart + actDur, newEnd));
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(lastStart + minD, Math.min(actStart + actDur, newEnd));
          }
          let newLast = newEnd - lastStart;
          if (n > 1) {
            const pairStart = actStart + durs.slice(0, n - 2).reduce((s, x) => s + x, 0);
            const leftHullEnd = maxDescendantEndInSequence(
              ids[n - 2],
              td as TimelineData,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInSequence(
              ids[n - 1],
              td as TimelineData,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newLast = clampOuterLastDurationToChildHull({
              desiredLastDur: newLast,
              pairStartSec: pairStart,
              totalEndSec: actStart + actDur,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustLastPair(durs, newLast, actDur, minD);
        } else if (ctx.trimFirstLeft && ctx.anchorEndFirstSec !== undefined) {
          let newStart = newBoundarySec;
          const anchor = ctx.anchorEndFirstSec;
          newStart = Math.max(actStart, Math.min(anchor - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(actStart, Math.min(anchor - minD, newStart));
          }
          let newFirst = Math.max(minD, anchor - newStart);
          if (n > 1) {
            const pairEnd = actStart + durs[0] + durs[1];
            const leftHullEnd = maxDescendantEndInSequence(
              ids[0],
              td as TimelineData,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInSequence(
              ids[1],
              td as TimelineData,
              sequenceBlocksRef.current,
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newFirst = clampOuterFirstDurationToChildHull({
              desiredFirstDur: newFirst,
              totalStartSec: actStart,
              pairEndSec: pairEnd,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustFirstPair(durs, newFirst, actDur, minD);
        }
        trimClipCtxRef.current = { ...ctx, sequenceDurations: durs };
        const next = buildPctMapFromOrderedSegmentSeconds({
          ids,
          segmentSeconds: durs,
          budgetSec: actDur,
        });
        const frozenSceneOuter = snapshotSceneFrozenBoundsFromRefs(sceneBlocksRef.current);
        queueManualSequenceTimings((prev) => {
          const msNext = { ...prev, ...next };
          const preserved = preserveSceneTimingsAfterSequencePctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: manualActTimingsRef.current,
            msq: msNext,
            msc: manualSceneTimingsRef.current,
            frozenScene: frozenSceneOuter,
            affectedSequenceIds: Object.keys(next),
          });
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            applyClipTimingPreviewToDOM('sequence', next);
            applySequenceDescendantPreviewFromMergedSequences(next);
          });
          return msNext;
        });
        return;
      }

      if (clip.handle === 'left') {
        const prevId = ctx.sequenceIds[idx - 1];
        const curId = ctx.sequenceIds[idx];
        const prevB = sortedBlocks.find((b: any) => b.id === prevId);
        const curB = sortedBlocks.find((b: any) => b.id === curId);
        if (!prevB || !curB) return;

        const seqTrimFrozenScene = snapshotSceneFrozenBoundsFromRefs(sceneBlocksRef.current);

        const minB = prevB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = curB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const tdF = td as TimelineData;
          const maxL = maxDescendantEndInSequence(
            prevId,
            tdF,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInSequence(
            curId,
            tdF,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = ((newBoundarySec - actStart) / actDur) * 100;
        queueManualSequenceTimings((prev) => {
          const prevP = resolveSeqPct(prevId, prev, seqsOrdered);
          const curP = resolveSeqPct(curId, prev, seqsOrdered);
          const next = {
            ...prev,
            [prevId]: { pct_from: prevP.from, pct_to: newPct },
            [curId]: { pct_from: newPct, pct_to: curP.to },
          };
          const preserved = preserveSceneTimingsAfterSequencePctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: manualActTimingsRef.current,
            msq: next,
            msc: manualSceneTimingsRef.current,
            frozenScene: seqTrimFrozenScene,
            affectedSequenceIds: [prevId, curId],
          });
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            applyClipTimingPreviewToDOM('sequence', {
            [prevId]: next[prevId],
            [curId]: next[curId],
          });
            applySequenceDescendantPreviewFromMergedSequences(next);
          });
          return next;
        });
      } else {
        const curId = ctx.sequenceIds[idx];
        const nextId = ctx.sequenceIds[idx + 1];
        const curB = sortedBlocks.find((b: any) => b.id === curId);
        const nextB = sortedBlocks.find((b: any) => b.id === nextId);
        if (!curB || !nextB) return;

        const seqTrimFrozenSceneRight = snapshotSceneFrozenBoundsFromRefs(sceneBlocksRef.current);

        const minB = curB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = nextB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const tdF = td as TimelineData;
          const maxL = maxDescendantEndInSequence(
            curId,
            tdF,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInSequence(
            nextId,
            tdF,
            sequenceBlocksRef.current,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = ((newBoundarySec - actStart) / actDur) * 100;
        queueManualSequenceTimings((prev) => {
          const curP = resolveSeqPct(curId, prev, seqsOrdered);
          const nextP = resolveSeqPct(nextId, prev, seqsOrdered);
          const next = {
            ...prev,
            [curId]: { pct_from: curP.from, pct_to: newPct },
            [nextId]: { pct_from: newPct, pct_to: nextP.to },
          };
          const preserved = preserveSceneTimingsAfterSequencePctChange({
            td: td as TimelineData,
            duration: dTotal,
            ma: manualActTimingsRef.current,
            msq: next,
            msc: manualSceneTimingsRef.current,
            frozenScene: seqTrimFrozenSceneRight,
            affectedSequenceIds: [curId, nextId],
          });
          manualSceneTimingsRef.current = preserved.msc;
          trimEngine.scheduleRAF(() => {
            applyClipTimingPreviewToDOM('sequence', {
            [curId]: next[curId],
            [nextId]: next[nextId],
          });
            applySequenceDescendantPreviewFromMergedSequences(next);
          });
          return next;
        });
      }
      return;
    }

    if (
      ctx.kind === 'scene' &&
      ctx.sceneIds &&
      ctx.sceneIndex !== undefined &&
      ctx.seqStartSec !== undefined &&
      ctx.seqDurSec !== undefined
    ) {
      const seqStart = ctx.seqStartSec;
      const seqDur = Math.max(1e-6, ctx.seqDurSec);
      const scenesOrdered = [...(td.scenes || [])]
        .filter((s: any) => ctx.sceneIds!.includes(s.id))
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      const idx = ctx.sceneIndex;
      const sortedBlocks = [...sceneBlocksRef.current].sort(
        (a: any, b: any) => a.startSec - b.startSec
      );
      if (ctx.trimLastRight || ctx.trimFirstLeft) {
        const ids = ctx.sceneIds;
        const n = ids.length;
        const minD = MIN_CLIP_DURATION_SEC;
        let durs =
          ctx.sceneDurations && ctx.sceneDurations.length === n
            ? [...ctx.sceneDurations]
            : ids.map((sid) => {
                const b = sortedBlocks.find((x: any) => x.id === sid);
                return b ? Math.max(minD, b.endSec - b.startSec) : minD;
              });
        if (ctx.trimLastRight) {
          const lastStartRel = durs.slice(0, n - 1).reduce((s, x) => s + x, 0);
          const lastStart = seqStart + lastStartRel;
          let newEnd = newBoundarySec;
          newEnd = Math.max(lastStart + minD, Math.min(seqStart + seqDur, newEnd));
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(lastStart + minD, Math.min(seqStart + seqDur, newEnd));
          }
          let newLast = newEnd - lastStart;
          if (n > 1) {
            const pairStart = seqStart + durs.slice(0, n - 2).reduce((s, x) => s + x, 0);
            const leftHullEnd = maxDescendantEndInScene(
              ids[n - 2],
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInScene(
              ids[n - 1],
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newLast = clampOuterLastDurationToChildHull({
              desiredLastDur: newLast,
              pairStartSec: pairStart,
              totalEndSec: seqStart + seqDur,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustLastPair(durs, newLast, seqDur, minD);
        } else if (ctx.trimFirstLeft && ctx.anchorEndFirstSec !== undefined) {
          let newStart = newBoundarySec;
          const anchor = ctx.anchorEndFirstSec;
          newStart = Math.max(seqStart, Math.min(anchor - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(seqStart, Math.min(anchor - minD, newStart));
          }
          let newFirst = Math.max(minD, anchor - newStart);
          if (n > 1) {
            const pairEnd = seqStart + durs[0] + durs[1];
            const leftHullEnd = maxDescendantEndInScene(
              ids[0],
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            const rightHullStart = minDescendantStartInScene(
              ids[1],
              sceneBlocksRef.current,
              shotBlocksRef.current,
              clipBlocksRef.current
            );
            newFirst = clampOuterFirstDurationToChildHull({
              desiredFirstDur: newFirst,
              totalStartSec: seqStart,
              pairEndSec: pairEnd,
              minD,
              leftHullEndSec: leftHullEnd,
              rightHullStartSec: rightHullStart,
            });
          }
          durs = outerTrimAdjustFirstPair(durs, newFirst, seqDur, minD);
        }
        trimClipCtxRef.current = { ...ctx, sceneDurations: durs };
        const next = buildPctMapFromOrderedSegmentSeconds({
          ids,
          segmentSeconds: durs,
          budgetSec: seqDur,
        });
        trimEngine.scheduleRAF(() => {
          applyClipTimingPreviewToDOM('scene', next);
          applySceneDescendantPreviewFromMergedScenes(next);
        });
        queueManualSceneTimings((prev) => ({ ...prev, ...next }));
        return;
      }

      if (clip.handle === 'left') {
        const prevId = ctx.sceneIds[idx - 1];
        const curId = ctx.sceneIds[idx];
        const prevB = sortedBlocks.find((b: any) => b.id === prevId);
        const curB = sortedBlocks.find((b: any) => b.id === curId);
        if (!prevB || !curB) return;
        const minB = prevB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = curB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const maxL = maxDescendantEndInScene(
            prevId,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInScene(
            curId,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = ((newBoundarySec - seqStart) / seqDur) * 100;
        queueManualSceneTimings((prev) => {
          const prevP = resolveScenePct(prevId, prev, scenesOrdered);
          const curP = resolveScenePct(curId, prev, scenesOrdered);
          const next = {
            ...prev,
            [prevId]: { pct_from: prevP.from, pct_to: newPct },
            [curId]: { pct_from: newPct, pct_to: curP.to },
          };
          trimEngine.scheduleRAF(() => {
            applyClipTimingPreviewToDOM('scene', {
            [prevId]: next[prevId],
            [curId]: next[curId],
          });
            applySceneDescendantPreviewFromMergedScenes(next);
          });
          return next;
        });
      } else {
        const curId = ctx.sceneIds[idx];
        const nextId = ctx.sceneIds[idx + 1];
        const curB = sortedBlocks.find((b: any) => b.id === curId);
        const nextB = sortedBlocks.find((b: any) => b.id === nextId);
        if (!curB || !nextB) return;
        const minB = curB.startSec + MIN_CLIP_DURATION_SEC;
        const maxB = nextB.endSec - MIN_CLIP_DURATION_SEC;
        newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        if (magnet) {
          newBoundarySec = snapClipBoundary(newBoundarySec, snapEdges, dTotal, pxs, true);
          newBoundarySec = Math.max(minB, Math.min(maxB, newBoundarySec));
        }
        {
          const maxL = maxDescendantEndInScene(
            curId,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          const minR = minDescendantStartInScene(
            nextId,
            sceneBlocksRef.current,
            shotBlocksRef.current,
            clipBlocksRef.current
          );
          newBoundarySec = clampBoundaryToChildren(newBoundarySec, minB, maxB, maxL, minR);
        }
        const newPct = ((newBoundarySec - seqStart) / seqDur) * 100;
        queueManualSceneTimings((prev) => {
          const curP = resolveScenePct(curId, prev, scenesOrdered);
          const nextP = resolveScenePct(nextId, prev, scenesOrdered);
          const next = {
            ...prev,
            [curId]: { pct_from: curP.from, pct_to: newPct },
            [nextId]: { pct_from: newPct, pct_to: nextP.to },
          };
          trimEngine.scheduleRAF(() => {
            applyClipTimingPreviewToDOM('scene', {
            [curId]: next[curId],
            [nextId]: next[nextId],
          });
            applySceneDescendantPreviewFromMergedScenes(next);
          });
          return next;
        });
      }
      return;
    }

    if (
      ctx.kind === 'shot' &&
      ctx.shotIds &&
      ctx.sceneStartSec !== undefined &&
      ctx.sceneDurSec !== undefined &&
      ctx.shotDurations
    ) {
      const sceneStart = ctx.sceneStartSec;
      const sceneDur = ctx.sceneDurSec;
      const ids = ctx.shotIds;
      const minD = MIN_CLIP_DURATION_SEC;
      const n = ids.length;

      const commitShotDurs = (durs: number[]) => {
        trimClipCtxRef.current = { ...ctx, shotDurations: durs };
        queueManualShotDurations((prev) => {
          const next = { ...prev };
          ids.forEach((sid, idx) => {
            next[sid] = durs[idx];
          });
          return next;
        });
        trimEngine.scheduleRAF(() => {
          const c = trimClipCtxRef.current;
          if (
            !c ||
            c.kind !== 'shot' ||
            !c.shotIds ||
            !c.shotDurations ||
            c.sceneStartSec === undefined
          ) {
            return;
          }
          applyShotTrimPreviewToDOM(c.sceneStartSec, c.shotIds, c.shotDurations);
        });
      };

      if (ctx.trimLastRight) {
        let durs = [...ctx.shotDurations];
        if (n === 1) {
          const lastStart = sceneStart;
          let newEnd = newBoundarySec;
          newEnd = Math.max(lastStart + minD, Math.min(sceneStart + sceneDur, newEnd));
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(lastStart + minD, Math.min(sceneStart + sceneDur, newEnd));
          }
          const rightHullEnd = maxClipEndForShot(ids[0], clipBlocksRef.current);
          if (rightHullEnd != null) {
            newEnd = Math.max(rightHullEnd, newEnd);
          }
          durs[0] = newEnd - lastStart;
        } else {
          const lastStartRel = durs.slice(0, n - 1).reduce((s, x) => s + x, 0);
          const lastStart = sceneStart + lastStartRel;
          let newEnd = newBoundarySec;
          newEnd = Math.max(lastStart + minD, Math.min(sceneStart + sceneDur, newEnd));
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(lastStart + minD, Math.min(sceneStart + sceneDur, newEnd));
          }
          let newLastDur = newEnd - lastStart;
          newLastDur = clampOuterLastDurationToChildHull({
            desiredLastDur: newLastDur,
            pairStartSec: sceneStart + durs.slice(0, n - 2).reduce((s, x) => s + x, 0),
            totalEndSec: sceneStart + sceneDur,
            minD,
            leftHullEndSec: maxClipEndForShot(ids[n - 2], clipBlocksRef.current),
            rightHullStartSec: minClipStartForShot(ids[n - 1], clipBlocksRef.current),
          });
          durs = outerTrimAdjustLastPair(durs, newLastDur, sceneDur, minD);
        }
        commitShotDurs(durs);
        return;
      }

      if (ctx.trimFirstLeft && ctx.anchorEndFirstSec !== undefined) {
        const anchorEnd = ctx.anchorEndFirstSec;
        let durs = [...ctx.shotDurations];
        if (n === 1) {
          let newStart = newBoundarySec;
          newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          }
          const leftHullStart = minClipStartForShot(ids[0], clipBlocksRef.current);
          if (leftHullStart != null) {
            newStart = Math.min(leftHullStart, newStart);
          }
          durs[0] = anchorEnd - newStart;
        } else {
          let newStart = newBoundarySec;
          newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          }
          let newFirstDur = Math.max(minD, anchorEnd - newStart);
          newFirstDur = clampOuterFirstDurationToChildHull({
            desiredFirstDur: newFirstDur,
            totalStartSec: sceneStart,
            pairEndSec: sceneStart + durs[0] + durs[1],
            minD,
            leftHullEndSec: maxClipEndForShot(ids[0], clipBlocksRef.current),
            rightHullStartSec: minClipStartForShot(ids[1], clipBlocksRef.current),
          });
          durs = outerTrimAdjustFirstPair(durs, newFirstDur, sceneDur, minD);
        }
        commitShotDurs(durs);
        return;
      }

      if (ctx.shotIndex === undefined) return;
      const durs = [...ctx.shotDurations];
      const i = ctx.shotIndex;
      const j = clip.handle === 'left' ? i : i + 1;
      const pairLeft = j - 1;
      const P = durs.slice(0, pairLeft).reduce((s, x) => s + x, 0);
      const pairSum = durs[pairLeft] + durs[j];
      const minPairLeft = MIN_CLIP_DURATION_SEC;
      const maxPairLeft = pairSum - MIN_CLIP_DURATION_SEC;
      let newPairLeft = newBoundarySec - sceneStart - P;
      newPairLeft = Math.max(minPairLeft, Math.min(maxPairLeft, newPairLeft));
      if (magnet) {
        const boundaryAbs = sceneStart + P + newPairLeft;
        const snapped = snapClipBoundary(boundaryAbs, snapEdges, dTotal, pxs, true);
        newPairLeft = snapped - sceneStart - P;
        newPairLeft = Math.max(minPairLeft, Math.min(maxPairLeft, newPairLeft));
      }
      {
        const leftId = ids[pairLeft];
        const rightId = ids[j];
        const cmax = maxClipEndForShot(leftId, clipBlocksRef.current);
        const cmin = minClipStartForShot(rightId, clipBlocksRef.current);
        let minPL = minPairLeft;
        let maxPL = maxPairLeft;
        if (cmax != null) minPL = Math.max(minPL, cmax - sceneStart - P);
        if (cmin != null) maxPL = Math.min(maxPL, cmin - sceneStart - P);
        if (minPL <= maxPL + 1e-4) {
          newPairLeft = Math.max(minPL, Math.min(maxPL, newPairLeft));
        }
      }
      const d1 = newPairLeft;
      const d2 = pairSum - d1;
      durs[pairLeft] = d1;
      durs[j] = d2;
      trimClipCtxRef.current = { ...ctx, shotDurations: durs };
      queueManualShotDurations((prev) => {
        const next = { ...prev };
        next[ids[pairLeft]] = d1;
        next[ids[j]] = d2;
        return next;
      });
    }
  };

  const handleTrimClipEnd = async () => {
    const clip = clipTrimActiveRef.current ?? trimingClipRef.current;
    if (!clip) return;
    if (clipTrimEndGuardRef.current) return;
    clipTrimEndGuardRef.current = true;

    clipTrimWindowCleanupRef.current?.();
    clipTrimWindowCleanupRef.current = null;

    flushQueuedTimingUpdatesNow();
    // Nach Clip-Drag lebten Timing-Werte nur in Refs (kein setState während Ziehen) — React-State angleichen
    setManualActTimings({ ...manualActTimingsRef.current });
    setManualSequenceTimings({ ...manualSequenceTimingsRef.current });
    setManualSceneTimings({ ...manualSceneTimingsRef.current });
    setManualShotDurations({ ...manualShotDurationsRef.current });
    resetClipPreviewStyles();

    const snap = trimClipSnapshotRef.current;
    const td = timelineDataRef.current;

      const revert = () => {
      if (snap) {
        setManualActTimings(snap.manualActTimings);
        setManualSequenceTimings(snap.manualSequenceTimings);
        setManualSceneTimings(snap.manualSceneTimings);
        setManualShotDurations(snap.manualShotDurations);
      }
    };

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht authentifiziert');
        revert();
        clipTrimActiveRef.current = null;
        setTrimingClip(null);
        trimClipCtxRef.current = null;
        clipTrimEndGuardRef.current = false;
        return;
      }

      const ma = manualActTimingsRef.current;
      const msq = manualSequenceTimingsRef.current;
      const msc = manualSceneTimingsRef.current;
      const msh = manualShotDurationsRef.current;

      if (clip.kind === 'act' && td && 'acts' in td) {
        const ctxEnd = trimClipCtxRef.current;
        const actsOrdered = [...(td.acts || [])].sort(
          (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
        );
        const toWrite = new Set<string>();
        if (ctxEnd?.kind === 'act' && (ctxEnd.trimLastRight || ctxEnd.trimFirstLeft) && ctxEnd.actIds) {
          for (const aid of ctxEnd.actIds) toWrite.add(aid);
        } else if (clip.handle === 'left') {
          const idx = actsOrdered.findIndex((a: any) => a.id === clip.id);
          if (idx > 0) {
            toWrite.add(actsOrdered[idx - 1].id);
            toWrite.add(clip.id);
          }
        } else {
          const idx = actsOrdered.findIndex((a: any) => a.id === clip.id);
          if (idx >= 0 && idx < actsOrdered.length - 1) {
            toWrite.add(clip.id);
            toWrite.add(actsOrdered[idx + 1].id);
          }
        }
        for (const actId of toWrite) {
          const o = ma[actId];
          if (!o) continue;
          if (!isPersistedTimelineNodeId(actId)) continue;
          await TimelineAPI.updateAct(actId, { metadata: { pct_from: o.pct_from, pct_to: o.pct_to } }, token);
        }

        const affectedActIdSet = new Set([...toWrite]);
        for (const s of td.sequences || []) {
          if (!affectedActIdSet.has(s.actId)) continue;
          const o = msq[s.id];
          if (!o) continue;
          if (!isPersistedTimelineNodeId(s.id)) continue;
          await TimelineAPI.updateSequence(
            s.id,
            {
              metadata: {
                ...(s.metadata || {}),
                pct_from: o.pct_from,
                pct_to: o.pct_to,
              },
            },
            token
          );
        }
        for (const sc of td.scenes || []) {
          const seq = (td.sequences || []).find((x: any) => x.id === sc.sequenceId);
          if (!seq || !affectedActIdSet.has(seq.actId)) continue;
          const o = msc[sc.id];
          if (!o) continue;
          if (!isPersistedTimelineNodeId(sc.id)) continue;
          await TimelineAPI.updateScene(
            sc.id,
            {
              metadata: {
                ...(sc.metadata || {}),
                pct_from: o.pct_from,
                pct_to: o.pct_to,
              },
            },
            token
          );
        }

        const totalDurAct = durationRef.current;
        const parentPatchesAct = computeParentPctPatchesAfterActTrim({
          td,
          actIds: [...toWrite].filter(isPersistedTimelineNodeId),
          ma,
          msq,
          msc,
          duration: totalDurAct,
        });
        for (const [aid, p] of Object.entries(parentPatchesAct.act)) {
          if (!isPersistedTimelineNodeId(aid)) continue;
          const actRow = (td.acts || []).find((a: any) => a.id === aid);
          await TimelineAPI.updateAct(
            aid,
            {
              metadata: {
                ...(actRow?.metadata || {}),
                pct_from: p.pct_from,
                pct_to: p.pct_to,
              },
            },
            token
          );
        }
        for (const [sqid, p] of Object.entries(parentPatchesAct.sequence)) {
          if (!isPersistedTimelineNodeId(sqid)) continue;
          const seqRow = (td.sequences || []).find((s: any) => s.id === sqid);
          await TimelineAPI.updateSequence(
            sqid,
            {
              metadata: {
                ...(seqRow?.metadata || {}),
                pct_from: p.pct_from,
                pct_to: p.pct_to,
              },
            },
            token
          );
        }

        setTimelineData((prev) => {
          if (!prev || !('acts' in prev)) return prev;
          let next: TimelineData = {
            ...prev,
            acts: prev.acts.map((a: any) => {
              const o = ma[a.id];
              if (!o) return a;
              return {
                ...a,
                metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
              };
            }),
            sequences: (prev.sequences || []).map((s: any) => {
              const o = msq[s.id];
              if (!o) return s;
              return {
                ...s,
                metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
              };
            }),
            scenes: (prev.scenes || []).map((sc: any) => {
              const o = msc[sc.id];
              if (!o) return sc;
              return {
                ...sc,
                metadata: { ...(sc.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
              };
            }),
          };
          if (Object.keys(parentPatchesAct.act).length > 0) {
            next = {
              ...next,
              acts: next.acts.map((a: any) => {
                const p = parentPatchesAct.act[a.id];
                if (!p) return a;
                return {
                  ...a,
                  metadata: { ...(a.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                };
              }),
            };
          }
          if ('sequences' in next && Object.keys(parentPatchesAct.sequence).length > 0) {
            next = {
              ...next,
              sequences: (next as TimelineData).sequences.map((s: any) => {
                const p = parentPatchesAct.sequence[s.id];
                if (!p) return s;
                return {
                  ...s,
                  metadata: { ...(s.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                };
              }),
            };
          }
          return next;
        });
        setManualActTimings((prev) => {
          const next = { ...prev };
          for (const id of toWrite) delete next[id];
          return next;
        });
        setManualSequenceTimings((prev) => {
          const next = { ...prev };
          for (const s of td.sequences || []) {
            if (!affectedActIdSet.has(s.actId)) continue;
            delete next[s.id];
          }
          return next;
        });
        setManualSceneTimings((prev) => {
          const next = { ...prev };
          for (const sc of td.scenes || []) {
            const seq = (td.sequences || []).find((x: any) => x.id === sc.sequenceId);
            if (!seq || !affectedActIdSet.has(seq.actId)) continue;
            delete next[sc.id];
          }
          return next;
        });
      } else if (clip.kind === 'sequence' && td && 'sequences' in td) {
        const ctxEnd = trimClipCtxRef.current;
        const seq = (td.sequences || []).find((s: any) => s.id === clip.id);
        if (seq) {
          const actId = seq.actId;
          const seqsOrdered = [...(td.sequences || [])]
            .filter((s: any) => s.actId === actId)
            .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          const idx = seqsOrdered.findIndex((s: any) => s.id === clip.id);
          const toWrite = new Set<string>();
          if (ctxEnd?.kind === 'sequence' && (ctxEnd.trimLastRight || ctxEnd.trimFirstLeft) && ctxEnd.sequenceIds) {
            for (const sid of ctxEnd.sequenceIds) toWrite.add(sid);
          } else if (clip.handle === 'left' && idx > 0) {
            toWrite.add(seqsOrdered[idx - 1].id);
            toWrite.add(clip.id);
          } else if (clip.handle === 'right' && idx >= 0 && idx < seqsOrdered.length - 1) {
            toWrite.add(clip.id);
            toWrite.add(seqsOrdered[idx + 1].id);
          }
          for (const sid of toWrite) {
            const o = msq[sid];
            if (!o) continue;
            if (!isPersistedTimelineNodeId(sid)) continue;
            await TimelineAPI.updateSequence(sid, { metadata: { pct_from: o.pct_from, pct_to: o.pct_to } }, token);
          }

          const toWriteSeqSet = new Set([...toWrite]);
          for (const sc of td.scenes || []) {
            if (!sc.sequenceId || !toWriteSeqSet.has(sc.sequenceId)) continue;
            const o = msc[sc.id];
            if (!o) continue;
            if (!isPersistedTimelineNodeId(sc.id)) continue;
            await TimelineAPI.updateScene(
              sc.id,
              {
                metadata: {
                  ...(sc.metadata || {}),
                  pct_from: o.pct_from,
                  pct_to: o.pct_to,
                },
              },
              token
            );
          }

          const totalDurSeq = durationRef.current;
          const parentPatchesSeq = computeParentPctPatchesAfterSequenceTrim({
            td,
            sequenceIds: [...toWrite].filter(isPersistedTimelineNodeId),
            ma,
            msq,
            msc,
            duration: totalDurSeq,
          });
          for (const [aid, p] of Object.entries(parentPatchesSeq.act)) {
            if (!isPersistedTimelineNodeId(aid)) continue;
            const actRow = (td.acts || []).find((a: any) => a.id === aid);
            await TimelineAPI.updateAct(
              aid,
              {
                metadata: {
                  ...(actRow?.metadata || {}),
                  pct_from: p.pct_from,
                  pct_to: p.pct_to,
                },
              },
              token
            );
          }
          for (const [sqid, p] of Object.entries(parentPatchesSeq.sequence)) {
            if (!isPersistedTimelineNodeId(sqid)) continue;
            const seqRow = (td.sequences || []).find((s: any) => s.id === sqid);
            await TimelineAPI.updateSequence(
              sqid,
              {
                metadata: {
                  ...(seqRow?.metadata || {}),
                  pct_from: p.pct_from,
                  pct_to: p.pct_to,
                },
              },
              token
            );
          }

          setTimelineData((prev) => {
            if (!prev || !('sequences' in prev)) return prev;
            let next: TimelineData = {
              ...prev,
              sequences: prev.sequences.map((s: any) => {
                const o = msq[s.id];
                if (!o) return s;
                return {
                  ...s,
                  metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
                };
              }),
              scenes: (prev.scenes || []).map((sc: any) => {
                const o = msc[sc.id];
                if (!o) return sc;
                return {
                  ...sc,
                  metadata: { ...(sc.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
                };
              }),
            };
            if ('acts' in next && Object.keys(parentPatchesSeq.act).length > 0) {
              next = {
                ...next,
                acts: (next as TimelineData).acts.map((a: any) => {
                  const p = parentPatchesSeq.act[a.id];
                  if (!p) return a;
                  return {
                    ...a,
                    metadata: { ...(a.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                  };
                }),
              };
            }
            if (Object.keys(parentPatchesSeq.sequence).length > 0) {
              next = {
                ...next,
                sequences: next.sequences.map((s: any) => {
                  const p = parentPatchesSeq.sequence[s.id];
                  if (!p) return s;
                  return {
                    ...s,
                    metadata: { ...(s.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                  };
                }),
              };
            }
            return next;
          });
          setManualSequenceTimings((prev) => {
            const next = { ...prev };
            for (const id of toWrite) delete next[id];
            return next;
          });
          setManualSceneTimings((prev) => {
            const next = { ...prev };
            for (const sc of td.scenes || []) {
              if (!sc.sequenceId || !toWriteSeqSet.has(sc.sequenceId)) continue;
              delete next[sc.id];
            }
            return next;
          });
        }
      } else if (clip.kind === 'scene' && td && 'scenes' in td) {
        const ctxEnd = trimClipCtxRef.current;
        const scene = (td.scenes || []).find((s: any) => s.id === clip.id);
        if (scene) {
          const seqId = scene.sequenceId;
          const scenesOrdered = [...(td.scenes || [])]
            .filter((s: any) => s.sequenceId === seqId)
            .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          const idx = scenesOrdered.findIndex((s: any) => s.id === clip.id);
          const toWrite = new Set<string>();
          if (ctxEnd?.kind === 'scene' && (ctxEnd.trimLastRight || ctxEnd.trimFirstLeft) && ctxEnd.sceneIds) {
            for (const sid of ctxEnd.sceneIds) toWrite.add(sid);
          } else if (clip.handle === 'left' && idx > 0) {
            toWrite.add(scenesOrdered[idx - 1].id);
            toWrite.add(clip.id);
          } else if (clip.handle === 'right' && idx >= 0 && idx < scenesOrdered.length - 1) {
            toWrite.add(clip.id);
            toWrite.add(scenesOrdered[idx + 1].id);
          }
          for (const scid of toWrite) {
            const o = msc[scid];
            if (!o) continue;
            if (!isPersistedTimelineNodeId(scid)) continue;
            await TimelineAPI.updateScene(scid, { metadata: { pct_from: o.pct_from, pct_to: o.pct_to } }, token);
          }

          const totalDur = durationRef.current;
          const parentPatches = computeParentPctPatchesAfterSceneTrim({
            td,
            sceneIds: [...toWrite].filter(isPersistedTimelineNodeId),
            ma,
            msq,
            msc,
            duration: totalDur,
          });
          for (const [aid, p] of Object.entries(parentPatches.act)) {
            if (!isPersistedTimelineNodeId(aid)) continue;
            const actRow = (td.acts || []).find((a: any) => a.id === aid);
            await TimelineAPI.updateAct(
              aid,
              {
                metadata: {
                  ...(actRow?.metadata || {}),
                  pct_from: p.pct_from,
                  pct_to: p.pct_to,
                },
              },
              token
            );
          }
          for (const [sqid, p] of Object.entries(parentPatches.sequence)) {
            if (!isPersistedTimelineNodeId(sqid)) continue;
            const seqRow = (td.sequences || []).find((s: any) => s.id === sqid);
            await TimelineAPI.updateSequence(
              sqid,
              {
                metadata: {
                  ...(seqRow?.metadata || {}),
                  pct_from: p.pct_from,
                  pct_to: p.pct_to,
                },
              },
              token
            );
          }

          setTimelineData((prev) => {
            if (!prev || !('scenes' in prev)) return prev;
            let next = {
              ...prev,
              scenes: prev.scenes.map((s: any) => {
                const o = msc[s.id];
                if (!o) return s;
                return {
                  ...s,
                  metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to },
                };
              }),
            };
            if ('acts' in next && Object.keys(parentPatches.act).length > 0) {
              next = {
                ...next,
                acts: (next as TimelineData).acts.map((a: any) => {
                  const p = parentPatches.act[a.id];
                  if (!p) return a;
                  return {
                    ...a,
                    metadata: { ...(a.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                  };
                }),
              };
            }
            if ('sequences' in next && Object.keys(parentPatches.sequence).length > 0) {
              next = {
                ...next,
                sequences: (next as TimelineData).sequences.map((s: any) => {
                  const p = parentPatches.sequence[s.id];
                  if (!p) return s;
                  return {
                    ...s,
                    metadata: { ...(s.metadata || {}), pct_from: p.pct_from, pct_to: p.pct_to },
                  };
                }),
              };
            }
            return next;
          });
          setManualSceneTimings((prev) => {
            const next = { ...prev };
            for (const id of toWrite) delete next[id];
            return next;
          });
        }
      } else if (clip.kind === 'shot' && td && 'shots' in td) {
        const ctxEnd = trimClipCtxRef.current;
        if (ctxEnd?.kind === 'shot' && ctxEnd.shotIds && ctxEnd.shotDurations) {
          const ids = ctxEnd.shotIds;
          const durs = ctxEnd.shotDurations;
          const snapD = snap?.manualShotDurations ?? {};

          const timelineShotTotalSec = (shotId: string): number | undefined => {
            const sh = (td.shots || []).find((x: any) => x.id === shotId);
            if (!sh) return undefined;
            const mRaw = sh.shotlengthMinutes ?? sh.shotlength_minutes ?? 0;
            const sRaw = sh.shotlengthSeconds ?? sh.shotlength_seconds;
            if (typeof sRaw !== 'number' || !Number.isFinite(sRaw)) return undefined;
            const mi =
              typeof mRaw === 'number' && Number.isFinite(mRaw) ? Math.max(0, Math.floor(mRaw)) : 0;
            const s = Math.round(sRaw);
            const t = mi * 60 + s;
            return t > 0 ? t : undefined;
          };

          const pushShotApi = async (shotId: string, totalSec: number) => {
            if (!isPersistedTimelineNodeId(shotId)) return;
            const total = Math.max(MIN_CLIP_DURATION_SEC, Math.round(Number(totalSec)));
            const minutes = Math.floor(total / 60);
            const seconds = total % 60;
            await ShotsAPI.updateShot(
              shotId,
              { shotlengthMinutes: minutes, shotlengthSeconds: seconds, duration: `${total}s` },
              token
            );
          };

          const patchTimelineShotsFromDurs = () => {
            setTimelineData((prev) => {
              if (!prev || !('shots' in prev)) return prev;
              return {
                ...prev,
                shots: (prev.shots ?? []).map((sh: any) => {
                  const ix = ids.indexOf(sh.id);
                  if (ix < 0) return sh;
                  const total = Math.max(MIN_CLIP_DURATION_SEC, Math.round(Number(durs[ix])));
                  const minutes = Math.floor(total / 60);
                  const seconds = total % 60;
                  return {
                    ...sh,
                    shotlengthMinutes: minutes,
                    shotlengthSeconds: seconds,
                    shotlength_minutes: minutes,
                    shotlength_seconds: seconds,
                    duration: `${total}s`,
                  };
                }),
              };
            });
            setManualShotDurations((prev) => {
              const next = { ...prev };
              for (const sid of ids) delete next[sid];
              return next;
            });
          };

          if (ctxEnd.trimLastRight || ctxEnd.trimFirstLeft) {
            for (let i = 0; i < ids.length; i++) {
              const sid = ids[i];
              const newTotal = Math.max(MIN_CLIP_DURATION_SEC, Math.round(Number(durs[i])));
              const fromSnap = snapD[sid];
              const baseline =
                fromSnap !== undefined ? Math.round(fromSnap) : timelineShotTotalSec(sid);
              if (baseline === undefined || newTotal !== baseline) {
                await pushShotApi(sid, newTotal);
              }
            }
            patchTimelineShotsFromDurs();
          } else if (ctxEnd.shotIndex !== undefined) {
            const i = ctxEnd.shotIndex;
            const toWrite: [string, string] =
              clip.handle === 'left' ? [ids[i - 1], ids[i]] : [ids[i], ids[i + 1]];
            const idxA = clip.handle === 'left' ? i - 1 : i;
            const idxB = clip.handle === 'left' ? i : i + 1;
            await pushShotApi(toWrite[0], durs[idxA]);
            await pushShotApi(toWrite[1], durs[idxB]);
            patchTimelineShotsFromDurs();
          }
        }
      }

      if (onProjectDurationSecondsHint && !isBookProject && td && 'acts' in td) {
        const d = durationRef.current;
        const mergedTd: TimelineData = {
          ...td,
          acts: td.acts.map((a: any) => {
            const o = ma[a.id];
            if (!o) return a;
            return { ...a, metadata: { ...(a.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
          }),
          sequences: (td.sequences || []).map((s: any) => {
            const o = msq[s.id];
            if (!o) return s;
            return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
          }),
          scenes: (td.scenes || []).map((s: any) => {
            const o = msc[s.id];
            if (!o) return s;
            return { ...s, metadata: { ...(s.metadata || {}), pct_from: o.pct_from, pct_to: o.pct_to } };
          }),
        };
        const px = 1;
        const abs = calculateActBlocks(mergedTd, d, 0, d, px, false);
        let maxEnd = 0;
        for (const a of abs) maxEnd = Math.max(maxEnd, a.endSec);
        for (const c of mergedTd.clips || []) {
          const e = (c as Clip).endSec;
          if (typeof e === 'number') maxEnd = Math.max(maxEnd, e);
        }
        if (maxEnd > d + 0.25) {
          onProjectDurationSecondsHint(Math.ceil(maxEnd));
        }
      }
    } catch (err) {
      console.error('[Clip Trim] save failed', err);
      toast.error('Trim konnte nicht gespeichert werden');
      revert();
    }

    clipTrimActiveRef.current = null;
    setTrimingClip(null);
    trimClipCtxRef.current = null;
    trimClipSnapshotRef.current = null;
    clipTrimEndGuardRef.current = false;
  };

  const handleNleClipPointerDown = (
    row: { id: string; sceneId: string; shotId?: string; startSec: number; endSec: number },
    handle: 'left' | 'right',
    e: React.PointerEvent
  ) => {
    if (clipTrimActiveRef.current || beatTrimActiveRef.current || trimingClipRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    nleClipDragRef.current = {
      clipId: row.id,
      handle,
      startClientX: e.clientX,
      anchorSec: handle === 'left' ? row.startSec : row.endSec,
      origStart: row.startSec,
      origEnd: row.endSec,
      sceneId: row.sceneId,
      shotId: row.shotId,
    };
    nleClipFinalBoundsRef.current = { clipId: row.id, startSec: row.startSec, endSec: row.endSec };
    setNleClipPreview({ [row.id]: { startSec: row.startSec, endSec: row.endSec } });
    registerNleClipTrimWindowListenersRef.current();
  };

  const handleNleClipMove = (e: PointerEvent) => {
    const drag = nleClipDragRef.current;
    if (!drag) return;
    const pxs = pxPerSecRef.current;
    const dTotal = durationRef.current;
    const deltaSec = (e.clientX - drag.startClientX) / pxs;
    let start = drag.origStart;
    let end = drag.origEnd;
    if (drag.handle === 'left') {
      start = drag.anchorSec + deltaSec;
    } else {
      end = drag.anchorSec + deltaSec;
    }
    if (end - start < MIN_CLIP_DURATION_SEC) {
      if (drag.handle === 'left') start = end - MIN_CLIP_DURATION_SEC;
      else end = start + MIN_CLIP_DURATION_SEC;
    }
    start = Math.max(0, Math.min(dTotal, start));
    end = Math.max(0, Math.min(dTotal, end));
    let parentStart = 0;
    let parentEnd = dTotal;
    const sc = sceneBlocksRef.current.find((b: any) => b.id === drag.sceneId);
    if (sc) {
      parentStart = Math.max(parentStart, sc.startSec);
      parentEnd = Math.min(parentEnd, sc.endSec);
    }
    const sh =
      drag.shotId != null
        ? shotBlocksRef.current.find((b: any) => b.id === drag.shotId)
        : null;
    if (sh) {
      parentStart = Math.max(parentStart, sh.startSec);
      parentEnd = Math.min(parentEnd, sh.endSec);
    }
    start = Math.max(parentStart, Math.min(parentEnd, start));
    end = Math.max(parentStart, Math.min(parentEnd, end));
    if (end - start < MIN_CLIP_DURATION_SEC) return;
    const edSnap = getEditorialClipTrimSnapEdges();
    if (edSnap.length > 0) {
      if (drag.handle === 'left') {
        start = snapClipBoundary(start, edSnap, dTotal, pxs, true);
      } else {
        end = snapClipBoundary(end, edSnap, dTotal, pxs, true);
      }
      start = Math.max(parentStart, Math.min(parentEnd, start));
      end = Math.max(parentStart, Math.min(parentEnd, end));
      if (end - start < MIN_CLIP_DURATION_SEC) {
        if (drag.handle === 'left') start = end - MIN_CLIP_DURATION_SEC;
        else end = start + MIN_CLIP_DURATION_SEC;
      }
      start = Math.max(parentStart, Math.min(parentEnd, start));
      end = Math.max(parentStart, Math.min(parentEnd, end));
      if (end - start < MIN_CLIP_DURATION_SEC) return;
    }
    nleClipFinalBoundsRef.current = { clipId: drag.clipId, startSec: start, endSec: end };
    setNleClipPreview({ [drag.clipId]: { startSec: start, endSec: end } });
  };

  const handleNleClipEnd = async () => {
    nleClipTrimCleanupRef.current?.();
    nleClipTrimCleanupRef.current = null;
    nleClipDragRef.current = null;
    setNleClipPreview(null);
    const bounds = nleClipFinalBoundsRef.current;
    nleClipFinalBoundsRef.current = null;
    if (!bounds) return;

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht authentifiziert');
        return;
      }
      const td = timelineDataRef.current as TimelineData | null;
      if (!td?.clips?.length) return;
      const clipEnt = td.clips.find((c) => c.id === bounds.clipId);
      if (!clipEnt) return;

      const { startSec, endSec } = bounds;
      const updated = await ClipsAPI.updateClip(bounds.clipId, { startSec, endSec }, token);

      const scene = td.scenes?.find((s) => s.id === clipEnt.sceneId);
      const seq = scene ? td.sequences?.find((s) => s.id === scene.sequenceId) : undefined;
      const act = seq ? td.acts?.find((a) => a.id === seq.actId) : undefined;
      const sceneBlock = sceneBlocksRef.current.find((b: any) => b.id === clipEnt.sceneId);
      const sequenceBlock = seq ? sequenceBlocksRef.current.find((b: any) => b.id === seq.id) : undefined;
      const actBlock = act ? actBlocksRef.current.find((b: any) => b.id === act.id) : undefined;
      const totalDur = durationRef.current;

      let exp: ReturnType<typeof expandStructurePctToFitClip> | null = null;
      if (sceneBlock && sequenceBlock && actBlock) {
        exp = expandStructurePctToFitClip({
          clip: { startSec, endSec, sceneId: clipEnt.sceneId },
          actBlock,
          sequenceBlock,
          sceneBlock,
          totalDur,
        });
        if (exp.act && act && isPersistedTimelineNodeId(act.id)) {
          await TimelineAPI.updateAct(
            act.id,
            {
              metadata: {
                ...(act.metadata || {}),
                pct_from: exp.act.pct_from,
                pct_to: exp.act.pct_to,
              },
            },
            token
          );
        }
        if (exp.sequence && seq && isPersistedTimelineNodeId(seq.id)) {
          await TimelineAPI.updateSequence(
            seq.id,
            {
              metadata: {
                ...(seq.metadata || {}),
                pct_from: exp.sequence.pct_from,
                pct_to: exp.sequence.pct_to,
              },
            },
            token
          );
        }
        if (exp.scene && scene && isPersistedTimelineNodeId(scene.id)) {
          await TimelineAPI.updateScene(
            scene.id,
            {
              metadata: {
                ...(scene.metadata || {}),
                pct_from: exp.scene.pct_from,
                pct_to: exp.scene.pct_to,
              },
            },
            token
          );
        }
      }

      const nextData: TimelineData = {
        ...td,
        clips: td.clips.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        acts: td.acts.map((a) => {
          if (!exp?.act || !act || a.id !== act.id) return a;
          return {
            ...a,
            metadata: { ...(a.metadata || {}), pct_from: exp.act.pct_from, pct_to: exp.act.pct_to },
          };
        }),
        sequences: td.sequences.map((s) => {
          if (!exp?.sequence || !seq || s.id !== seq.id) return s;
          return {
            ...s,
            metadata: {
              ...(s.metadata || {}),
              pct_from: exp.sequence.pct_from,
              pct_to: exp.sequence.pct_to,
            },
          };
        }),
        scenes: td.scenes.map((s) => {
          if (!exp?.scene || !scene || s.id !== scene.id) return s;
          return {
            ...s,
            metadata: {
              ...(s.metadata || {}),
              pct_from: exp.scene.pct_from,
              pct_to: exp.scene.pct_to,
            },
          };
        }),
      };

      setTimelineData(nextData);
      onDataChange?.(nextData);
    } catch (e) {
      console.error('[NLE clip trim]', e);
      toast.error('Clip-Update fehlgeschlagen');
    }
  };
  
  /* OLD - REPLACED BY handleTrimMoveSimplified
  const handleTrimMove = (e: MouseEvent) => {
    if (!trimingBeat) return;
    
    const deltaX = e.clientX - trimStartXRef.current;
    const deltaSec = deltaX / pxPerSec;
    let newSec = trimStartSecRef.current + deltaSec;
    
    // Get current beat
    const beat = beats.find(b => b.id === trimingBeat.id);
    if (!beat) return;
    
    if (trimingBeat.handle === 'left') {
      // LEFT HANDLE: Resize from start
      const beatEndSec = (beat.pct_to / 100) * duration;
      
      // Clamp to min duration and bounds
      newSec = Math.max(0, Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, newSec));
      
      // 🧲 SNAP (if magnet enabled)
      if (beatMagnetEnabled) {
        newSec = snapTime(newSec, beats, duration, pxPerSec, {
          excludeBeatId: trimingBeat.id,
          snapToPlayheadSec: currentTimeRef.current
        });
      }
      
      // ✅ Convert snapped seconds to percentage
      let newPctFrom = (newSec / duration) * 100;
      
      // 🧲 FIND ADJACENT BEAT (based on NEW position for accurate snapping!)
      const otherBeats = beats
        .filter(b => b.id !== trimingBeat.id)
        .sort((a, b) => a.pct_from - b.pct_from);
      
      // Find beat immediately above (closest beat that ends BEFORE new position)
      const beatsAbove = otherBeats.filter(b => b.pct_to <= newPctFrom);
      const beatAbove = beatsAbove.length > 0 ? beatsAbove[beatsAbove.length - 1] : null;
      
      console.log(`[Beat Trim] 📍 LEFT: "${beat.label}" moving to ${newPctFrom.toFixed(1)}%`, {
        magnetEnabled: beatMagnetEnabled,
        beatAbove: beatAbove ? `"${beatAbove.label}" ends at ${beatAbove.pct_to.toFixed(1)}%` : 'none'
      });
      
      // 🧲 SNAP FIRST (if magnet enabled and close enough)
      if (beatAbove && beatMagnetEnabled) {
        const distance = Math.abs(newPctFrom - beatAbove.pct_to);
        if (distance < SNAP_THRESHOLD_PERCENT) {
          console.log(`[Beat Trim] 🧲 LEFT snapped! Distance=${distance.toFixed(2)}%`);
          newPctFrom = beatAbove.pct_to;
        }
      }
      
      // 🚫 THEN PREVENT OVERLAP: Can't go above beatAbove's bottom
      if (beatAbove) {
        const minAllowed = beatAbove.pct_to;
        if (newPctFrom < minAllowed) {
          console.log(`[Beat Trim] 🚫 LEFT blocked at ${minAllowed}%`);
          newPctFrom = minAllowed;
        }
      }
      
      // 🚫 Min beat duration
      const maxAllowed = beat.pct_to - (MIN_BEAT_DURATION_SEC / duration * 100);
      newPctFrom = Math.min(newPctFrom, maxAllowed);
      
      setBeats(prev => prev.map(b =>
        b.id === trimingBeat.id ? { ...b, pct_from: newPctFrom } : b
      ));
      
    } else {
      // RIGHT HANDLE: Resize from end (CapCut/DaVinci Magnet Style)
      const oldStartSec = (beat.pct_from / 100) * duration;
      let clampedEndSec = Math.max(oldStartSec + MIN_BEAT_DURATION_SEC, Math.min(duration, newSec));
      let newPctTo = (clampedEndSec / duration) * 100;
      
      // 🧲 FIND ADJACENT BEAT (based on NEW position for accurate snapping!)
      const otherBeats = beats
        .filter(b => b.id !== trimingBeat.id)
        .sort((a, b) => a.pct_from - b.pct_from);
      
      // Find beat immediately below (closest beat that starts AFTER CURRENT end)
      const beatsBelow = otherBeats.filter(b => b.pct_from >= beat.pct_to);
      const beatBelow = beatsBelow.length > 0 ? beatsBelow[0] : null;
      
      console.log(`[Beat Trim] 📍 RIGHT: "${beat.label}" moving to ${newPctTo.toFixed(1)}%`, {
        magnetEnabled: beatMagnetEnabled,
        beatBelow: beatBelow ? `"${beatBelow.label}" starts at ${beatBelow.pct_from.toFixed(1)}%` : 'none'
      });
      
      // CAPCUT/DAVINCI MAGNET: Snapping + Hard Stop
      if (beatBelow) {
        // SNAP if close enough and magnet enabled
        if (beatMagnetEnabled) {
          const distance = Math.abs(newPctTo - beatBelow.pct_from);
          if (distance < SNAP_THRESHOLD_PERCENT) {
            newPctTo = beatBelow.pct_from;
          }
        }
        
        // HARD STOP: Prevent overlap (always active)
        if (newPctTo > beatBelow.pct_from) {
          newPctTo = beatBelow.pct_from;
        }
      }
      
      // 🚫 Min beat duration
      const minAllowed = beat.pct_from + (MIN_BEAT_DURATION_SEC / duration * 100);
      newPctTo = Math.max(newPctTo, minAllowed);
      
      setBeats(prev => prev.map(b =>
        b.id === trimingBeat.id ? { ...b, pct_to: newPctTo } : b
      ));
    }
  };
  */
  
  // 🆕 EPHEMERAL handleTrimMove — engine calculates in refs, rAF applies to DOM (zero React re-renders)
  const handleTrimMove = (e: PointerEvent) => {
    if (!beatTrimActiveRef.current && !trimEngine.isBeatTrimActive()) return;

    // Use SNAPSHOT beats (from drag start) so we don't depend on React state during drag
    const snapshotBeats = beatTrimSnapshotRef.current;
    if (!snapshotBeats) return;

    const active = beatTrimActiveRef.current;
    if (!active) return;

    const useAutosnap = beatAutosnapEnabledRef.current;
    const useFullMagnet = beatMagnetEnabledRef.current;
    const snapFnBeat =
      !useAutosnap ? snapTime : useFullMagnet ? snapTime : snapTimePlayheadOnly;

    const result = trimEngine.updateBeatTrim(
      e.clientX,
      snapshotBeats as any[],
      durationRef.current,
      pxPerSecRef.current,
      useAutosnap,
      snapFnBeat as any,
      currentTimeRef.current,
    );

    if (!result) return;

    // 🚀 rAF-throttled DOM update — bypasses React entirely for 60fps smoothness
    trimEngine.scheduleRAF(() => {
      applyBeatPreviewToDOM(
        beatTrackContainerRef.current,
        snapshotBeats as any[],
        active.id,
        result.trimmedBeat,
        result.rippleBeats,
        durationRef.current,
        pxPerSecRef.current,
        viewStartSecRef.current,
      );
    });
  };
  
  const handleTrimEnd = async (e?: PointerEvent) => {
    if (!beatTrimActiveRef.current) return;
    if (beatTrimEndGuardRef.current) return;
    beatTrimEndGuardRef.current = true;

    beatTrimWindowCleanupRef.current?.();
    beatTrimWindowCleanupRef.current = null;

    const activeHandle = beatTrimActiveRef.current.handle;
    console.log(`[Beat Trim] ✅ Finished trimming ${activeHandle} handle`);

    // Release pointer capture
    if (e && beatTrimPointerIdRef.current !== null) {
      try { (e.target as HTMLElement).releasePointerCapture(beatTrimPointerIdRef.current); } catch (_) {}
      beatTrimPointerIdRef.current = null;
    }

    const beatsAtTrimStart = beatTrimSnapshotRef.current;
    beatTrimSnapshotRef.current = null;

    // 🚀 Commit from engine — single source of truth for final positions (identity if no move)
    const commitResult = trimEngine.commitBeatTrim();

    beatTrimActiveRef.current = null;
    setTrimingBeat(null);

    if (!commitResult) {
      beatTrimEndGuardRef.current = false;
      trimEngine.cleanup();
      return;
    }

    const origBeat = beatsAtTrimStart?.find((b) => b.id === commitResult.beatId);
    const unchanged =
      origBeat &&
      commitResult.rippleBeats.length === 0 &&
      (commitResult.handle === 'left'
        ? commitResult.trimmedBeat.pct_from === origBeat.pct_from
        : commitResult.trimmedBeat.pct_to === origBeat.pct_to);

    if (unchanged) {
      if (beatTrackContainerRef.current) {
        const els = beatTrackContainerRef.current.querySelectorAll('[data-beat-id]');
        els.forEach((el) => {
          (el as HTMLElement).style.transform = '';
          (el as HTMLElement).style.width = '';
          (el as HTMLElement).style.left = '';
        });
      }
      beatTrimEndGuardRef.current = false;
      trimEngine.cleanup();
      return;
    }

    // Reset inline DOM styles set by applyBeatPreviewToDOM (React will re-render with correct positions)
    if (beatTrackContainerRef.current) {
      const els = beatTrackContainerRef.current.querySelectorAll('[data-beat-id]');
      els.forEach((el) => {
        (el as HTMLElement).style.transform = '';
        (el as HTMLElement).style.width = '';
        (el as HTMLElement).style.left = '';
      });
    }

    // 🚀 Single React state update — applies committed positions
    setBeats((prev) =>
      prev.map((b) => {
        if (b.id === commitResult.beatId) {
          return commitResult.handle === "left"
            ? { ...b, pct_from: commitResult.trimmedBeat.pct_from }
            : { ...b, pct_to: commitResult.trimmedBeat.pct_to };
        }
        const rippled = commitResult.rippleBeats.find((rb) => rb.id === b.id);
        if (rippled) {
          return { ...b, pct_from: rippled.pct_from, pct_to: rippled.pct_to };
        }
        return b;
      })
    );

    // DB persist — use committed positions (not React state which may be stale)
    try {
      let abortTrimSave = false;
      const updateTrimmedBeat = async () => {
        if (!dbBeatIds.has(commitResult.beatId)) {
          console.log(`[Beat Trim] ⏭️ Skipping DB update for template beat ${commitResult.beatId}`);
          return;
        }
        const payload =
          commitResult.handle === 'right'
            ? { pct_to: commitResult.trimmedBeat.pct_to }
            : { pct_from: commitResult.trimmedBeat.pct_from };
        try {
          await BeatsAPI.updateBeat(commitResult.beatId, payload);
          } catch (error: any) {
            if (error.message?.includes('404') || error.message?.includes('not found')) {
            console.warn(`[Beat Trim] ⚠️ Beat ${commitResult.beatId} not found in DB, removing from tracking...`);
            setDbBeatIds((prev) => {
                const next = new Set(prev);
              next.delete(commitResult.beatId);
                return next;
              });
            abortTrimSave = true;
              return;
            }
            throw error;
          }
      };

      await updateTrimmedBeat();
      if (abortTrimSave) {
        beatTrimEndGuardRef.current = false;
        trimEngine.cleanup();
        return;
      }

      // Diff committed ripple beats against snapshot to find DB-worthy changes
      const dbUpdates = commitResult.rippleBeats.filter((rb) => {
        if (!dbBeatIds.has(rb.id)) return false;
        const snapB = beatsAtTrimStart?.find((ob) => ob.id === rb.id);
        return snapB && (rb.pct_from !== snapB.pct_from || rb.pct_to !== snapB.pct_to);
      });
      console.log(
        `[Beat Trim] 📤 Saving ${dbUpdates.length} rippled beats to DB`
      );

        for (const b of dbUpdates) {
          try {
            await BeatsAPI.updateBeat(b.id, { pct_from: b.pct_from, pct_to: b.pct_to });
            console.log(`[Beat Trim] ✅ Saved \"${b.label}\" position`);
          } catch (error: any) {
            if (error.message?.includes('404') || error.message?.includes('not found')) {
              console.warn(`[Beat Trim] ⚠️ Beat ${b.id} not found in DB, removing from tracking...`);
            setDbBeatIds((prev) => {
                const next = new Set(prev);
                next.delete(b.id);
                return next;
              });
              continue;
            }
            throw error;
        }
      }
      
      console.log('[Beat Trim] ✅ DB updated successfully');
    } catch (error) {
      console.error('[Beat Trim] ❌ Error updating beat:', error);
      if (beatsAtTrimStart) {
        setBeats(beatsAtTrimStart.map((b) => ({ ...b })));
      }
    }

    beatTrimEndGuardRef.current = false;
    trimEngine.cleanup();
  };

  registerBeatTrimWindowListenersRef.current = () => {
    beatTrimWindowCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleTrimMoveRef.current(ev);
    };
    const onEnd = (ev: PointerEvent) => {
      void handleTrimEndRef.current(ev);
    };
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onEnd, { capture: true });
    window.addEventListener('pointercancel', onEnd, { capture: true });
    beatTrimWindowCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onEnd, { capture: true });
      window.removeEventListener('pointercancel', onEnd, { capture: true });
    };
  };

  registerClipTrimWindowListenersRef.current = () => {
    clipTrimWindowCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleTrimClipMoveRef.current(ev);
    };
    const onEnd = () => {
      void handleTrimClipEndRef.current();
    };
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onEnd, { capture: true });
    window.addEventListener('pointercancel', onEnd, { capture: true });
    clipTrimWindowCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onEnd, { capture: true });
      window.removeEventListener('pointercancel', onEnd, { capture: true });
    };
  };

  handleTrimMoveRef.current = handleTrimMove;
  handleTrimEndRef.current = handleTrimEnd;
  handleTrimClipMoveRef.current = handleTrimClipMove;
  handleTrimClipEndRef.current = handleTrimClipEnd;

  registerNleClipTrimWindowListenersRef.current = () => {
    nleClipTrimCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleNleClipMoveRef.current(ev);
    };
    const onEnd = () => {
      void handleNleClipEndRef.current();
    };
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onEnd, { capture: true });
    window.addEventListener('pointercancel', onEnd, { capture: true });
    nleClipTrimCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onEnd, { capture: true });
      window.removeEventListener('pointercancel', onEnd, { capture: true });
    };
  };
  handleNleClipMoveRef.current = handleNleClipMove;
  handleNleClipEndRef.current = handleNleClipEnd;
  
  // 🎯 GLOBAL RESIZE + TRIM LISTENERS
  useEffect(() => {
    if (resizingTrack) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingTrack, trackHeights]);

  console.log('[VideoEditorTimeline] 📖 Book Timeline:', {
    isBookProject,
    totalWords,
    wordsPerPage,
    targetPages,
    readingSpeedWpm,
  });
  
  // 📖 HELPER: Extract text from TipTap JSON and split into words
  const extractWordsFromContent = (content: any): string[] => {
    if (!content?.content || !Array.isArray(content.content)) {
      return [];
    }
    
    let text = '';
    for (const node of content.content) {
      if (node.type === 'paragraph' && node.content) {
        for (const child of node.content) {
          if (child.type === 'text' && child.text) {
            text += child.text + ' ';
          }
        }
        text += ' '; // Space between paragraphs
      }
    }
    
    return text.trim().split(/\s+/).filter(w => w.length > 0);
  };
  
  // 📖 PLAYBACK LOOP: Animate word-by-word
  useEffect(() => {
    if (!isPlaying || !isBookProject) return;
    
    const animate = () => {
      
      // Read the SMOOTH interpolated time from RAF (currentTimeRef is updated by RAF loop!)
      const timeIntoScene = currentTimeRef.current - playbackSceneStartTimeRef.current;
      const secondsPerWord = 60 / readingSpeedWpm;
      const wordsElapsed = Math.floor(timeIntoScene / secondsPerWord);
      
      if (wordsElapsed < wordsArray.length && wordsElapsed >= 0) {
        // Still within current scene - update word index only
        setCurrentWordIndex(wordsElapsed);
        playbackAnimationRef.current = requestAnimationFrame(animate);
      } else if (wordsElapsed >= wordsArray.length) {
        // Scene complete - advance to next scene
        console.log('[Playback] 🎬 Scene complete, advancing to next...');
        advanceToNextScene();
      } else {
        // Negative index - shouldn't happen, but continue anyway
        playbackAnimationRef.current = requestAnimationFrame(animate);
      }
    };
    
    playbackAnimationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (playbackAnimationRef.current) {
        cancelAnimationFrame(playbackAnimationRef.current);
        playbackAnimationRef.current = null;
      }
    };
  }, [isPlaying, wordsArray.length, readingSpeedWpm, isBookProject]); // ⚠️ REMOVED currentTime to prevent loop restart!
  
  // 🚀 ADVANCE TO NEXT SCENE
  const advanceToNextScene = () => {
    const scenes = sceneBlocksRef.current.filter(s => s.startSec >= currentTimeRef.current);
    
    if (scenes.length > 0) {
      const nextScene = scenes[0];
      console.log('[Playback] ➡️ Loading next scene:', nextScene.title);
      
      // Load words from next scene
      const words = extractWordsFromContent(nextScene.content);
      
      if (words.length > 0) {
        setCurrentSceneId(nextScene.id);
        setWordsArray(words);
        setCurrentWordIndex(0);
        setCurrentTime(nextScene.startSec);
        currentTimeRef.current = nextScene.startSec; // ✅ Update Ref!
        playbackSceneStartTimeRef.current = nextScene.startSec; // 🎯 Store scene start time
        
        // Re-sync RAF loop to start smooth interpolation from new position
        rafPlaybackStartTimeRef.current = performance.now();
        rafPlaybackStartCurrentTimeRef.current = nextScene.startSec;
      } else {
        // Empty scene - skip to next
        setCurrentTime(nextScene.endSec);
        currentTimeRef.current = nextScene.endSec; // ✅ Update Ref!
        
        // Re-sync RAF loop
        rafPlaybackStartTimeRef.current = performance.now();
        rafPlaybackStartCurrentTimeRef.current = nextScene.endSec;
        
        advanceToNextScene();
      }
    } else {
      // End of timeline
      console.log('[Playback] 🛑 End of timeline');
      setIsPlaying(false);
      setCurrentTime(0);
      currentTimeRef.current = 0; // ✅ Reset Ref!
      setCurrentWordIndex(0);
      setWordsArray([]);
      setCurrentSceneId(null);
    }
  };
  
  // 🎬 HANDLE PLAY/PAUSE TOGGLE
  const handlePlayPause = () => {
    if (!isBookProject) {
      if (currentTimeRef.current >= duration) {
        setCurrentTime(0);
        currentTimeRef.current = 0;
      }
      setIsPlaying((prev) => !prev);
      return;
    }
    
    if (!isPlaying) {
      // START PLAYBACK
      console.log('[Playback] ▶️ Starting playback...');
      
      // Find scene at current time OR next scene after current position
      let currentScene = sceneBlocksRef.current.find(s => 
        currentTime >= s.startSec && currentTime <= s.endSec
      );
      
      // If not in a scene, find the NEXT scene (not the first one!)
      if (!currentScene) {
        currentScene = sceneBlocksRef.current.find(s => s.startSec >= currentTime);
      }
      
      // If no next scene, use the last scene
      if (!currentScene && sceneBlocksRef.current.length > 0) {
        currentScene = sceneBlocksRef.current[sceneBlocksRef.current.length - 1];
      }
      
      if (!currentScene) {
        console.error('[Playback] ❌ No scenes found');
        return;
      }
      
      // Extract words from scene content
      const words = extractWordsFromContent(currentScene.content);
      
      if (words.length === 0) {
        console.error('[Playback] ❌ Scene has no text content');
        return;
      }
      
      console.log(`[Playback] 📖 Loaded ${words.length} words from "${currentScene.title}"`);
      
      // Calculate which word we're at based on CURRENT position
      const secondsPerWord = 60 / readingSpeedWpm;
      const elapsedInScene = currentTime - currentScene.startSec;
      const startWordIndex = Math.floor(elapsedInScene / secondsPerWord);
      
      console.log('[Playback] 🎯 Resuming from word:', startWordIndex, '/', words.length);
      
      setCurrentSceneId(currentScene.id);
      setWordsArray(words);
      setCurrentWordIndex(startWordIndex); // ✅ Start from CURRENT position, not 0!
      // ✅ DO NOT change currentTime - keep current position!
      playbackSceneStartTimeRef.current = currentScene.startSec; // 🎯 Store scene start time
      setIsPlaying(true);
    } else {
      // PAUSE PLAYBACK
      console.log('[Playback] ⏸️ Pausing playback...');
      setIsPlaying(false);
    }
  };
  
  // 📏 MEASURE VIEWPORT WIDTH
  useEffect(() => {
    const el = scrollRef.current; // Measure the SCROLL CONTAINER, not the inner content!
    if (!el) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);
  
  // 📏 TRACK SCROLL POSITION
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  
  // 🎯 UPDATE FIT PX PER SEC: Recalculate when viewport or duration changes
  useEffect(() => {
    if (!viewportWidth || totalDurationSec <= 0) return;
    
    // Calculate dynamic minimum (entire timeline fits in viewport)
    const dynamicFitPx = getFitPxPerSec(totalDurationSec, viewportWidth);
    const prevFitPx = prevFitPxPerSecRef.current;
    
    // Only update if fitPxPerSec actually changed (or initial setup)
    if (!initialZoomSetRef.current || Math.abs(prevFitPx - dynamicFitPx) > 0.0001) {
      setFitPxPerSec(dynamicFitPx);
      prevFitPxPerSecRef.current = dynamicFitPx;
      
      // Calculate pxPerSec based on current zoom
      const newPxPerSec = pxPerSecFromZoom(zoom, dynamicFitPx);
      setPxPerSec(newPxPerSec);
      
      // Log initial setup
      if (!initialZoomSetRef.current) {
        console.log('[VideoEditorTimeline] 🎯 Initial zoom (CapCut-style):', {
          viewportWidth,
          durationSec: `${totalDurationSec.toFixed(0)}s`,
          durationMin: `${(totalDurationSec/60).toFixed(1)}min`,
          fitPxPerSec: dynamicFitPx.toFixed(4),
          maxPxPerSec: MAX_PX_PER_SEC,
          zoomRange: `${dynamicFitPx.toFixed(2)} - ${MAX_PX_PER_SEC}`,
          zoom: zoom,
          pxPerSec: newPxPerSec.toFixed(4),
          timelineWidthPx: (totalDurationSec * newPxPerSec).toFixed(0)
        });
        initialZoomSetRef.current = true;
      }
    }
    // ⚠️ DO NOT ADD zoom to dependencies! It would cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, totalDurationSec]);
  
  // 🎯 CALCULATED VALUES
  const totalWidthPx = totalDurationSec * pxPerSec;
  const viewStartSec = scrollLeft / pxPerSec;
  const viewEndSec = viewStartSec + (viewportWidth || 0) / pxPerSec;
  
  // 🔄 UPDATE REFS (for RAF loop access without waiting for React render!)
  currentTimeRef.current = currentTime; // Already declared above - just update
  viewStartSecRef.current = viewStartSec;
  pxPerSecRef.current = pxPerSec;
  isPlayingRef.current = isPlaying;
  isBookProjectRef.current = isBookProject;
  
  // 🚀 START/STOP PLAYBACK: Capture timestamp for delta time interpolation
  useEffect(() => {
    if (isPlaying) {
      rafPlaybackStartTimeRef.current = performance.now();
      rafPlaybackStartCurrentTimeRef.current = currentTimeRef.current; // ✅ Use Ref to get CURRENT position!
      console.log('[RAF] ▶️ Playback started at:', currentTimeRef.current);
    } else {
      console.log('[RAF] ⏸️ Playback paused at:', currentTimeRef.current);
    }
  }, [isPlaying]); // ⚠️ CRITICAL: Only trigger on isPlaying change, NOT currentTime!
  
  // 🚀 SMOOTH PLAYHEAD ANIMATION (60fps via RAF with DELTA TIME INTERPOLATION!)
  useEffect(() => {
    const updatePlayheadPositions = () => {
      let displayTime: number;
      
      if (isPlayingRef.current) {
        // 🎯 ALL PROJECTS: INTERPOLATE time based on elapsed milliseconds (SMOOTH 60fps!)
        const elapsed = (performance.now() - rafPlaybackStartTimeRef.current) / 1000; // convert to seconds
        displayTime = rafPlaybackStartCurrentTimeRef.current + elapsed;
        
        // 🔄 AUTO-SYNC: Only re-anchor on LARGE jumps (e.g. scene change), ignore normal State stuttering
        const drift = Math.abs(displayTime - currentTimeRef.current);
        if (drift > 3.0) { // ONLY sync if drift > 3 seconds (= real scene jump, not State stutter!)
          console.log('[RAF] 🔄 Large drift detected, re-syncing:', drift.toFixed(2), 's');
          rafPlaybackStartTimeRef.current = performance.now();
          rafPlaybackStartCurrentTimeRef.current = currentTimeRef.current;
          displayTime = currentTimeRef.current;
        }
        // Otherwise: Use smooth interpolated time, IGNORE stuttering State!
        
        // Update currentTimeRef so Book Playback Loop can read it
        currentTimeRef.current = displayTime;

        if (displayTime >= duration) {
          displayTime = duration;
          currentTimeRef.current = duration;
          setCurrentTime(duration);
          setIsPlaying(false);
        }
        
        // Throttle State updates for UI display (max 10x/sec)
        if (performance.now() - lastStateUpdateTimeRef.current > 100) {
          setCurrentTime(displayTime);
          lastStateUpdateTimeRef.current = performance.now();
        }
      } else {
        // 🎯 PAUSED: Use ref (updated by scrubbing)
        displayTime = currentTimeRef.current;
      }
      
      // Calculate pixel position (independent of React render cycle!)
      const pixelPosition = (displayTime - viewStartSecRef.current) * pxPerSecRef.current;
      
      // Update all playhead positions via direct DOM manipulation (GPU-accelerated)
      if (playheadRulerRef.current) {
        playheadRulerRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadBeatRef.current) {
        playheadBeatRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadActRef.current) {
        playheadActRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadSequenceRef.current) {
        playheadSequenceRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadSceneRef.current) {
        playheadSceneRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadShotRef.current) {
        playheadShotRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadMusicRef.current) {
        playheadMusicRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      if (playheadSfxRef.current) {
        playheadSfxRef.current.style.transform = `translateX(${pixelPosition}px)`;
      }
      
      // Continue animation loop (always running!)
      smoothPlayheadRAF.current = requestAnimationFrame(updatePlayheadPositions);
    };
    
    // Start smooth animation loop (runs continuously at 60fps!)
    smoothPlayheadRAF.current = requestAnimationFrame(updatePlayheadPositions);
    
    return () => {
      if (smoothPlayheadRAF.current) {
        cancelAnimationFrame(smoothPlayheadRAF.current);
        smoothPlayheadRAF.current = null;
      }
    };
  }, []); // Only run once on mount!
  
  // 📏 DYNAMIC TICKS (adaptive intervals based on zoom!)
  const tickStep = getTimeMarkerInterval(pxPerSec);
  const firstTick = Math.floor(viewStartSec / tickStep) * tickStep;
  const lastTick = Math.ceil(viewEndSec / tickStep) * tickStep;
  
  const ticks: { x: number; label: string; sec: number }[] = [];
  for (let t = firstTick; t <= lastTick; t += tickStep) {
    const x = (t - viewStartSec) * pxPerSec;
    ticks.push({ x, label: formatTimeLabel(t), sec: t });
  }
  
  console.log('[VideoEditorTimeline] 📏 Ticks (adaptive):', {
    pxPerSec: pxPerSec.toFixed(2),
    tickStep: `${tickStep}s`,
    tickCount: ticks.length,
    firstTick: formatTimeLabel(firstTick),
    lastTick: formatTimeLabel(lastTick)
  });
  
  // 🎯 ZOOM HANDLER (with anchor)
  const setZoomAroundCursor = (newZoom: number, anchorX?: number) => {
    const el = scrollRef.current;
    
    // Calculate new pxPerSec with current fitPxPerSec
    const nextPx = pxPerSecFromZoom(newZoom, fitPxPerSec);
    
    if (!el || !viewportWidth) {
      setZoom(newZoom);
      setPxPerSec(nextPx);
      return;
    }
    
    // Calculate anchor-based scroll position
    const oldPx = pxPerSec;
    const cursorX = anchorX ?? viewportWidth / 2;
    const unitUnderCursor = (el.scrollLeft + cursorX) / oldPx;
    const newScrollLeft = unitUnderCursor * nextPx - cursorX;
    
    // Update state
    setZoom(newZoom);
    setPxPerSec(nextPx);
    
    // Update scroll position after render
    requestAnimationFrame(() => {
      el.scrollLeft = newScrollLeft;
    });
  };
  
  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Number(e.target.value);
    setZoomAroundCursor(newZoom);
  };
  
  // 🎯 TRACKPAD ZOOM (Ctrl+Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.001; // Negative because wheel down = zoom out
      const newZoom = Math.max(0, Math.min(1, zoom + zoomDelta));
      
      // Get cursor position relative to viewport
      const rect = scrollRef.current?.getBoundingClientRect();
      const cursorX = rect ? e.clientX - rect.left : viewportWidth / 2;
      
      setZoomAroundCursor(newZoom, cursorX);
    }
  };
  
  // 📊 LOAD TIMELINE DATA (props → context hydrate → single batch fetch)
  useEffect(() => {
    if (!initialData) return;
    // Während Trim: kein Überschreiben aus Props — sonst neue initialData-Referenzen (Parent-Re-Renders)
    // resetten timelineData und kollidieren mit manual*TimingsRef / Live-Vorschau (Acts stapeln sich).
    if (
      clipTrimActiveRef.current ||
      beatTrimActiveRef.current ||
      trimingClipRef.current ||
      nleClipDragRef.current ||
      trimEngine.isBeatTrimActive()
    ) {
      return;
    }
    setTimelineData(initialData);
    setIsLoadingData(false);
  }, [initialData]);
  
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (timelineData) return;

      if (timelineCtx) {
        const has =
          timelineCtx.acts.length > 0 ||
          timelineCtx.sequences.length > 0 ||
          timelineCtx.scenes.length > 0;
        if (has) {
          const data = isBookProject
            ? enrichBookTimelineData(timelineCtx.getBookTimelineData())
            : (timelineCtx.getTimelineData() as TimelineData);
          setTimelineData(data);
          setIsLoadingData(false);
          return;
        }
      }

      try {
        setIsLoadingData(true);
        const token = await getAccessToken();
        if (!token || cancelled) return;

        const data = await loadProjectTimelineBundle(projectId, token, isBookProject);
        if (cancelled) return;
          
          setTimelineData(data);
          onDataChange?.(data);
      } catch (error) {
        console.error('[VideoEditorTimeline] Error loading timeline data:', error);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    timelineData,
    isBookProject,
    getAccessToken,
    onDataChange,
    timelineCtx,
    timelineCtx?.acts.length,
    timelineCtx?.sequences.length,
    timelineCtx?.scenes.length,
  ]);

  // PHASE1: One-time migration — create one editorial clip per shot from film geometry when none exist.
  useEffect(() => {
    if (isBookProject) return;
    if (!timelineData || !('shots' in timelineData)) return;
    const td = timelineData as TimelineData;
    const shots = td.shots || [];
    const existing = td.clips || [];
    if (existing.length > 0) {
      clipMigrationAttemptedRef.current = true;
      return;
    }
    if (shots.length === 0) return;
    if (clipMigrationAttemptedRef.current) return;
    clipMigrationAttemptedRef.current = true;

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const timings: FilmManualTimings = {
          manualActTimings: manualActTimingsRef.current,
          manualSequenceTimings: manualSequenceTimingsRef.current,
          manualSceneTimings: manualSceneTimingsRef.current,
          manualShotDurations: manualShotDurationsRef.current,
        };
        const effective = buildEffectiveFilmTimelineData(td, timings);
        if (!effective) return;
        const spans = computeFilmShotSpans(effective, duration, timings);
        for (const s of spans) {
          try {
            await ClipsAPI.createClip(
              {
                projectId,
                shotId: s.shotId,
                sceneId: s.sceneId,
                startSec: s.startSec,
                endSec: s.endSec,
                laneIndex: 0,
                orderIndex: s.orderIndex,
              },
              token
            );
          } catch (e) {
            console.warn('[VideoEditorTimeline] clip migration skipped for shot', s.shotId, e);
          }
        }
        const list = await ClipsAPI.listClipsByProject(projectId, token);
        setTimelineData((prev) => {
          if (!prev || !('shots' in prev)) return prev;
          return { ...(prev as TimelineData), clips: list };
        });
        onDataChange?.({ ...(td as TimelineData), clips: list });
      } catch (e) {
        console.error('[VideoEditorTimeline] clip migration failed', e);
      }
    })();
  }, [isBookProject, timelineData, duration, projectId, getAccessToken, onDataChange]);
  
  // 🛠️ AUTO-FIX OVERLAPS: Repair all overlapping beats
  const fixOverlappingBeats = (beatsToFix: BeatsAPI.StoryBeat[]): BeatsAPI.StoryBeat[] => {
    if (beatsToFix.length === 0) return beatsToFix;
    
    console.log('[Beat Auto-Fix] 🔧 Checking for overlaps...');
    
    // Sort beats by pct_from
    const sorted = [...beatsToFix].sort((a, b) => a.pct_from - b.pct_from);
    
    let hasOverlaps = false;
    const fixed: BeatsAPI.StoryBeat[] = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const beat = { ...sorted[i] };
      
      if (i > 0) {
        const prevBeat = fixed[i - 1];
        
        // Check if this beat overlaps with previous
        if (beat.pct_from < prevBeat.pct_to) {
          hasOverlaps = true;
          console.log(`[Beat Auto-Fix] ⚠️ OVERLAP DETECTED: "${beat.label}" (${beat.pct_from.toFixed(1)}-${beat.pct_to.toFixed(1)}%) overlaps with "${prevBeat.label}" (${prevBeat.pct_from.toFixed(1)}-${prevBeat.pct_to.toFixed(1)}%)`);
          
          // Fix: Move this beat to start right after the previous beat
          const originalLength = beat.pct_to - beat.pct_from;
          beat.pct_from = prevBeat.pct_to;
          beat.pct_to = beat.pct_from + originalLength;
          
          // Clamp to 100%
          if (beat.pct_to > 100) {
            beat.pct_to = 100;
          }
          
          console.log(`[Beat Auto-Fix] ✅ FIXED: "${beat.label}" moved to ${beat.pct_from.toFixed(1)}-${beat.pct_to.toFixed(1)}%`);
        }
      }
      
      fixed.push(beat);
    }
    
    if (hasOverlaps) {
      console.log('[Beat Auto-Fix] 🎉 All overlaps fixed!');
    } else {
      console.log('[Beat Auto-Fix] ✅ No overlaps detected');
    }
    
    return fixed;
  };
  
  // 🎬 LOAD BEATS
  useEffect(() => {
    console.log('[VideoEditorTimeline] 🎬 Beat loading effect triggered:', {
      hasParentBeats: !!parentBeats,
      parentBeatsLength: parentBeats?.length || 0,
      parentBeatsType: Array.isArray(parentBeats) ? 'array' : typeof parentBeats,
      parentBeats: parentBeats
    });
    
    if (parentBeats && Array.isArray(parentBeats) && parentBeats.length > 0) {
      console.log('[VideoEditorTimeline] ✅ Using parentBeats:', parentBeats.length, 'beats');
      const convertedBeats: BeatsAPI.StoryBeat[] = parentBeats.map(beat => ({
        id: beat.id || '',
        project_id: projectId,
        user_id: '',
        label: beat.label || '',
        template_abbr: beat.templateAbbr,
        description: beat.description,
        from_container_id: '',
        to_container_id: '',
        pct_from: beat.pctFrom || 0,
        pct_to: beat.pctTo || 0,
        color: beat.color,
        notes: beat.notes,
        order_index: 0,
        created_at: '',
        updated_at: '',
      }));
      
      // 🛠️ Auto-fix overlaps
      const fixedBeats = fixOverlappingBeats(convertedBeats);
      setBeats(fixedBeats);
      
      // 🎯 Template beats are NOT in DB yet, so dbBeatIds stays empty
      setDbBeatIds(new Set());
    } else {
      console.log('[VideoEditorTimeline] 📥 Loading beats from API...');
      const loadBeats = async () => {
        try {
          setBeatsLoading(true);
          const fetchedBeats = await BeatsAPI.getBeats(projectId);
          console.log('[VideoEditorTimeline] ✅ Loaded', fetchedBeats.length, 'beats from API');
          
          // 🛠️ Auto-fix overlaps
          const fixedBeats = fixOverlappingBeats(fetchedBeats);
          setBeats(fixedBeats);
          
          // 🎯 Track DB beat IDs
          setDbBeatIds(new Set(fixedBeats.map(b => b.id)));
        } catch (error) {
          console.error('[VideoEditorTimeline] Failed to load beats:', error);
        } finally {
          setBeatsLoading(false);
        }
      };
      
      loadBeats();
    }
  }, [projectId, parentBeats]);
  
  // 🎯 MAP BEATS TO PIXELS (MEMOIZED for performance!)
  const beatBlocks = useMemo(() => {
    const start = performance.now();
    const result = beats.map(beat => {
      const rawStartSec = (Number(beat.pct_from) / 100) * duration;
      const rawEndSec = (Number(beat.pct_to) / 100) * duration;

      // Guard against invalid/negative ranges so CSS width never becomes invalid.
      const startSec = Number.isFinite(rawStartSec) && Number.isFinite(rawEndSec)
        ? Math.min(rawStartSec, rawEndSec)
        : 0;
      const endSec = Number.isFinite(rawStartSec) && Number.isFinite(rawEndSec)
        ? Math.max(rawStartSec, rawEndSec)
        : 0;

      const x = (startSec - viewStartSec) * pxPerSec;
      const rawWidth = (endSec - startSec) * pxPerSec;
      const width = Math.max(2, Number.isFinite(rawWidth) ? rawWidth : 2);
      
      return {
        ...beat,
        startSec,
        endSec,
        x,
        width,
        visible:
          !isBookProject ||
          (endSec >= viewStartSec && startSec <= viewEndSec),
      };
    });
    const elapsed = performance.now() - start;
    if (elapsed > 5) {
      console.warn(`[VideoEditorTimeline] ⚠️ beatBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 5ms)`);
    }
    return result;
  }, [beats, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject]);
  
  /**
   * Delete a beat and apply ripple effect
   * @param beatId - ID of beat to delete
   */
  const handleDeleteBeat = async (beatId: string) => {
    const beatToDelete = beats.find(b => b.id === beatId);
    if (!beatToDelete) return;
    
    const originalBeats = [...beats];
    
    try {
      // Delete from database
      await BeatsAPI.deleteBeat(beatId);
      
      // Calculate duration for ripple
      const startSec = (beatToDelete.pct_from / 100) * duration;
      const endSec = (beatToDelete.pct_to / 100) * duration;
      const deletedDuration = endSec - startSec;
      
      // Remove from local state
      const remainingBeats = beats.filter(b => b.id !== beatId);
      
      if (!beatMagnetEnabled) {
        setBeats(remainingBeats);
        console.log('[Beat Delete] ✅ Beat deleted (no ripple)');
        return;
      }
      
      // Apply ripple: shift all beats after deleted beat to the left
      const beatsToUpdate: BeatsAPI.StoryBeat[] = [];
      const withRipple = remainingBeats.map(beat => {
        const beatStartSec = (beat.pct_from / 100) * duration;
        const beatEndSec = (beat.pct_to / 100) * duration;
        
        if (beatStartSec >= endSec) {
          const newStartSec = beatStartSec - deletedDuration;
          const newEndSec = beatEndSec - deletedDuration;
          
          const newPctFrom = Math.max(0, Math.min(100, (newStartSec / duration) * 100));
          const newPctTo = Math.max(0, Math.min(100, (newEndSec / duration) * 100));
          
          const updatedBeat = {
            ...beat,
            pct_from: newPctFrom,
            pct_to: newPctTo,
          };
          
          beatsToUpdate.push(updatedBeat);
          return updatedBeat;
        }
        
        return beat;
      });
      
      // Update all rippled beats in database sequentially
      for (const beat of beatsToUpdate) {
        await BeatsAPI.updateBeat(beat.id, { pct_from: beat.pct_from, pct_to: beat.pct_to });
      }
      
      setBeats(withRipple);
      console.log('[Beat Delete] 🧲 Ripple applied:', { beatId, deletedDuration, updatedCount: beatsToUpdate.length });
    } catch (error) {
      console.error('[Beat Delete] ❌ Error:', error);
      // Revert to original state on error
      setBeats(originalBeats);
    }
  };
  
  // ⚠️ DEPRECATED: Old inline calculation (replaced by memoized version below)
  // Kept for reference only - not used in render
  const actBlocks_DEPRECATED = (timelineData?.acts || []).map((act, actIndex) => {
    if (isBookProject && readingSpeedWpm) {
      // 📖 BOOK: Position based on cumulative duration
      // Acts with text: duration = (wordCount / wpm) * 60
      // Empty acts: duration = DEFAULT_EMPTY_ACT_SECONDS
      const acts = timelineData?.acts || [];
      const sequences = timelineData?.sequences || [];
      const scenes = timelineData?.scenes || [];
      
      // 🚀 CALCULATE: Act word count from scenes (since acts are containers)
      const getActWordCount = (actId: string): number => {
        const actSequences = sequences.filter(s => s.actId === actId);
        const actScenes = scenes.filter(sc => actSequences.some(seq => seq.id === sc.sequenceId));
        
        return actScenes.reduce((sum, sc) => {
          // Try DB wordCount first
          const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
          if (dbWordCount > 0) return sum + dbWordCount;
          
          // Fallback: Calculate from content
          const contentWordCount = calculateWordCountFromContent(sc.content);
          return sum + contentWordCount;
        }, 0);
      };
      
      // Calculate start time (cumulative duration of all previous acts)
      let startSec = 0;
      for (let i = 0; i < actIndex; i++) {
        const prevAct = acts[i];
        const prevActWordCount = getActWordCount(prevAct.id);
        
        if (prevActWordCount > 0) {
          startSec += (prevActWordCount / readingSpeedWpm) * 60; // Seconds
        } else {
          startSec += DEFAULT_EMPTY_ACT_MIN * 60; // 300 seconds
        }
      }
      
      // Calculate this act's duration
      const actWordCount = getActWordCount(act.id);
      const actDuration = (actWordCount > 0)
        ? (actWordCount / readingSpeedWpm) * 60
        : DEFAULT_EMPTY_ACT_MIN * 60;
      
      const endSec = startSec + actDuration;
      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;
      
      console.log(`[VideoEditorTimeline] 📊 Act "${act.title}": ${actWordCount} words → ${(actDuration / 60).toFixed(2)} min (${startSec.toFixed(0)}s - ${endSec.toFixed(0)}s)`);
      
      return {
        ...act,
        wordCount: actWordCount, // Include calculated word count
        startSec,
        endSec,
        x,
        width,
        visible: endSec >= viewStartSec && startSec <= viewEndSec,
      };
    } else {
      // 🎬 FILM: Equal distribution
      const totalActs = timelineData?.acts?.length || 1;
      const actDuration = duration / totalActs;
      const startSec = actIndex * actDuration;
      const endSec = (actIndex + 1) * actDuration;
      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;
      
      return {
        ...act,
        startSec,
        endSec,
        x,
        width,
        visible: endSec >= viewStartSec && startSec <= viewEndSec,
      };
    }
  });
  
  const effectiveTimelineData = useMemo(() => {
    if (!timelineData || isBookProject) return timelineData;

    const withActTimings = timelineData.acts?.map((act: any) => {
      const o = manualActTimings[act.id];
      if (!o) return act;
      return {
        ...act,
        metadata: {
          ...(act.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    });

    const withSequenceTimings = timelineData.sequences?.map((seq: any) => {
      const o = manualSequenceTimings[seq.id];
      if (!o) return seq;
      return {
        ...seq,
        metadata: {
          ...(seq.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    });

    const withSceneTimings = timelineData.scenes?.map((scene: any) => {
      const o = manualSceneTimings[scene.id];
      if (!o) return scene;
      return {
        ...scene,
        metadata: {
          ...(scene.metadata || {}),
          pct_from: o.pct_from,
          pct_to: o.pct_to,
        },
      };
    });

    return {
      ...timelineData,
      acts: withActTimings,
      sequences: withSequenceTimings,
      scenes: withSceneTimings,
    };
  }, [
    timelineData,
    isBookProject,
    manualActTimings,
    manualSequenceTimings,
    manualSceneTimings,
  ]);
  
  // 🚀 OPTIMIZED: Memoized act blocks calculation
  const actBlocks = useMemo(() => {
    const start = performance.now();
    const result = calculateActBlocks(
      effectiveTimelineData,
      duration,
      viewStartSec,
      viewEndSec,
      pxPerSec,
      isBookProject,
      readingSpeedWpm
    );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ actBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [
    effectiveTimelineData,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    readingSpeedWpm,
  ]);

  const liveActPctByActTrim = useMemo(() => {
    void actTrimLayoutTick;
    if (isBookProject || !timelineData || !('acts' in timelineData)) return null;
    const actTrimLive =
      trimingClip?.kind === 'act' || clipTrimActiveRef.current?.kind === 'act';
    if (!actTrimLive) return null;
    return buildFullActPctPreviewMapForTrim(
      timelineData as TimelineData,
      manualActTimingsRef.current,
      duration,
      actTrimBlocksSnapshotRef.current
    );
  }, [isBookProject, timelineData, trimingClip, actTrimLayoutTick, duration]);

  /** Film: doppelte act.id in timelineData → mehrere Blöcke gleicher left/width (gestapelte Titel). Nur erste Instanz rendern. */
  const filmActRowBlocks = useMemo(() => {
    const vis = actBlocks.filter((a) => a.visible);
    if (isBookProject) return vis;
    const seen = new Set<string>();
    const out: typeof vis = [];
    for (const a of vis) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
    return out;
  }, [actBlocks, isBookProject]);

  
  // ⚠️ DEPRECATED: Old inline calculation (replaced by memoized version below)
  // Kept for reference only - not used in render
  const sequenceBlocks_DEPRECATED: any[] = [];
  
  if (isBookProject && totalWords && readingSpeedWpm) {
    // 📖 BOOK: Position based on ACTUAL word count from scenes
    const acts = timelineData?.acts || [];
    const sequences = timelineData?.sequences || [];
    const scenes = timelineData?.scenes || [];
    const secondsPerWord = 60 / readingSpeedWpm;
    
    // 🚀 HELPER: Calculate sequence word count from scenes
    const getSequenceWordCount = (sequenceId: string): number => {
      const seqScenes = scenes.filter(sc => sc.sequenceId === sequenceId);
      return seqScenes.reduce((sum, sc) => {
        // Try DB wordCount first
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        if (dbWordCount > 0) return sum + dbWordCount;
        
        // Fallback: Calculate from content
        return sum + calculateWordCountFromContent(sc.content);
      }, 0);
    };
    
    let wordsSoFar = 0;
    
    acts.forEach((act) => {
      const actSequences = sequences.filter(s => s.actId === act.id);
      
      actSequences.forEach((sequence) => {
        const seqWords = getSequenceWordCount(sequence.id);
        
        if (seqWords > 0) {
          const startSec = wordsSoFar * secondsPerWord;
          const endSec = (wordsSoFar + seqWords) * secondsPerWord;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;
          
          console.log(`[VideoEditorTimeline] 📗 Seq "${sequence.title}": ${seqWords} words → ${startSec.toFixed(0)}s - ${endSec.toFixed(0)}s`);
          
          sequenceBlocks_DEPRECATED.push({
            ...sequence,
            wordCount: seqWords,
            startSec,
            endSec,
            x,
            width,
            visible: endSec >= viewStartSec && startSec <= viewEndSec,
          });
          
          wordsSoFar += seqWords;
        }
      });
      
      // Add empty act padding if act had no sequences with text
      const actSequenceWords = actSequences.reduce((sum, seq) => sum + getSequenceWordCount(seq.id), 0);
      if (actSequenceWords === 0) {
        // Empty act: add default duration
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord; // Convert 5 min to words
      }
    });
  } else {
    // 🎬 FILM: Equal distribution within acts
    (timelineData?.acts || []).forEach((act, actIndex) => {
      const sequences = (timelineData?.sequences || []).filter(s => s.actId === act.id);
      const totalActs = timelineData?.acts?.length || 1;
      const actDuration = duration / totalActs;
      const actStartSec = actIndex * actDuration;
      const sequenceDuration = sequences.length > 0 ? actDuration / sequences.length : actDuration;
      
      sequences.forEach((sequence, seqIndex) => {
        const startSec = actStartSec + seqIndex * sequenceDuration;
        const endSec = startSec + sequenceDuration;
        const x = (startSec - viewStartSec) * pxPerSec;
        const width = (endSec - startSec) * pxPerSec;
        
        sequenceBlocks_DEPRECATED.push({
          ...sequence,
          startSec,
          endSec,
          x,
          width,
          visible: endSec >= viewStartSec && startSec <= viewEndSec,
        });
      });
    });
  }
  
  // 🚀 OPTIMIZED: Memoized sequence blocks calculation
  const sequenceBlocks = useMemo(() => {
    const start = performance.now();
    const result = calculateSequenceBlocks(
      effectiveTimelineData,
      duration,
      viewStartSec,
      viewEndSec,
      pxPerSec,
      isBookProject,
      totalWords,
      readingSpeedWpm
    );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ sequenceBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [
    effectiveTimelineData,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    totalWords,
    readingSpeedWpm,
  ]);
  
  // ⚠️ DEPRECATED: Old inline calculation (replaced by memoized version below)
  // Kept for reference only - not used in render
  const sceneBlocks_DEPRECATED: any[] = [];
  
  if (isBookProject && readingSpeedWpm) {
    // 📖 BOOK: Position based on word count from content
    const scenes = timelineData?.scenes || [];
    const sequences = timelineData?.sequences || [];
    const acts = timelineData?.acts || [];
    const secondsPerWord = 60 / readingSpeedWpm;
    
    let wordsSoFar = 0;
    
    acts.forEach((act) => {
      const actSequences = sequences.filter(s => s.actId === act.id);
      
      actSequences.forEach((sequence) => {
        const seqScenes = scenes.filter(sc => sc.sequenceId === sequence.id);
        
        seqScenes.forEach((scene) => {
          // Calculate scene word count from content
          const dbWordCount = scene.metadata?.wordCount || scene.wordCount || 0;
          const sceneWords = dbWordCount > 0
            ? dbWordCount
            : calculateWordCountFromContent(scene.content);
          
          if (sceneWords > 0) {
            const startSec = wordsSoFar * secondsPerWord;
            const endSec = (wordsSoFar + sceneWords) * secondsPerWord;
            const x = (startSec - viewStartSec) * pxPerSec;
            const width = (endSec - startSec) * pxPerSec;
            
            console.log(`[VideoEditorTimeline] �� Scene "${scene.title}": ${sceneWords} words → ${startSec.toFixed(0)}s - ${endSec.toFixed(0)}s`);
            
            sceneBlocks_DEPRECATED.push({
              ...scene,
              wordCount: sceneWords,
              startSec,
              endSec,
              x,
              width,
              visible: endSec >= viewStartSec && startSec <= viewEndSec,
            });
            
            wordsSoFar += sceneWords;
          }
        });
      });
      
      // Add empty act padding if act had no scenes with text
      const actScenes = scenes.filter(sc => actSequences.some(seq => seq.id === sc.sequenceId));
      const actSceneWords = actScenes.reduce((sum, sc) => {
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        return sum + (dbWordCount > 0 ? dbWordCount : calculateWordCountFromContent(sc.content));
      }, 0);
      
      if (actSceneWords === 0) {
        // Empty act: add default duration
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord; // Convert 5 min to words
      }
    });
  } else {
    // 🎬 FILM: Equal distribution within sequences
    (timelineData?.acts || []).forEach((act, actIndex) => {
      const sequences = (timelineData?.sequences || []).filter(s => s.actId === act.id);
      const totalActs = timelineData?.acts?.length || 1;
      const actDuration = duration / totalActs;
      const actStartSec = actIndex * actDuration;
      const sequenceDuration = sequences.length > 0 ? actDuration / sequences.length : actDuration;
      
      sequences.forEach((sequence, seqIndex) => {
        const scenes = (timelineData?.scenes || []).filter(sc => sc.sequenceId === sequence.id);
        const seqStartSec = actStartSec + seqIndex * sequenceDuration;
        const sceneDuration = scenes.length > 0 ? sequenceDuration / scenes.length : sequenceDuration;
        
        scenes.forEach((scene, sceneIndex) => {
          const startSec = seqStartSec + sceneIndex * sceneDuration;
          const endSec = startSec + sceneDuration;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;
          
          sceneBlocks_DEPRECATED.push({
            ...scene,
            startSec,
            endSec,
            x,
            width,
            visible: endSec >= viewStartSec && startSec <= viewEndSec,
          });
        });
      });
    });
  }
  
  // 🚀 OPTIMIZED: Memoized scene blocks calculation
  const sceneBlocks = useMemo(() => {
    const start = performance.now();
    const result = calculateSceneBlocks(
      effectiveTimelineData,
      duration,
      viewStartSec,
      viewEndSec,
      pxPerSec,
      isBookProject,
      readingSpeedWpm
    );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ sceneBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [
    effectiveTimelineData,
    duration,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    readingSpeedWpm,
  ]);

  const shotBlocks = useMemo(() => {
    if (isBookProject || !effectiveTimelineData || !('shots' in effectiveTimelineData) || !effectiveTimelineData.shots?.length) {
      return [];
    }

    const sceneById = new Map(sceneBlocks.map((scene: any) => [scene.id, scene]));
    const shotsByScene = new Map<string, any[]>();

    for (const shot of effectiveTimelineData.shots) {
      const sceneId = (shot as any).sceneId || (shot as any).scene_id;
      if (!sceneId) continue;
      const current = shotsByScene.get(sceneId) || [];
      current.push(shot);
      shotsByScene.set(sceneId, current);
    }

    const getShotDurationSec = (shot: any): number | null => {
      const override = manualShotDurations[shot.id];
      if (override !== undefined) return override;

      const mRaw = shot.shotlengthMinutes ?? shot.shotlength_minutes;
      const sRaw = shot.shotlengthSeconds ?? shot.shotlength_seconds;
      if (typeof sRaw === 'number' && Number.isFinite(sRaw) && sRaw >= 0) {
        const m =
          typeof mRaw === 'number' && Number.isFinite(mRaw)
            ? Math.max(0, Math.floor(mRaw))
            : 0;
        const s = Math.round(sRaw);
        const total = m * 60 + s;
        if (total > 0) return total;
      }

      const stored = shot.durationSeconds;
      if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
        return stored;
      }

      // Optional legacy parsing (best-effort).
      if (typeof shot.duration === 'string') {
        // e.g. "3s" or "0:05"
        const s = shot.duration.trim();
        if (s.endsWith('s')) {
          const n = Number(s.slice(0, -1));
          if (Number.isFinite(n) && n > 0) return n;
        }
      }

      return null;
    };

    const blocks: any[] = [];

    for (const [sceneId, sceneShots] of shotsByScene.entries()) {
      const scene = sceneById.get(sceneId);
      if (!scene) continue;

      const orderedShots = [...sceneShots].sort((a, b) => {
        const orderA = (a as any).orderIndex ?? (a as any).order_index ?? 0;
        const orderB = (b as any).orderIndex ?? (b as any).order_index ?? 0;
        return orderA - orderB;
      });

      const sceneDuration = Math.max(0, scene.endSec - scene.startSec);

      const storedDurations = orderedShots.map(getShotDurationSec);
      const allDurationsValid = storedDurations.every((d) => typeof d === 'number' && (d as number) > 0);

      // If we have persisted durations for all shots, use them (scaled to fit this scene).
      // Otherwise fall back to equal distribution (so initial projects still render).
      let durations: number[];
      if (allDurationsValid && sceneDuration > 0) {
        const totalStored = (storedDurations as number[]).reduce((sum, d) => sum + d, 0);
        const scale = totalStored > 0 ? sceneDuration / totalStored : 1;
        const raw = (storedDurations as number[]).map((d) => Math.max(MIN_CLIP_DURATION_SEC, d * scale));
        const sumAfterClamp = raw.reduce((sum, d) => sum + d, 0);
        const renorm = sumAfterClamp > 0 ? sceneDuration / sumAfterClamp : 1;
        durations = raw.map((d) => d * renorm);
      } else {
        const slotDuration = sceneDuration / Math.max(1, orderedShots.length);
        durations = orderedShots.map(() => Math.max(MIN_CLIP_DURATION_SEC, slotDuration));
        // Renormalize to exact scene duration.
        const sum = durations.reduce((s, d) => s + d, 0);
        const renorm = sum > 0 ? sceneDuration / sum : 1;
        durations = durations.map((d) => d * renorm);
      }

      let cursor = scene.startSec;
      orderedShots.forEach((shot, index) => {
        const startSec = cursor;
        const endSec = startSec + durations[index];
        cursor = endSec;

        const x = (startSec - viewStartSec) * pxPerSec;
        const width = Math.max(2, (endSec - startSec) * pxPerSec);

        blocks.push({
          ...(shot as any),
          startSec,
          endSec,
          x,
          width,
          visible: true,
          label:
            (shot as any).shotNumber ||
            (shot as any).shot_number ||
            (shot as any).title ||
            `Shot ${index + 1}`,
        });
      });
    }

    return blocks;
  }, [
    isBookProject,
    effectiveTimelineData,
    sceneBlocks,
    viewStartSec,
    pxPerSec,
    manualShotDurations,
  ]);

  const clipBlocks = useMemo(() => {
    if (isBookProject || !effectiveTimelineData || !('clips' in effectiveTimelineData)) return [];
    const raw = ((effectiveTimelineData as TimelineData).clips || []) as Clip[];
    if (raw.length === 0) return [];
    return raw.map((c) => {
      const pv = nleClipPreview?.[c.id];
      const startSec = pv?.startSec ?? c.startSec;
      const endSec = pv?.endSec ?? c.endSec;
      return {
        ...c,
        startSec,
        endSec,
        x: (startSec - viewStartSec) * pxPerSec,
        width: Math.max(2, (endSec - startSec) * pxPerSec),
      };
    });
  }, [isBookProject, effectiveTimelineData, viewStartSec, pxPerSec, nleClipPreview]);

  actBlocksRef.current = actBlocks;
  sequenceBlocksRef.current = sequenceBlocks;
  sceneBlocksRef.current = sceneBlocks;
  shotBlocksRef.current = shotBlocks;
  clipBlocksRef.current = clipBlocks;

  const activePreviewShot = useMemo(() => {
    if (isBookProject || shotBlocks.length === 0) return null;
    const td = effectiveTimelineData as TimelineData | null;
    const clips = (td?.clips || []) as Clip[];
    if (clips.length > 0 && clipBlocks.length > 0) {
      const hit = clipBlocks.find(
        (c: any) => currentTime >= c.startSec && currentTime <= c.endSec
      );
      if (hit) {
        const shotId = (hit as any).shotId || (hit as any).shot_id;
        const fromShot = shotBlocks.find((s: any) => s.id === shotId);
        if (fromShot) return fromShot as any;
      }
    }
    const exact = shotBlocks.find((shot: any) => currentTime >= shot.startSec && currentTime <= shot.endSec);
    if (exact) return exact as any;
    const next = shotBlocks.find((shot: any) => shot.startSec >= currentTime);
    if (next) return next as any;
    return shotBlocks[shotBlocks.length - 1] as any;
  }, [currentTime, isBookProject, shotBlocks, effectiveTimelineData, clipBlocks]);

  const activePreviewImageUrl = useMemo(() => {
    const shot = activePreviewShot as any;
    if (!shot) return '';
    return shot.imageUrl || shot.image_url || shot.thumbnailUrl || shot.thumbnail_url || '';
  }, [activePreviewShot]);

  const addableKinds = useMemo<AddNodeKind[]>(() => {
    if (isBookProject) return ['act', 'sequence', 'scene'];
    return ['act', 'sequence', 'scene', 'shot'];
  }, [isBookProject]);

  const getParentOptions = useCallback(
    (kind: AddNodeKind): Array<{ id: string; label: string }> => {
      if (!timelineData) return [];
      if (kind === 'sequence') {
        return (timelineData.acts || []).map((a) => ({ id: a.id, label: a.title || labelByKind.act }));
      }
      if (kind === 'scene') {
        return (timelineData.sequences || []).map((s) => ({ id: s.id, label: s.title || labelByKind.sequence }));
      }
      if (kind === 'shot') {
        return (timelineData.scenes || []).map((s) => ({ id: s.id, label: s.title || labelByKind.scene }));
      }
      return [];
    },
    [timelineData, labelByKind.act, labelByKind.scene, labelByKind.sequence]
  );

  const createNodeAndRefresh = useCallback(
    async (kind: AddNodeKind, parentId?: string) => {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Nicht authentifiziert');
        return;
      }

      if (kind === 'act') {
        const next = (timelineData?.acts?.length || 0) + 1;
        await TimelineAPI.createAct(projectId, { title: `${labelByKind.act} ${next}` }, token);
      } else if (kind === 'sequence') {
        if (!parentId) throw new Error('Parent für Sequence fehlt');
        const next = (timelineData?.sequences?.filter((s) => s.actId === parentId).length || 0) + 1;
        await TimelineAPI.createSequence(parentId, { title: `${labelByKind.sequence} ${next}` }, token);
      } else if (kind === 'scene') {
        if (!parentId) throw new Error('Parent für Scene fehlt');
        const next = (timelineData?.scenes?.filter((s) => s.sequenceId === parentId).length || 0) + 1;
        await TimelineAPI.createScene(parentId, { title: `${labelByKind.scene} ${next}` }, token);
      } else if (kind === 'shot') {
        if (!parentId) throw new Error('Parent für Shot fehlt');
        const next = (timelineData && 'shots' in timelineData
          ? (timelineData.shots || []).filter((s: any) => s.sceneId === parentId || s.scene_id === parentId).length
          : 0) + 1;
        await ShotsAPI.createShot(
          parentId,
          {
            projectId,
            shotNumber: `${labelByKind.shot} ${next}`,
            description: '',
          } as any,
          token
        );
      }

      // Trigger the existing loader effect for source-of-truth refresh.
      setTimelineData(null);
      toast.success(`${labelByKind[kind]} hinzugefügt`);
    },
    [getAccessToken, labelByKind, projectId, timelineData]
  );

  const openAddDialogForKind = useCallback(
    (kind: AddNodeKind) => {
      const needsParent = kind !== 'act';
      if (!needsParent) {
        void createNodeAndRefresh(kind);
        return;
      }
      const options = getParentOptions(kind);
      if (options.length === 0) {
        toast.error(`Bitte zuerst ${labelByKind[kind === 'shot' ? 'scene' : kind === 'scene' ? 'sequence' : 'act']} anlegen`);
        return;
      }
      if (options.length === 1) {
        void createNodeAndRefresh(kind, options[0].id);
        return;
      }
      setPendingAddKind(kind);
      setSelectedParentId(options[0].id);
      setAddDialogOpen(true);
    },
    [createNodeAndRefresh, getParentOptions, labelByKind]
  );

  const handleConfirmAddWithParent = useCallback(async () => {
    if (!pendingAddKind || !selectedParentId) return;
    try {
      await createNodeAndRefresh(pendingAddKind, selectedParentId);
    } catch (error) {
      console.error('[VideoEditorTimeline] Add item failed:', error);
      toast.error('Element konnte nicht angelegt werden');
    } finally {
      setAddDialogOpen(false);
      setPendingAddKind(null);
      setSelectedParentId('');
    }
  }, [createNodeAndRefresh, pendingAddKind, selectedParentId]);

  const openDescriptionDialog = useCallback(
    (kind: AddNodeKind, id: string, title: string, currentDescription?: string) => {
      setEditingDescription({
        kind,
        id,
        title,
        description: currentDescription || '',
      });
      setDescriptionDialogOpen(true);
    },
    []
  );

  const commitDescriptionEdit = useCallback(async () => {
    if (!editingDescription) return;
    const token = await getAccessToken();
    if (!token) {
      toast.error('Nicht authentifiziert');
      return;
    }
    try {
      if (editingDescription.kind === 'act') {
        await TimelineAPI.updateAct(editingDescription.id, { description: editingDescription.description }, token);
      } else if (editingDescription.kind === 'sequence') {
        await TimelineAPI.updateSequence(editingDescription.id, { description: editingDescription.description }, token);
      } else if (editingDescription.kind === 'scene') {
        await TimelineAPI.updateScene(editingDescription.id, { description: editingDescription.description }, token);
      } else {
        await ShotsAPI.updateShot(editingDescription.id, { description: editingDescription.description } as any, token);
      }

      setTimelineData((prev) => {
        if (!prev) return prev;
        if (editingDescription.kind === 'act') {
          return {
            ...prev,
            acts: (prev.acts || []).map((a: any) =>
              a.id === editingDescription.id ? { ...a, description: editingDescription.description } : a
            ),
          };
        }
        if (editingDescription.kind === 'sequence') {
          return {
            ...prev,
            sequences: (prev.sequences || []).map((s: any) =>
              s.id === editingDescription.id ? { ...s, description: editingDescription.description } : s
            ),
          };
        }
        if (editingDescription.kind === 'scene') {
          return {
            ...prev,
            scenes: (prev.scenes || []).map((s: any) =>
              s.id === editingDescription.id ? { ...s, description: editingDescription.description } : s
            ),
          };
        }
        if ('shots' in prev) {
          return {
            ...prev,
            shots: ((prev as any).shots || []).map((s: any) =>
              s.id === editingDescription.id ? { ...s, description: editingDescription.description } : s
            ),
          } as TimelineData;
        }
        return prev;
      });

      toast.success('Beschreibung gespeichert');
      setDescriptionDialogOpen(false);
      setEditingDescription(null);
    } catch (error) {
      console.error('[VideoEditorTimeline] Description update failed:', error);
      toast.error('Beschreibung konnte nicht gespeichert werden');
    }
  }, [editingDescription, getAccessToken]);

  const startInlineTitleEdit = useCallback((kind: EditableTitleKind, id: string, currentTitle?: string) => {
    setEditingTitle({
      kind,
      id,
      value: currentTitle || '',
    });
  }, []);

  const cancelInlineTitleEdit = useCallback(() => {
    setEditingTitle(null);
  }, []);

  const commitInlineTitleEdit = useCallback(async () => {
    if (!editingTitle) return;
    const nextTitle = editingTitle.value.trim();
    if (!nextTitle) {
      toast.error('Titel darf nicht leer sein');
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      toast.error('Nicht authentifiziert');
      return;
    }
    try {
      if (editingTitle.kind === 'beat') {
        if (dbBeatIds.has(editingTitle.id)) {
          await BeatsAPI.updateBeat(editingTitle.id, { label: nextTitle });
        }
        setBeats((prev) =>
          prev.map((b) => (b.id === editingTitle.id ? { ...b, label: nextTitle } : b))
        );
        toast.success('Beat-Name gespeichert');
        setEditingTitle(null);
        return;
      }
      if (editingTitle.kind === 'act') {
        await TimelineAPI.updateAct(editingTitle.id, { title: nextTitle }, token);
      } else if (editingTitle.kind === 'sequence') {
        await TimelineAPI.updateSequence(editingTitle.id, { title: nextTitle }, token);
      } else if (editingTitle.kind === 'scene') {
        await TimelineAPI.updateScene(editingTitle.id, { title: nextTitle }, token);
      } else {
        await ShotsAPI.updateShot(editingTitle.id, { shotNumber: nextTitle } as any, token);
      }
      setTimelineData((prev) => {
        if (!prev) return prev;
        if (editingTitle.kind === 'act') {
          return { ...prev, acts: (prev.acts || []).map((a: any) => a.id === editingTitle.id ? { ...a, title: nextTitle } : a) };
        }
        if (editingTitle.kind === 'sequence') {
          return { ...prev, sequences: (prev.sequences || []).map((s: any) => s.id === editingTitle.id ? { ...s, title: nextTitle } : s) };
        }
        if (editingTitle.kind === 'scene') {
          return { ...prev, scenes: (prev.scenes || []).map((s: any) => s.id === editingTitle.id ? { ...s, title: nextTitle } : s) };
        }
        if ('shots' in prev) {
          return {
            ...prev,
            shots: ((prev as any).shots || []).map((s: any) =>
              s.id === editingTitle.id ? { ...s, shotNumber: nextTitle, shot_number: nextTitle } : s
            ),
          } as TimelineData;
        }
        return prev;
      });
      toast.success('Titel gespeichert');
      setEditingTitle(null);
    } catch (error) {
      console.error('[VideoEditorTimeline] Inline title update failed:', error);
      toast.error('Titel konnte nicht gespeichert werden');
    }
  }, [editingTitle, getAccessToken, dbBeatIds]);
  
  // 🎯 UPDATE REF: Store sceneBlocks for playback functions
  sceneBlocksRef.current = sceneBlocks;

  /** Delay single-click title open so double-click can open scene content without flashing the title modal first */
  const sceneTitleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (sceneTitleClickTimerRef.current) clearTimeout(sceneTitleClickTimerRef.current);
    };
  }, []);
  
  // 🚀 INITIAL TEXT LOAD: Load first scene text on mount
  useEffect(() => {
    if (isBookProject && sceneBlocks.length > 0 && wordsArray.length === 0) {
      const firstScene = sceneBlocks[0];
      const words = extractWordsFromContent(firstScene.content);
      
      if (words.length > 0) {
        console.log(`[VideoEditorTimeline] 📚 Loading initial text from "${firstScene.title}": ${words.length} words`);
        setCurrentSceneId(firstScene.id);
        setWordsArray(words);
        setCurrentWordIndex(0);
        setCurrentTime(firstScene.startSec);
      }
    }
  }, [isBookProject, sceneBlocks.length, wordsArray.length]);
  
  // 📖 PAGE MARKERS FOR BOOKS (adaptive intervals based on zoom!)
  const pageMarkers: { x: number; page: number }[] = [];
  
  if (isBookProject && wordsPerPage && readingSpeedWpm) {
    // Calculate page positions based on WORD COUNT
    // Page N = N × wordsPerPage words
    // Position = (words / readingSpeedWpm) × 60 seconds
    
    // Use adaptive page increment based on pxPerSec (intelligent spacing like time markers!)
    const pageIncrement = getPageMarkerInterval(pxPerSec, wordsPerPage, readingSpeedWpm);
    
    const estimatedTotalPages = (totalWords || 0) / wordsPerPage;
    const maxPages = targetPages || estimatedTotalPages;
    const firstPage = Math.floor(viewStartSec / 60 * readingSpeedWpm / wordsPerPage / pageIncrement) * pageIncrement;
    const lastPage = Math.ceil(viewEndSec / 60 * readingSpeedWpm / wordsPerPage / pageIncrement) * pageIncrement;
    
    for (let page = firstPage; page <= lastPage && page <= maxPages; page += pageIncrement) {
      // Position based on word count: page N is at (N × wordsPerPage) words
      const wordsAtPage = page * wordsPerPage;
      const pageSec = (wordsAtPage / readingSpeedWpm) * 60; // Convert to seconds
      const x = (pageSec - viewStartSec) * pxPerSec;
      pageMarkers.push({ x, page });
    }
    
    console.log('[VideoEditorTimeline] 📄 Page Markers (adaptive):', {
      pxPerSec: pxPerSec.toFixed(2),
      pageIncrement,
      wordsPerPage,
      readingSpeedWpm,
      totalWords,
      estimatedPages: estimatedTotalPages.toFixed(1),
      markerCount: pageMarkers.length,
      firstPage: firstPage.toFixed(1),
      lastPage: lastPage.toFixed(1),
      example: pageMarkers.length > 0 
        ? `Page ${pageMarkers[0].page}: ${(pageMarkers[0].page * wordsPerPage)} words = ${((pageMarkers[0].page * wordsPerPage / readingSpeedWpm) * 60).toFixed(1)}s`
        : 'none'
    });
  }
  
  // Handle playhead click
  const handlePlayheadClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    
    const rect = scrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = viewStartSec + clickX / pxPerSec;
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    
    setCurrentTime(clampedTime);
    currentTimeRef.current = clampedTime; // ✅ Also update Ref for RAF loop!
    
    // 📖 LOAD TEXT AT CURSOR POSITION (for book projects)
    if (isBookProject && sceneBlocksRef.current.length > 0) {
      const sceneAtTime = sceneBlocksRef.current.find(s => 
        clampedTime >= s.startSec && clampedTime <= s.endSec
      );
      
      if (sceneAtTime) {
        const words = extractWordsFromContent(sceneAtTime.content);
        
        if (words.length > 0) {
          // Calculate word index based on time within scene
          const timeIntoScene = clampedTime - sceneAtTime.startSec;
          const secondsPerWord = 60 / readingSpeedWpm;
          const wordIndex = Math.floor(timeIntoScene / secondsPerWord);
          
          console.log(`[Playhead] 📍 Jumped to scene "${sceneAtTime.title}" at word ${wordIndex}/${words.length}`);
          
          setCurrentSceneId(sceneAtTime.id);
          setWordsArray(words);
          setCurrentWordIndex(Math.min(wordIndex, words.length - 1));
        }
      }
    }
  };
  
  // Handle cursor drag start
  const handleCursorDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    
    const rect = scrollRef.current.getBoundingClientRect();
    const dragStartX = e.clientX - rect.left;
    const dragStartTime = currentTime;
    
    dragStartXRef.current = dragStartX;
    dragStartTimeRef.current = dragStartTime;
    setIsDraggingCursor(true);
  };
  
  // Handle cursor drag move
  const handleCursorDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCursor || !scrollRef.current) return;
    
    const rect = scrollRef.current.getBoundingClientRect();
    const dragCurrentX = e.clientX - rect.left;
    const dragStartX = dragStartXRef.current;
    const dragStartTime = dragStartTimeRef.current;
    
    const dragDeltaX = dragCurrentX - dragStartX;
    const dragDeltaSec = dragDeltaX / pxPerSec;
    
    const newTime = dragStartTime + dragDeltaSec;
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clampedTime);
    currentTimeRef.current = clampedTime; // ✅ Also update Ref for RAF loop!
    
    // 📖 UPDATE TEXT AT DRAG POSITION (for book projects)
    if (isBookProject && sceneBlocksRef.current.length > 0) {
      const sceneAtTime = sceneBlocksRef.current.find(s => 
        clampedTime >= s.startSec && clampedTime <= s.endSec
      );
      
      if (sceneAtTime) {
        const words = extractWordsFromContent(sceneAtTime.content);
        
        if (words.length > 0) {
          // Calculate word index based on time within scene
          const timeIntoScene = clampedTime - sceneAtTime.startSec;
          const secondsPerWord = 60 / readingSpeedWpm;
          const wordIndex = Math.floor(timeIntoScene / secondsPerWord);
          
          // Only update if scene changed or word changed significantly
          if (currentSceneId !== sceneAtTime.id || Math.abs(wordIndex - currentWordIndex) > 2) {
            setCurrentSceneId(sceneAtTime.id);
            setWordsArray(words);
            setCurrentWordIndex(Math.min(wordIndex, words.length - 1));
          }
        }
      }
    }
  };
  
  // Handle cursor drag end
  const handleCursorDragEnd = () => {
    if (isDraggingCursor) {
      console.log(`[Cursor] 🛑 Drag end at ${formatTimeLabel(currentTime)}`);
    }
    setIsDraggingCursor(false);
  };
  
  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    )}>
      {/* Preview Area - Word Display (Karaoke Style) */}
      <div className="flex-shrink-0 bg-card p-6 border-b border-border">
        <div className="text-sm text-muted-foreground mb-2">
          {isBookProject ? 'Text-Ansicht' : 'Videoplayer Ansicht'}
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="relative min-h-[200px] bg-muted rounded overflow-hidden border-2 border-border p-8">
            {isBookProject && wordsArray.length > 0 ? (
              // 📖 BOOK: 3-Sentence display with highlighted current word
              <TimelineTextPreview
                wordsArray={wordsArray}
                currentWordIndex={currentWordIndex}
                currentSceneTitle={sceneBlocks.find(s => s.id === currentSceneId)?.title}
              />
            ) : (
              // 🎬 FILM/SERIES/AUDIO: active shot preview with fallback
              <>
                {activePreviewImageUrl ? (
                <img 
                    src={activePreviewImageUrl}
                    alt={activePreviewShot?.label || 'Shot Preview'}
                  className="w-full h-full object-cover rounded"
                />
                ) : (
                  <div className="w-full h-full rounded bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">
                        {activePreviewShot?.label || 'Kein Shot aktiv'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {activePreviewShot ? 'Kein Bild fuer diesen Shot' : 'Fuege Shots hinzu oder bewege den Playhead'}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="default"
                    size="icon"
                    className="rounded-full bg-background/20 hover:bg-background/30 backdrop-blur-sm w-16 h-16"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause className="w-8 h-8 text-foreground" /> : <Play className="w-8 h-8 text-foreground ml-1" />}
                  </Button>
                </div>
              </>
            )}
            
            {!isBookProject && (
              <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-mono">
                {formatTimeLabel(currentTime)}
              </div>
            )}
          </div>
          
          {/* Playback Controls Below Preview */}
          {isBookProject && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={handlePlayPause}
                className="bg-primary hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="border-border"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
              <div className="flex-1 bg-muted px-3 py-1.5 rounded text-xs font-mono text-foreground border border-border">
                {formatTimeLabel(currentTime)} / {formatTimeLabel(duration)}
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                {readingSpeedWpm} WPM
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Timeline Controls */}
      <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-mono">
          Duration: {formatTimeLabel(duration)}
          {isBookProject && targetPages && (
            <span className="ml-4">Target: {targetPages} pages</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomAroundCursor(Math.max(0, zoom - 0.25))}
            className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
            title="Zoom out"
          >
            <Minus className="size-4 text-muted-foreground" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={zoom}
            onChange={handleZoomSlider}
            className="w-32"
            title={`${fitPxPerSec.toFixed(2)} - ${MAX_PX_PER_SEC} px/s`}
          />
          <button
            onClick={() => setZoomAroundCursor(Math.min(1, zoom + 0.25))}
            className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
            title="Zoom in"
          >
            <Plus className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="flex-1 flex">
        {/* Track Labels - Sticky Left */}
        <div className="w-24 min-w-[5.5rem] flex-shrink-0 bg-card border-r border-border">
          <div className="h-12 border-b border-border px-2 flex items-center bg-card">
            <span className="text-[9px] text-foreground font-medium">Zeit</span>
          </div>
          <div 
            className="border-b border-border px-2 flex items-center justify-between bg-card relative"
            style={{ height: `${trackHeights.beat}px` }}
          >
            <span className="text-[9px] text-foreground font-medium">Beat</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setBeatAutosnapEnabled(!beatAutosnapEnabled)}
                className={cn(
                  'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                  beatAutosnapEnabled ? 'opacity-100 text-primary' : 'opacity-35 text-muted-foreground'
                )}
                title={
                  beatAutosnapEnabled
                    ? 'Autosnap: an (Snapping am Beat-Trim)'
                    : 'Autosnap: aus'
                }
              >
                <Crosshair className="size-3.5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => setBeatMagnetEnabled(!beatMagnetEnabled)}
                className={cn(
                  'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                  beatMagnetEnabled ? 'opacity-100 text-primary' : 'opacity-35 text-muted-foreground'
                )}
                title={
                  beatMagnetEnabled
                    ? 'Magnet: alle Kanten (Beats + Playhead). Aus = nur Playhead, wenn Autosnap an'
                    : 'Magnet: aus (nur Playhead-Snap bei Autosnap)'
                }
              >
                <Magnet className="size-3.5" strokeWidth={2.25} />
              </button>
            </div>
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'beat' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('beat', e)}
            />
          </div>
          <div 
            className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
            style={{ height: `${trackHeights.act}px` }}
          >
            <span className="text-[9px] text-foreground font-medium truncate min-w-0">
              {isBookProject ? 'Akt' : 'Act'}
            </span>
            {showFilmClipMagnets && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setTrackAutosnap((t) => ({ ...t, act: !t.act }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    trackAutosnap.act ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={trackAutosnap.act ? 'Act: Autosnap an' : 'Act: Autosnap aus'}
                >
                  <Crosshair className="size-3.5" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setClipMagnets((m) => ({ ...m, act: !m.act }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    clipMagnets.act ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={
                    clipMagnets.act
                      ? 'Act: Magnet (alle Kanten)'
                      : 'Act: nur Playhead, wenn Autosnap an'
                  }
                >
                  <Magnet className="size-3.5" strokeWidth={2.25} />
                </button>
              </div>
            )}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'act' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('act', e)}
            />
          </div>
          <div 
            className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
            style={{ height: `${trackHeights.sequence}px` }}
          >
            <span className="text-[9px] text-foreground font-medium truncate min-w-0">
              {isBookProject ? 'Kapitel' : 'Seq'}
            </span>
            {showFilmClipMagnets && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setTrackAutosnap((t) => ({ ...t, sequence: !t.sequence }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    trackAutosnap.sequence ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={trackAutosnap.sequence ? 'Seq.: Autosnap an' : 'Seq.: Autosnap aus'}
                >
                  <Crosshair className="size-3.5" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setClipMagnets((m) => ({ ...m, sequence: !m.sequence }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    clipMagnets.sequence ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={clipMagnets.sequence ? 'Seq.: Magnet (alle Kanten)' : 'Seq.: nur Playhead'}
                >
                  <Magnet className="size-3.5" strokeWidth={2.25} />
                </button>
              </div>
            )}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'sequence' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('sequence', e)}
            />
          </div>
          <div 
            className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
            style={{ height: `${trackHeights.scene}px` }}
          >
            <span className="text-[9px] text-foreground font-medium truncate min-w-0">
              {isBookProject ? 'Abschnitt' : 'Scene'}
            </span>
            {showFilmClipMagnets && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setTrackAutosnap((t) => ({ ...t, scene: !t.scene }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    trackAutosnap.scene ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={trackAutosnap.scene ? 'Scene: Autosnap an' : 'Scene: Autosnap aus'}
                >
                  <Crosshair className="size-3.5" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setClipMagnets((m) => ({ ...m, scene: !m.scene }))
                  }
                  className={cn(
                    'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                    clipMagnets.scene ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                  )}
                  title={clipMagnets.scene ? 'Scene: Magnet (alle Kanten)' : 'Scene: nur Playhead'}
                >
                  <Magnet className="size-3.5" strokeWidth={2.25} />
                </button>
              </div>
            )}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'scene' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('scene', e)}
            />
          </div>
          {!isBookProject && (
            <>
              <div
                className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
                style={{ height: `${trackHeights.shot}px` }}
              >
                <span className="text-[9px] text-foreground font-medium truncate min-w-0">
                  Shot
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setTrackAutosnap((t) => ({ ...t, shot: !t.shot }))
                    }
                    className={cn(
                      'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                      trackAutosnap.shot ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                    )}
                    title={trackAutosnap.shot ? 'Shot: Autosnap an' : 'Shot: Autosnap aus'}
                  >
                    <Crosshair className="size-3.5" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setClipMagnets((m) => ({ ...m, shot: !m.shot }))
                    }
                    className={cn(
                      'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                      clipMagnets.shot ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                    )}
                    title={clipMagnets.shot ? 'Shot: Magnet (alle Kanten)' : 'Shot: nur Playhead'}
                  >
                    <Magnet className="size-3.5" strokeWidth={2.25} />
                  </button>
                </div>
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                    resizingTrack === 'shot' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
                  )}
                  onMouseDown={(e) => handleResizeStart('shot', e)}
                />
              </div>
              {showEditorialClipTrack && (
                <div
                  className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-muted/20 relative"
                  style={{ height: `${trackHeights.editorialClip}px` }}
                  title="Editorial-Clips (NLE): gleiche Spur wie Shot/Musik — nur im Tab „Timeline“"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <Clapperboard className="size-3 shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden />
                    <span className="text-[9px] text-foreground font-semibold leading-tight truncate">Clip</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setTrackAutosnap((t) => ({ ...t, editorialClip: !t.editorialClip }))
                      }
                      className={cn(
                        'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                        trackAutosnap.editorialClip ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                      )}
                      title={trackAutosnap.editorialClip ? 'Clip: Autosnap an' : 'Clip: Autosnap aus'}
                    >
                      <Crosshair className="size-3.5" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setClipMagnets((m) => ({ ...m, editorialClip: !m.editorialClip }))
                      }
                      className={cn(
                        'relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50',
                        clipMagnets.editorialClip ? 'text-primary opacity-100' : 'text-muted-foreground opacity-40'
                      )}
                      title={clipMagnets.editorialClip ? 'Clip: Magnet (alle Kanten)' : 'Clip: nur Playhead'}
                    >
                      <Magnet className="size-3.5" strokeWidth={2.25} />
                    </button>
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                      resizingTrack === 'editorialClip'
                        ? 'border-b-4 border-primary'
                        : 'hover:border-b-4 hover:border-primary'
                    )}
                    onMouseDown={(e) => handleResizeStart('editorialClip', e)}
                  />
                </div>
              )}
              <div
                className="border-b border-border px-2 flex items-center bg-card relative"
                style={{ height: `${trackHeights.music}px` }}
              >
                <span className="text-[9px] text-foreground font-medium leading-tight">
                  Musik
                </span>
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                    resizingTrack === 'music' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
                  )}
                  onMouseDown={(e) => handleResizeStart('music', e)}
                />
              </div>
              <div
                className="border-b border-border px-2 flex items-center bg-card relative"
                style={{ height: `${trackHeights.sfx}px` }}
              >
                <span className="text-[9px] text-foreground font-medium leading-tight">
                  SFX
                </span>
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                    resizingTrack === 'sfx' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
                  )}
                  onMouseDown={(e) => handleResizeStart('sfx', e)}
                />
              </div>
            </>
          )}
        </div>
        
        {/* Timeline Content - Scrollable */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-muted"
          onWheel={handleWheel}
          onMouseMove={handleCursorDragMove}
          onMouseUp={handleCursorDragEnd}
          onMouseLeave={handleCursorDragEnd}
        >
          <div style={{ width: `${totalWidthPx}px` }}>
            {/* Time Ruler */}
            <div 
              className="relative h-12 bg-card border-b border-border"
              onClick={handlePlayheadClick}
            >
              {/* Time markers */}
              {ticks.map((tick, index) => (
                <div
                  key={`${tick.sec}-${index}`}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${tick.x}px` }}
                >
                  <div className="w-px h-3 bg-border" />
                  <span className="text-[9px] text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              ))}
              
              {/* Page markers for books (second row) */}
              {isBookProject && pageMarkers.map((marker, index) => {
                const isWholePage = marker.page % 1 === 0;
                return (
                  <div
                    key={`page-${marker.page}-${index}`}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ left: `${marker.x}px` }}
                  >
                    <div className="w-px h-1.5 bg-border" />
                    <span className={cn(
                      'text-[9px] font-mono mt-6 whitespace-nowrap',
                      isWholePage ? 'text-primary font-bold' : 'text-muted-foreground'
                    )}>
                      S.{marker.page % 1 === 0 ? marker.page.toFixed(0) : marker.page.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              
              {/* Playhead - Draggable */}
              <div
                ref={playheadRulerRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-30 hover:w-1 transition-[width]"
                onMouseDown={handleCursorDragStart}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow-md cursor-grab active:cursor-grabbing" />
              </div>
            </div>
            
            {/* Beat Track */}
            <div 
              ref={beatTrackContainerRef as React.RefObject<HTMLDivElement>}
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.beat}px` }}
            >
              {beatBlocks
                .filter(beat => beat.visible)
                .map((beat, index) => {
                  const displayText = getBlockText(beat.label || '', beat.width, 'beat', index);
                  const hasBeatColor = Boolean(beat.color);
                  const trimGrab = getTrimGrabHandleStyles({
                    preset: 'beat',
                    baseColorHex: hasBeatColor ? beat.color : undefined,
                  });
                  const beatVisual = TIMELINE_TRACK_REGISTRY.beat;
                  return (
                    <div
                      key={beat.id}
                      data-beat-id={beat.id}
                      className={getTimelineTrackClipClasses('beat', {
                        beatSkipFill: hasBeatColor,
                      })}
                      style={{
                        left: `${beat.x}px`,
                        width: `${beat.width}px`,
                        backgroundColor: hasBeatColor ? beat.color : undefined,
                        ['--trim-cap' as string]: TRIM_END_CAP_WIDTH,
                        ...(trimGrab.clipBorderColor
                          ? { borderColor: trimGrab.clipBorderColor }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineTitleEdit('beat', beat.id, beat.label);
                      }}
                      title="Klicken zum Umbenennen"
                    >
                      <div
                        className={trimGrab.handleLeftClassName}
                        style={trimGrab.leftStyle}
                        onPointerDown={(e) => handleTrimStart(beat.id, 'left', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Linken Rand ziehen"
                      />
                      
                      {/* pointer-events: z-10 unter Endkappen (z-45); horizontale Einrückung = Kappenbreite */}
                      <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden gap-0.5 relative z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-4 w-4 p-0 shrink-0 pointer-events-auto',
                                hasBeatColor
                                  ? beatVisual.textWithCustomColor
                                  : beatVisual.textDefault,
                                'hover:opacity-80'
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Beat „${beat.label}“ wirklich löschen?`)) {
                                  void handleDeleteBeat(beat.id);
                                }
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              Beat löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span
                          className={cn(
                            'text-[10px] truncate pointer-events-auto',
                            hasBeatColor
                              ? beatVisual.textWithCustomColor
                              : beatVisual.textDefault
                          )}
                        >
                          {displayText}
                        </span>
                      </div>
                      
                      <div
                        className={trimGrab.handleRightClassName}
                        style={trimGrab.rightStyle}
                        onPointerDown={(e) => handleTrimStart(beat.id, 'right', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Rechten Rand ziehen"
                      />
                    </div>
                  );
                })}
              
              {/* Playhead */}
              <div
                ref={playheadBeatRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              />
            </div>
            
            {/* Act Track */}
            <div 
              ref={actTrackContainerRef as React.RefObject<HTMLDivElement>}
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.act}px` }}
            >
              {filmActRowBlocks.map((act, index) => {
                  const displayText = getBlockText(act.title || '', act.width, 'act', index);
                  const livePr = liveActPctByActTrim?.[act.id];
                  const useLiveActLayout = !!livePr;
                  const durSafe = Math.max(1e-9, Number(duration) || 0);
                  const vsSafe = Number(viewStartSec) || 0;
                  const pxsSafe = Math.max(1e-6, Number(pxPerSec) || 1);
                  const liveLeftPx = useLiveActLayout
                    ? ((livePr!.pct_from / 100) * durSafe - vsSafe) * pxsSafe
                    : act.x;
                  const liveWidthPx = useLiveActLayout
                    ? Math.max(2, ((livePr!.pct_to - livePr!.pct_from) / 100) * durSafe * pxsSafe)
                    : act.width;
                  return (
                    <div
                      key={act.id}
                      data-act-id={act.id}
                      className={getTimelineTrackClipClasses('act')}
                      style={{
                        left: `${liveLeftPx}px`,
                        width: `${liveWidthPx}px`,
                        ['--trim-cap' as string]: TRIM_END_CAP_WIDTH,
                        ...(ACT_TRIM_GRAB_STYLES.clipBorderColor
                          ? { borderColor: ACT_TRIM_GRAB_STYLES.clipBorderColor }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineTitleEdit('act', act.id, act.title);
                      }}
                      >
                      <div
                        className={ACT_TRIM_GRAB_STYLES.handleLeftClassName}
                        style={ACT_TRIM_GRAB_STYLES.leftStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('act', act.id, 'left', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Linken Rand ziehen (Ripple)"
                      />
                      <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden relative z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 mr-1 shrink-0 text-blue-700 hover:text-blue-900 pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDescriptionDialog('act', act.id, act.title || labelByKind.act, (act as any).description);
                              }}
                            >
                              Beschreibung bearbeiten
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span
                          className={cn(
                            TIMELINE_TRACK_REGISTRY.act.textDefault,
                            'truncate pointer-events-auto'
                          )}
                        >
                          {displayText}
                        </span>
                      </div>
                      <div
                        className={ACT_TRIM_GRAB_STYLES.handleRightClassName}
                        style={ACT_TRIM_GRAB_STYLES.rightStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('act', act.id, 'right', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Rechten Rand ziehen (Ripple)"
                      />
                    </div>
                  );
                })}
              
              {/* Playhead */}
              <div
                ref={playheadActRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              />
            </div>
            
            {/* Sequence/Chapter Track */}
            <div 
              ref={sequenceTrackContainerRef as React.RefObject<HTMLDivElement>}
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.sequence}px` }}
            >
              {sequenceBlocks
                .filter(seq => seq.visible)
                .map((seq, index) => {
                  const displayText = getBlockText(seq.title || '', seq.width, 'chapter', index);
                  return (
                    <div
                      key={seq.id}
                      data-sequence-id={seq.id}
                      className={getTimelineTrackClipClasses('sequence')}
                      style={{
                        left: `${seq.x}px`,
                        width: `${seq.width}px`,
                        ['--trim-cap' as string]: TRIM_END_CAP_WIDTH,
                        ...(SEQUENCE_TRIM_GRAB_STYLES.clipBorderColor
                          ? { borderColor: SEQUENCE_TRIM_GRAB_STYLES.clipBorderColor }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineTitleEdit('sequence', seq.id, seq.title);
                      }}
                    >
                      <div
                        className={SEQUENCE_TRIM_GRAB_STYLES.handleLeftClassName}
                        style={SEQUENCE_TRIM_GRAB_STYLES.leftStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('sequence', seq.id, 'left', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Linken Rand ziehen (Ripple)"
                      />
                      <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden relative z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 mr-1 shrink-0 text-green-700 hover:text-green-900 pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDescriptionDialog('sequence', seq.id, seq.title || labelByKind.sequence, (seq as any).description);
                              }}
                            >
                              Beschreibung bearbeiten
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span
                          className={cn(
                            TIMELINE_TRACK_REGISTRY.sequence.textDefault,
                            'truncate pointer-events-auto'
                          )}
                        >
                          {displayText}
                        </span>
                      </div>
                      <div
                        className={SEQUENCE_TRIM_GRAB_STYLES.handleRightClassName}
                        style={SEQUENCE_TRIM_GRAB_STYLES.rightStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('sequence', seq.id, 'right', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Rechten Rand ziehen (Ripple)"
                      />
                    </div>
                  );
                })}
              
              {/* Playhead */}
              <div
                ref={playheadSequenceRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              />
            </div>
            
            {/* Scene/Section Track */}
            <div 
              ref={sceneTrackContainerRef as React.RefObject<HTMLDivElement>}
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.scene}px` }}
            >
              {sceneBlocks
                .filter(scene => scene.visible)
                .map((scene, index) => {
                  const displayText = getBlockText(scene.title || '', scene.width, 'scene', index);
                  const showFullContent = scene.width >= 120;
                  const showAbbreviatedTitle = scene.width >= 60 && scene.width < 120;
                  const showMinimal = scene.width < 60;
                  return (
                    <div
                      key={scene.id}
                      data-scene-id={scene.id}
                      className={getTimelineTrackClipClasses('scene')}
                      style={{
                        left: `${scene.x}px`,
                        width: `${scene.width}px`,
                        ['--trim-cap' as string]: TRIM_END_CAP_WIDTH,
                        ...(SCENE_TRIM_GRAB_STYLES.clipBorderColor
                          ? { borderColor: SCENE_TRIM_GRAB_STYLES.clipBorderColor }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sceneTitleClickTimerRef.current) clearTimeout(sceneTitleClickTimerRef.current);
                        sceneTitleClickTimerRef.current = setTimeout(() => {
                          sceneTitleClickTimerRef.current = null;
                          startInlineTitleEdit('scene', scene.id, scene.title);
                        }, 260);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (sceneTitleClickTimerRef.current) {
                          clearTimeout(sceneTitleClickTimerRef.current);
                          sceneTitleClickTimerRef.current = null;
                        }
                        console.log('[VideoEditorTimeline] 🚀 Opening Content Modal for scene:', scene.id);
                        setEditingSceneForModal(scene);
                        setShowContentModal(true);
                      }}
                    >
                      {showFullContent && (
                        <div
                          className="pointer-events-none h-full flex flex-col py-1 min-h-0 overflow-hidden rounded-[inherit] relative z-0"
                          style={{
                            paddingLeft: 'max(0.5rem, var(--trim-cap))',
                            paddingRight: 'max(0.5rem, var(--trim-cap))',
                          }}
                        >
                          <div className="flex items-center gap-1 mb-0.5 pointer-events-auto">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 shrink-0 text-pink-700 hover:text-pink-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDescriptionDialog('scene', scene.id, scene.title || labelByKind.scene, (scene as any).description);
                                  }}
                                >
                                  Beschreibung bearbeiten
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <span className="text-[9px] font-medium truncate text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
                            {scene.title}
                          </span>
                          </div>
                          <div className="flex-1 overflow-hidden text-[8px] text-pink-800 dark:text-pink-200/90 pointer-events-auto">
                            {scene.content && typeof scene.content === 'object' ? (
                              <ReadonlyTiptapView content={scene.content} />
                            ) : (
                              <em className="text-muted-foreground/50">Leer...</em>
                            )}
                          </div>
                        </div>
                      )}
                      {showAbbreviatedTitle && (
                        <div className="pointer-events-none h-full flex items-center justify-center px-[max(0.25rem,var(--trim-cap))] overflow-hidden relative z-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 mr-1 shrink-0 text-pink-700 hover:text-pink-900 pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDescriptionDialog('scene', scene.id, scene.title || labelByKind.scene, (scene as any).description);
                                }}
                              >
                                Beschreibung bearbeiten
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span className="text-[9px] font-medium truncate text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
                            {displayText}
                          </span>
                        </div>
                      )}
                      {showMinimal && (
                        <div className="pointer-events-none h-full flex items-center justify-center px-[max(0.15rem,var(--trim-cap))] overflow-hidden relative z-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 mr-1 shrink-0 text-pink-700 hover:text-pink-900 pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDescriptionDialog('scene', scene.id, scene.title || labelByKind.scene, (scene as any).description);
                                }}
                              >
                                Beschreibung bearbeiten
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span className="text-[9px] font-bold text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
                            {displayText}
                          </span>
                        </div>
                      )}
                      {/* Nach dem Inhalt: Griffe liegen garantiert oben (TipTap/Preview hat z-eigene Layer). */}
                      <div
                        className={SCENE_TRIM_GRAB_STYLES.handleLeftClassName}
                        style={SCENE_TRIM_GRAB_STYLES.leftStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('scene', scene.id, 'left', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Linken Rand ziehen (Ripple)"
                      />
                      <div
                        className={SCENE_TRIM_GRAB_STYLES.handleRightClassName}
                        style={SCENE_TRIM_GRAB_STYLES.rightStyle}
                        onPointerDown={(e) => handleTrimClipMouseDown('scene', scene.id, 'right', e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Rechten Rand ziehen (Ripple)"
                      />
                    </div>
                  );
                })}
              
              {/* Playhead */}
              <div
                ref={playheadSceneRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              />
            </div>

            {/* Shot Track + Audio-Zeilen (Film): gleiche Geometrie wie Shots */}
            {!isBookProject && (
              <>
              <div
                ref={shotTrackContainerRef as RefObject<HTMLDivElement>}
                className="relative border-b border-border bg-muted/20"
                style={{ height: `${trackHeights.shot}px` }}
              >
                {shotBlocks.map((shot, index) => {
                    const displayText = getBlockText(shot.label || '', shot.width, 'shot', index);
                    const imgUrl = shotBlockPreviewUrl(shot as any);
                    const narrow = shot.width < 44;
                    const fullBleedImage = Boolean(imgUrl && narrow);
                    const showSideThumb = Boolean(imgUrl && !narrow);
                    const thumbW = Math.min(48, Math.max(26, Math.round(shot.width * 0.28)));
                    return (
                      <div
                        key={shot.id}
                        data-shot-id={shot.id}
                        className={getTimelineTrackClipClasses('shot', {
                          shotFullBleedImage: fullBleedImage,
                        })}
                        style={{
                          left: `${shot.x}px`,
                          width: `${shot.width}px`,
                          ['--trim-cap' as string]: TRIM_END_CAP_WIDTH,
                          ...(SHOT_TRIM_GRAB_STYLES.clipBorderColor
                            ? { borderColor: SHOT_TRIM_GRAB_STYLES.clipBorderColor }
                            : {}),
                          ...(fullBleedImage ? { backgroundImage: `url(${imgUrl})` } : {}),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startInlineTitleEdit('shot', shot.id, shot.label);
                        }}
                      >
                        <div
                          className={SHOT_TRIM_GRAB_STYLES.handleLeftClassName}
                          style={SHOT_TRIM_GRAB_STYLES.leftStyle}
                          onPointerDown={(e) => handleTrimClipMouseDown('shot', shot.id, 'left', e)}
                          onClick={(e) => e.stopPropagation()}
                          title="Shot-Timing links (Ripple)"
                        />
                        <div
                          className={SHOT_TRIM_GRAB_STYLES.handleRightClassName}
                          style={SHOT_TRIM_GRAB_STYLES.rightStyle}
                          onPointerDown={(e) => handleTrimClipMouseDown('shot', shot.id, 'right', e)}
                          onClick={(e) => e.stopPropagation()}
                          title="Shot-Timing rechts (Ripple)"
                        />
                        <div
                          className={cn(
                            'pointer-events-none h-full flex items-center justify-center gap-0.5 px-[var(--trim-cap)] min-w-0 overflow-hidden relative z-10',
                            fullBleedImage && 'bg-black/40'
                          )}
                        >
                          {showSideThumb && (
                            <div
                              className="shrink-0 rounded-sm overflow-hidden border border-yellow-700/40 bg-muted my-0.5 pointer-events-auto"
                              style={{
                                width: thumbW,
                                height: 'calc(100% - 6px)',
                                backgroundImage: `url(${imgUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                              aria-hidden
                            />
                          )}
                          {!imgUrl && shot.width >= 26 && (
                            <div
                              className="shrink-0 flex items-center justify-center rounded-sm border border-dashed border-yellow-600/45 bg-yellow-100/40 dark:bg-yellow-950/40 my-0.5 pointer-events-auto"
                              style={{ width: Math.min(28, shot.width - 8), height: 'calc(100% - 6px)' }}
                              aria-hidden
                            >
                              <Camera className="size-3 text-yellow-800/45 dark:text-yellow-200/45" />
          </div>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  'h-4 w-4 p-0 shrink-0 pointer-events-auto',
                                  fullBleedImage
                                    ? 'text-yellow-50 hover:text-white hover:bg-white/10'
                                    : 'mr-0.5 text-yellow-700 hover:text-yellow-900'
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {canOpenShot && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShot(shot.id);
                                  }}
                                >
                                  <ListTree className="size-3 mr-2 shrink-0" />
                                  Shot bearbeiten
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDescriptionDialog('shot', shot.id, shot.label || labelByKind.shot, (shot as any).description);
                                }}
                              >
                                Beschreibung bearbeiten
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span
                            className={cn(
                              'text-[10px] font-medium truncate min-w-0 pointer-events-auto',
                              fullBleedImage
                                ? 'text-yellow-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'
                                : 'text-yellow-900 dark:text-yellow-100'
                            )}
                          >
                            {displayText}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                <div
                  ref={playheadShotRef}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                />
              </div>

              {/* Editorial timeline clips (NLE) — persisted `clips`; gray track under shots */}
              {showEditorialClipTrack && (
                <div
                  className="relative border-b border-border bg-muted/20 ring-1 ring-inset ring-zinc-500/15 dark:ring-zinc-400/20"
                  style={{ height: `${trackHeights.editorialClip}px` }}
                >
                  {clipBlocks.map((c: any, idx: number) => (
                    <div
                      key={c.id}
                      className="absolute top-0.5 bottom-0.5 rounded border-2 border-zinc-400/80 dark:border-zinc-500 bg-zinc-200/90 dark:bg-zinc-800/85 overflow-hidden flex items-stretch"
                      style={{ left: `${c.x}px`, width: `${Math.max(2, c.width)}px` }}
                      title="Editorial Clip (Trim)"
                    >
                      <div
                        className="w-1 shrink-0 bg-zinc-500 hover:bg-zinc-400 cursor-ew-resize z-10"
                        onPointerDown={(e) =>
                          handleNleClipPointerDown(
                            {
                              id: c.id,
                              sceneId: c.sceneId,
                              shotId: c.shotId,
                              startSec: c.startSec,
                              endSec: c.endSec,
                            },
                            'left',
                            e
                          )
                        }
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-center px-1 pointer-events-none">
                        <span className="text-[9px] text-zinc-800 dark:text-zinc-100 truncate font-medium">
                          {getBlockText('Clip', c.width, 'shot', idx)}
                        </span>
                      </div>
                      <div
                        className="w-1 shrink-0 bg-zinc-500 hover:bg-zinc-400 cursor-ew-resize z-10"
                        onPointerDown={(e) =>
                          handleNleClipPointerDown(
                            {
                              id: c.id,
                              sceneId: c.sceneId,
                              shotId: c.shotId,
                              startSec: c.startSec,
                              endSec: c.endSec,
                            },
                            'right',
                            e
                          )
                        }
                      />
                    </div>
                  ))}
                  {clipBlocks.length === 0 && (
                    <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                      <span className="text-[9px] text-muted-foreground">
                        {((timelineData as TimelineData)?.shots?.length ?? 0) === 0
                          ? 'Zuerst Shots anlegen (Struktur oder + Add Item); Clips folgen automatisch.'
                          : 'Editorial Clips (erscheinen nach Migration oder Sync mit scriptony-clips)'}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                    style={{ transform: `translateX(${(currentTime - viewStartSec) * pxPerSec}px)` }}
                  />
                </div>
              )}

              {/* Musik: eine Zelle pro Shot — gleiche x/Breite wie Shot (mit Trim mitbewegt) */}
              <div
                className="relative border-b border-border bg-muted/15"
                style={{ height: `${trackHeights.music}px` }}
              >
                {shotBlocks.map((shot) => {
                    const full = (timelineData as TimelineData)?.shots?.find((sh: any) => sh.id === shot.id);
                    const files = (full?.audioFiles || []).filter((a) => a.type === 'music');
                    const segments = layoutShotAudioSegments(files);
                    const w = Math.max(2, shot.width);
                    return (
                      <div
                        key={`music-${shot.id}`}
                        role={canOpenShot ? 'button' : undefined}
                        tabIndex={canOpenShot ? 0 : undefined}
                        className={cn(
                          'absolute top-0.5 bottom-0.5 rounded border border-violet-400/70 dark:border-violet-600/60 bg-violet-50/80 dark:bg-violet-950/35 overflow-hidden flex',
                          canOpenShot && 'cursor-pointer hover:ring-1 hover:ring-violet-500/50'
                        )}
                        style={{ left: `${shot.x}px`, width: `${w}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openShot(shot.id);
                        }}
                        onKeyDown={(e) => {
                          if (!canOpenShot) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openShot(shot.id);
                          }
                        }}
                        title={
                          files.length
                            ? `${files.length} Musik-Clip(s) — Klick: Shot im Strukturbaum`
                            : 'Keine Musik — Klick: Shot im Strukturbaum'
                        }
                      >
                        {files.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center min-w-0">
                            <span className="text-[8px] text-muted-foreground truncate px-0.5">—</span>
                          </div>
                        ) : (
                          segments.map((seg) => (
                            <div
                              key={seg.id}
                              className="h-full min-w-0 bg-violet-500/75 dark:bg-violet-500/50 border-r border-violet-900/20 last:border-r-0"
                              style={{ width: `${seg.widthFrac * 100}%` }}
                              title={seg.title}
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                <div
                  ref={playheadMusicRef}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                />
              </div>

              {/* SFX: gleiche Geometrie wie Shot-Zeile */}
              <div
                className="relative border-b border-border bg-muted/15"
                style={{ height: `${trackHeights.sfx}px` }}
              >
                {shotBlocks.map((shot) => {
                    const full = (timelineData as TimelineData)?.shots?.find((sh: any) => sh.id === shot.id);
                    const files = (full?.audioFiles || []).filter((a) => a.type === 'sfx');
                    const segments = layoutShotAudioSegments(files);
                    const w = Math.max(2, shot.width);
                    return (
                      <div
                        key={`sfx-${shot.id}`}
                        role={canOpenShot ? 'button' : undefined}
                        tabIndex={canOpenShot ? 0 : undefined}
                        className={cn(
                          'absolute top-0.5 bottom-0.5 rounded border border-orange-400/80 dark:border-orange-600/55 bg-orange-50/85 dark:bg-orange-950/30 overflow-hidden flex',
                          canOpenShot && 'cursor-pointer hover:ring-1 hover:ring-orange-500/50'
                        )}
                        style={{ left: `${shot.x}px`, width: `${w}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openShot(shot.id);
                        }}
                        onKeyDown={(e) => {
                          if (!canOpenShot) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openShot(shot.id);
                          }
                        }}
                        title={
                          files.length
                            ? `${files.length} SFX — Klick: Shot im Strukturbaum`
                            : 'Keine SFX — Klick: Shot im Strukturbaum'
                        }
                      >
                        {files.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center min-w-0">
                            <span className="text-[8px] text-muted-foreground truncate px-0.5">—</span>
                          </div>
                        ) : (
                          segments.map((seg) => (
                            <div
                              key={seg.id}
                              className="h-full min-w-0 bg-orange-500/80 dark:bg-orange-500/45 border-r border-orange-900/25 last:border-r-0"
                              style={{ width: `${seg.widthFrac * 100}%` }}
                              title={seg.title}
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                <div
                  ref={playheadSfxRef}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                />
              </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-card border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-2 border-primary">
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {addableKinds.map((kind) => (
              <DropdownMenuItem key={kind} onClick={() => openAddDialogForKind(kind)}>
                {labelByKind[kind]} hinzufügen
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingAddKind ? `${labelByKind[pendingAddKind]} hinzufügen` : 'Element hinzufügen'}</DialogTitle>
          </DialogHeader>
          {pendingAddKind ? (
            <div className="space-y-2">
              <Label htmlFor="timeline-parent-select">
                {pendingAddKind === 'sequence'
                  ? `${labelByKind.act} auswählen`
                  : pendingAddKind === 'scene'
                    ? `${labelByKind.sequence} auswählen`
                    : `${labelByKind.scene} auswählen`}
              </Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger id="timeline-parent-select">
                  <SelectValue placeholder="Parent auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {getParentOptions(pendingAddKind).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => void handleConfirmAddWithParent()} disabled={!selectedParentId}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingTitle}
        onOpenChange={(open) => {
          if (!open) cancelInlineTitleEdit();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Titel bearbeiten
              {editingTitle
                ? ` — ${editingTitle.kind === 'beat' ? 'Beat' : labelByKind[editingTitle.kind as AddNodeKind]}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="timeline-title-edit">Name</Label>
            <Input
              id="timeline-title-edit"
              value={editingTitle?.value ?? ''}
              onChange={(e) =>
                setEditingTitle((prev) => (prev ? { ...prev, value: e.target.value } : prev))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commitInlineTitleEdit();
                }
              }}
              placeholder="Titel eingeben..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => cancelInlineTitleEdit()}
            >
              Abbrechen
            </Button>
            <Button onClick={() => void commitInlineTitleEdit()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Beschreibung bearbeiten
              {editingDescription?.title ? ` - ${editingDescription.title}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="timeline-description-edit">Beschreibung</Label>
            <Textarea
              id="timeline-description-edit"
              value={editingDescription?.description || ''}
              onChange={(e) =>
                setEditingDescription((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              rows={6}
              placeholder="Beschreibung eingeben..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDescriptionDialogOpen(false);
                setEditingDescription(null);
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={() => void commitDescriptionEdit()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 📝 Rich Text Content Editor Modal */}
      {editingSceneForModal && (
        <RichTextEditorModal
          isOpen={showContentModal}
          onClose={() => {
            setShowContentModal(false);
            setEditingSceneForModal(null);
          }}
          value={editingSceneForModal.content}
          onChange={async (jsonDoc) => {
            // Save as JSON object directly
            const now = new Date().toISOString();
            console.log('[VideoEditorTimeline] 💾 Saving content as JSON object:', jsonDoc);
            
            try {
              const token = await getAccessToken();
              if (!token) {
                console.error('[VideoEditorTimeline] No auth token available');
                return;
              }
              
              // Calculate word count from content
              const calculateWordCount = (content: any): number => {
                if (!content?.content || !Array.isArray(content.content)) return 0;
                
                let totalWords = 0;
                for (const node of content.content) {
                  if (node.type === 'paragraph' && node.content) {
                    for (const child of node.content) {
                      if (child.type === 'text' && child.text) {
                        const words = child.text.trim().split(/\s+/).filter((w: string) => w.length > 0);
                        totalWords += words.length;
                      }
                    }
                  }
                }
                return totalWords;
              };
              
              const wordCount = calculateWordCount(jsonDoc);
              
              // Update scene via API
              const updatedScene = await TimelineAPI.updateScene(
                editingSceneForModal.id,
                {
                  content: jsonDoc, // Save as JSON object
                  metadata: {
                    ...editingSceneForModal.metadata,
                    wordCount, // Save word count to metadata
                    lastEditedAt: now,
                  },
                },
                token
              );
              
              console.log('[VideoEditorTimeline] ✅ Scene updated successfully:', updatedScene);
              
              // Update local state
              if (timelineData) {
                const newScenes = (timelineData.scenes || []).map(s =>
                  s.id === editingSceneForModal.id
                    ? { ...s, content: jsonDoc, wordCount, metadata: { ...s.metadata, wordCount, lastEditedAt: now } }
                    : s
                );
                
                const newData = {
                  ...timelineData,
                  scenes: newScenes,
                };
                
                setTimelineData(newData);
                onDataChange?.(newData);
                
                // Update the editing scene to reflect changes immediately in the modal
                setEditingSceneForModal({
                  ...editingSceneForModal,
                  content: jsonDoc,
                  wordCount,
                  metadata: { ...editingSceneForModal.metadata, wordCount, lastEditedAt: now },
                });
              }
            } catch (error) {
              console.error('[VideoEditorTimeline] ❌ Error saving scene content:', error);
            }
          }}
          title={editingSceneForModal.title ?? 'Inhalt'}
          characters={[] as Character[]}
        />
      )}

      {/* 🎬 SHOT CARD MODAL (opens from timeline click instead of switching to dropdown) */}
      {timelineCtx && (
        <ShotCardModal
          open={!!selectedShotId}
          onOpenChange={(open) => { if (!open) setSelectedShotId(null); }}
          shotId={selectedShotId}
          projectId={projectId}
        />
      )}
    </div>
  );
}
