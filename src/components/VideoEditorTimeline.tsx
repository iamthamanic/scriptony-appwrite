import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import * as BeatsAPI from '../lib/api/beats-api';
import * as TimelineAPI from '../lib/api/timeline-api';
import * as ShotsAPI from '../lib/api/shots-api';
import { useAuth } from '../hooks/useAuth';
import type { TimelineData } from './FilmDropdown';
import type { BookTimelineData } from './BookDropdown';
import { RichTextEditorModal } from './RichTextEditorModal';
import { ReadonlyTiptapView } from './ReadonlyTiptapView';
import { TimelineTextPreview } from './TimelineTextPreview';
import { trimBeatLeft, trimBeatRight } from './timeline-helpers';
import { calculateActBlocks, calculateSequenceBlocks, calculateSceneBlocks } from './timeline-blocks';

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
 */

interface VideoEditorTimelineProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData | BookTimelineData | null;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  duration?: number; // Total duration in SECONDS (for both films and books)
  beats?: any[];
  totalWords?: number;
  wordsPerPage?: number;
  targetPages?: number;
  readingSpeedWpm?: number; // Reading speed in words per minute for books
}

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

export function VideoEditorTimeline({ 
  projectId, 
  projectType = 'film',
  initialData, 
  onDataChange,
  duration = 300,
  beats: parentBeats,
  totalWords,
  wordsPerPage = 250,
  targetPages,
  readingSpeedWpm = 150, // Default reading speed in words per minute
}: VideoEditorTimelineProps) {
  const { getAccessToken } = useAuth();
  
  // 🎨 DESIGN SYSTEM: Beat Styling
  const BEAT_STYLES = {
    container: 'border-2',
    text: 'font-medium',
  };

  const getBeatColorClasses = (hex?: string | null) => {
    if (!hex) {
      return {
        container: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-700',
        text: 'text-purple-900 dark:text-purple-100',
      };
    }
    return {
      container: 'border-purple-300/70 dark:border-purple-600/70',
      text: 'text-purple-950 dark:text-purple-100',
    };
  };
  
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
  
  // 🧲 BEAT MAGNET (Ripple Editing)
  const [beatMagnetEnabled, setBeatMagnetEnabled] = useState(true);
  
  // 🎯 BEAT TRIM STATE
  const [trimingBeat, setTrimingBeat] = useState<{ id: string; handle: 'left' | 'right' } | null>(null);
  const trimStartXRef = useRef(0);
  const trimStartSecRef = useRef(0);
  
  // 🎯 MODAL STATE: Scene Content Editor
  const [editingSceneForModal, setEditingSceneForModal] = useState<any | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  
  // 🎯 DURATION & VIEWPORT (NOW SAFE TO USE timelineData!)
  const totalDurationMin = duration / 60; // Total timeline duration in MINUTES (from prop)
  const totalDurationSec = duration; // Convert to SECONDS for timeline calculations
  
  // 📖 BOOK METRICS: Default duration for empty acts
  const DEFAULT_EMPTY_ACT_MIN = 5; // 5 minutes
  const isBookProject = projectType === 'book';
  
  // 📖 PLAYBACK STATE: Word-by-word text display (MUST BE AFTER isBookProject)
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [wordsArray, setWordsArray] = useState<string[]>([]);
  const playbackSceneStartTimeRef = useRef<number>(0); // Timeline position where current scene started
  const playbackAnimationRef = useRef<number | null>(null);
  const sceneBlocksRef = useRef<any[]>([]);
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
  const smoothPlayheadRAF = useRef<number | null>(null);
  
  // 🚀 DELTA TIME INTERPOLATION (for smooth 60fps independent of React renders!)
  // NOTE: playbackStartTimeRef (line 166) is used by Book Playback - we need separate refs for RAF!
  const rafPlaybackStartTimeRef = useRef<number>(0); // performance.now() for RAF
  const rafPlaybackStartCurrentTimeRef = useRef<number>(0); // currentTime at RAF playback start
  const isPlayingRef = useRef<boolean>(false);
  const isBookProjectRef = useRef<boolean>(isBookProject);
  const viewStartSecRef = useRef<number>(0);
  const pxPerSecRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0); // 🎯 Current playhead time (for snapping!)
  
  // 🎯 TRACK HEIGHTS (CapCut-Style with localStorage)
  const TRACK_CONSTRAINTS = {
    beat: { min: 40, max: 120, default: 64 },
    act: { min: 40, max: 100, default: 48 },
    sequence: { min: 40, max: 80, default: 40 },
    scene: { min: 80, max: 400, default: 120 },
    shot: { min: 32, max: 90, default: 40 },
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
  
  // 🎯 BEAT TRIM HANDLERS (Mouse Events)
  const handleTrimStart = (beatId: string, handle: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTrimingBeat({ id: beatId, handle });
    trimStartXRef.current = e.clientX;
    
    const beat = beats.find(b => b.id === beatId);
    if (beat) {
      if (handle === 'left') {
        trimStartSecRef.current = (beat.pct_from / 100) * duration;
      } else {
        trimStartSecRef.current = (beat.pct_to / 100) * duration;
      }
    }
    
    console.log(`[Beat Trim] 🎯 Start trimming ${handle} handle of ${beatId}`);
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
  
  // 🆕 NEW SIMPLIFIED handleTrimMove using extracted helpers with CapCut-Style Ripple
  const handleTrimMove = (e: MouseEvent) => {
    if (!trimingBeat) return;
    
    const deltaX = e.clientX - trimStartXRef.current;
    const deltaSec = deltaX / pxPerSec;
    const newSec = trimStartSecRef.current + deltaSec;
    
    // Get current beat
    const beat = beats.find(b => b.id === trimingBeat.id);
    if (!beat) return;
    
    if (trimingBeat.handle === 'left') {
      // LEFT HANDLE: Trim from start + RIPPLE LEFT
      const result = trimBeatLeft(
        beat,
        beats,
        newSec,
        duration,
        beatMagnetEnabled,
        snapTime,
        pxPerSec,
        currentTimeRef.current
      );
      
      // 🚀 Apply to current beat + rippled beats
      setBeats(prev => {
        const updated = prev.map(b => {
          if (b.id === trimingBeat.id) {
            return { ...b, pct_from: result.newPctFrom };
          }
          const rippled = result.rippleBeats.find(rb => rb.id === b.id);
          return rippled || b;
        });
        return updated;
      });
      
    } else {
      // RIGHT HANDLE: Trim from end + RIPPLE RIGHT
      const result = trimBeatRight(
        beat,
        beats,
        newSec,
        duration,
        beatMagnetEnabled,
        snapTime,
        pxPerSec,
        currentTimeRef.current
      );
      
      console.log(`[Ripple Debug] Beat: ${beat.label}, newPctTo: ${result.newPctTo.toFixed(2)}, rippleBeats:`, result.rippleBeats.map(b => `${b.label} (${b.pct_from.toFixed(2)}% -> ${b.pct_to.toFixed(2)}%)`));
      
      // 🚀 Apply to current beat + rippled beats
      setBeats(prev => {
        const updated = prev.map(b => {
          if (b.id === trimingBeat.id) {
            return { ...b, pct_to: result.newPctTo };
          }
          const rippled = result.rippleBeats.find(rb => rb.id === b.id);
          return rippled || b;
        });
        return updated;
      });
    }
  };
  
  const handleTrimEnd = async () => {
    if (!trimingBeat) return;
    
    console.log(`[Beat Trim] ✅ Finished trimming ${trimingBeat.handle} handle`);
    
    // Store original beats for comparison
    const originalBeats = [...beats];
    
    // NOW apply ripple and update DB
    const beat = beats.find(b => b.id === trimingBeat.id);
    if (!beat) {
      setTrimingBeat(null);
      return;
    }
    
    const startSec = (beat.pct_from / 100) * duration;
    const endSec = (beat.pct_to / 100) * duration;
    
    try {
      if (trimingBeat.handle === 'right') {
        // Apply ripple for right handle
        const oldEndSec = trimStartSecRef.current;
        const withRipple = applyBeatRipple(beats, trimingBeat.id, oldEndSec, endSec, beatMagnetEnabled);
        
        // Update the trimmed beat first (only if it's in DB)
        if (dbBeatIds.has(trimingBeat.id)) {
          try {
            await BeatsAPI.updateBeat(trimingBeat.id, { pct_to: beat.pct_to });
          } catch (error: any) {
            // If beat doesn't exist in DB (404), remove it from tracking
            if (error.message?.includes('404') || error.message?.includes('not found')) {
              console.warn(`[Beat Trim] ⚠️ Beat ${trimingBeat.id} not found in DB, removing from tracking...`);
              setDbBeatIds(prev => {
                const next = new Set(prev);
                next.delete(trimingBeat.id);
                return next;
              });
              setTrimingBeat(null);
              return;
            }
            throw error;
          }
        } else {
          console.log(`[Beat Trim] ⏭️ Skipping DB update for template beat ${trimingBeat.id}`);
        }
        
        // 🎯 UPDATE PUSHED/COMPRESSED BEATS (from manual pushing or ripple)
        // First check for manually pushed beats (from handleTrimMove)
        const pushedBeats = beats.filter(b => {
          const original = originalBeats.find(ob => ob.id === b.id);
          return b.id !== trimingBeat.id && 
                 original && 
                 (b.pct_from !== original.pct_from || b.pct_to !== original.pct_to);
        });
        
        // Then check rippled beats (from applyBeatRipple)
        const rippleUpdates = beatMagnetEnabled ? withRipple.filter(b => {
          const original = originalBeats.find(ob => ob.id === b.id);
          return b.id !== trimingBeat.id && 
                 original && 
                 (b.pct_from !== original.pct_from || b.pct_to !== original.pct_to);
        }) : [];
        
        // Combine both (pushed beats have priority)
        const allUpdates = [...pushedBeats];
        for (const r of rippleUpdates) {
          if (!allUpdates.find(p => p.id === r.id)) {
            allUpdates.push(r);
          }
        }
        
        // Filter to only DB beats
        const dbUpdates = allUpdates.filter(b => dbBeatIds.has(b.id));
        console.log(`[Beat Trim] 📤 Saving ${dbUpdates.length}/${allUpdates.length} pushed/rippled beats to DB (skipping ${allUpdates.length - dbUpdates.length} template beats)`);
        
        // Update all affected beats sequentially
        for (const b of dbUpdates) {
          try {
            await BeatsAPI.updateBeat(b.id, { pct_from: b.pct_from, pct_to: b.pct_to });
            console.log(`[Beat Trim] ✅ Saved \"${b.label}\" position`);
          } catch (error: any) {
            // If beat doesn't exist, remove from tracking
            if (error.message?.includes('404') || error.message?.includes('not found')) {
              console.warn(`[Beat Trim] ⚠️ Beat ${b.id} not found in DB, removing from tracking...`);
              setDbBeatIds(prev => {
                const next = new Set(prev);
                next.delete(b.id);
                return next;
              });
              continue;
            }
            throw error;
          }
        }
        
        // Apply to local state (use current beats state which already includes pushed beats)
        // If ripple was applied, merge with current state
        if (beatMagnetEnabled && withRipple.length > 0) {
          // Merge ripple updates with manually pushed beats
          const mergedBeats = beats.map(b => {
            const rippled = withRipple.find(r => r.id === b.id);
            return rippled || b;
          });
          setBeats(mergedBeats);
        }
        // Otherwise beats state is already correct from handleTrimMove
        
      } else {
        // Left handle - just update DB (only if it's in DB)
        if (dbBeatIds.has(trimingBeat.id)) {
          try {
            await BeatsAPI.updateBeat(trimingBeat.id, { pct_from: beat.pct_from });
          } catch (error: any) {
            // If beat doesn't exist in DB (404), remove it from tracking
            if (error.message?.includes('404') || error.message?.includes('not found')) {
              console.warn(`[Beat Trim] ⚠️ Beat ${trimingBeat.id} not found in DB, removing from tracking...`);
              setDbBeatIds(prev => {
                const next = new Set(prev);
                next.delete(trimingBeat.id);
                return next;
              });
              setTrimingBeat(null);
              return;
            }
            throw error;
          }
        } else {
          console.log(`[Beat Trim] ⏭️ Skipping DB update for template beat ${trimingBeat.id}`);
        }
      }
      
      console.log('[Beat Trim] ✅ DB updated successfully');
    } catch (error) {
      console.error('[Beat Trim] ❌ Error updating beat:', error);
      console.error('[Beat Trim] ❌ Error details:', {
        beatId: trimingBeat.id,
        handle: trimingBeat.handle,
        pct_from: beat.pct_from,
        pct_to: beat.pct_to,
        error: error instanceof Error ? error.message : String(error)
      });
      // Revert to original state on error
      setBeats(originalBeats);
    }
    
    setTrimingBeat(null);
  };
  
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
  
  useEffect(() => {
    if (trimingBeat) {
      window.addEventListener('mousemove', handleTrimMove);
      window.addEventListener('mouseup', handleTrimEnd);
      return () => {
        window.removeEventListener('mousemove', handleTrimMove);
        window.removeEventListener('mouseup', handleTrimEnd);
      };
    }
  }, [trimingBeat, beats, pxPerSec, duration, beatMagnetEnabled]);
  
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
      // Film projects: not implemented yet
      console.log('[Playback] ⚠️ Playback only supported for book projects');
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
  
  // 📊 LOAD TIMELINE DATA
  useEffect(() => {
    if (initialData) {
      setTimelineData(initialData);
    }
  }, [initialData]);
  
  useEffect(() => {
    const loadTimelineData = async () => {
      if (timelineData || isLoadingData) return;
      
      try {
        setIsLoadingData(true);
        const token = await getAccessToken();
        if (!token) return;
        
        console.log('[VideoEditorTimeline] 📥 Loading timeline data...');
        
        const loadedActs = await TimelineAPI.getActs(projectId, token);
        const allSequences = await TimelineAPI.getAllSequencesByProject(projectId, token);
        const allScenes = await TimelineAPI.getAllScenesByProject(projectId, token);
        const allShots = await ShotsAPI.getAllShotsByProject(projectId, token);
        
        if (isBookProject) {
          // Helper to extract text from Tiptap JSON
          const extractTextFromTiptap = (node: any): string => {
            if (!node) return '';
            let text = '';
            if (node.text) {
              text += node.text;
            }
            if (node.content && Array.isArray(node.content)) {
              node.content.forEach((child: any) => {
                text += extractTextFromTiptap(child);
                if (child.type === 'paragraph' || child.type === 'heading') {
                  text += ' ';
                }
              });
            }
            return text;
          };
          
          const parsedScenes = allScenes.map(scene => {
            // 🚀 PRIORITY: Use wordCount from database (metadata->wordCount) if available
            if (scene.metadata?.wordCount !== undefined && scene.metadata?.wordCount !== null) {
              return { ...scene, wordCount: scene.metadata.wordCount };
            }
            
            // 🔄 FALLBACK: Calculate from TipTap content if DB value is missing
            const contentSource = scene.content || scene.metadata?.content;
            
            if (contentSource && typeof contentSource === 'string') {
              try {
                const parsed = JSON.parse(contentSource);
                const textContent = extractTextFromTiptap(parsed);
                const wordCount = textContent.trim() 
                  ? textContent.trim().split(/\s+/).filter(w => w.length > 0).length 
                  : 0;
                return { ...scene, content: parsed, wordCount };
              } catch (e) {
                const textContent = typeof contentSource === 'string' ? contentSource : '';
                const wordCount = textContent.trim() 
                  ? textContent.trim().split(/\s+/).filter(w => w.length > 0).length 
                  : 0;
                return { ...scene, wordCount };
              }
            }
            
            return { ...scene, wordCount: 0 };
          });
          
          const sequencesWithWordCounts = allSequences.map(seq => {
            // 🚀 Use DB wordCount if available
            const dbWordCount = seq.metadata?.wordCount;
            if (dbWordCount !== undefined && dbWordCount !== null) {
              return { ...seq, wordCount: dbWordCount };
            }
            // Fallback: Calculate from scenes
            const sequenceScenes = parsedScenes.filter(sc => sc.sequenceId === seq.id);
            const totalWords = sequenceScenes.reduce((sum, sc) => sum + (sc.wordCount || 0), 0);
            return { ...seq, wordCount: totalWords };
          });
          
          const actsWithWordCounts = loadedActs.map(act => {
            // 🚀 Use DB wordCount if available
            const dbWordCount = act.metadata?.wordCount;
            if (dbWordCount !== undefined && dbWordCount !== null) {
              return { ...act, wordCount: dbWordCount };
            }
            // Fallback: Calculate from sequences
            const actSequences = sequencesWithWordCounts.filter(s => s.actId === act.id);
            const totalWords = actSequences.reduce((sum, s) => sum + (s.wordCount || 0), 0);
            return { ...act, wordCount: totalWords };
          });
          
          const data: BookTimelineData = {
            acts: actsWithWordCounts,
            sequences: sequencesWithWordCounts,
            scenes: parsedScenes,
          };
          
          setTimelineData(data);
          onDataChange?.(data);
        } else {
          const data: TimelineData = {
            acts: loadedActs,
            sequences: allSequences,
            scenes: allScenes,
            shots: allShots,
          };
          
          setTimelineData(data);
          onDataChange?.(data);
        }
      } catch (error) {
        console.error('[VideoEditorTimeline] Error loading timeline data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadTimelineData();
  }, [projectId, timelineData, isLoadingData, isBookProject, getAccessToken, onDataChange]);
  
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
        visible: endSec >= viewStartSec && startSec <= viewEndSec,
      };
    });
    const elapsed = performance.now() - start;
    if (elapsed > 5) {
      console.warn(`[VideoEditorTimeline] ⚠️ beatBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 5ms)`);
    }
    return result;
  }, [beats, duration, viewStartSec, viewEndSec, pxPerSec]);
  
  /**
   * Apply ripple effect to beats after a beat's end time changes
   * @param beatsArray - Current beats array
   * @param changedBeatId - ID of the beat that changed
   * @param oldEndSec - Old end time in seconds
   * @param newEndSec - New end time in seconds
   * @param magnetEnabled - Whether magnet is enabled
   * @returns Updated beats array with ripple applied
   */
  const applyBeatRipple = (
    beatsArray: BeatsAPI.StoryBeat[],
    changedBeatId: string,
    oldEndSec: number,
    newEndSec: number,
    magnetEnabled: boolean
  ): BeatsAPI.StoryBeat[] => {
    if (!magnetEnabled) return beatsArray;
    
    const delta = newEndSec - oldEndSec;
    if (delta === 0) return beatsArray;
    
    // Sort beats by start time
    const sortedBeats = [...beatsArray].sort((a, b) => a.pct_from - b.pct_from);
    
    return sortedBeats.map(beat => {
      // Skip the changed beat itself
      if (beat.id === changedBeatId) return beat;
      
      const beatStartSec = (beat.pct_from / 100) * duration;
      const beatEndSec = (beat.pct_to / 100) * duration;
      
      // Only shift beats that start at or after the old end position
      if (beatStartSec >= oldEndSec) {
        const newStartSec = beatStartSec + delta;
        const newEndSec = beatEndSec + delta;
        
        // Convert back to percentage
        const newPctFrom = Math.max(0, Math.min(100, (newStartSec / duration) * 100));
        const newPctTo = Math.max(0, Math.min(100, (newEndSec / duration) * 100));
        
        return {
          ...beat,
          pct_from: newPctFrom,
          pct_to: newPctTo,
        };
      }
      
      return beat;
    });
  };
  
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
  
  // 🚀 OPTIMIZED: Memoized act blocks calculation
  const actBlocks = useMemo(() => {
    const start = performance.now();
    const result = calculateActBlocks(timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, readingSpeedWpm);
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ actBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, readingSpeedWpm]);
  
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
    const result = calculateSequenceBlocks(timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, totalWords, readingSpeedWpm);
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ sequenceBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, totalWords, readingSpeedWpm]);
  
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
    const result = calculateSceneBlocks(timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, readingSpeedWpm);
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`[VideoEditorTimeline] ⚠️ sceneBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`);
    }
    return result;
  }, [timelineData, duration, viewStartSec, viewEndSec, pxPerSec, isBookProject, readingSpeedWpm]);

  const shotBlocks = useMemo(() => {
    if (isBookProject || !timelineData || !('shots' in timelineData) || !timelineData.shots?.length) {
      return [];
    }

    const sceneById = new Map(sceneBlocks.map(scene => [scene.id, scene]));
    const shotsByScene = new Map<string, any[]>();

    for (const shot of timelineData.shots) {
      const sceneId = (shot as any).sceneId || (shot as any).scene_id;
      if (!sceneId) continue;
      const current = shotsByScene.get(sceneId) || [];
      current.push(shot);
      shotsByScene.set(sceneId, current);
    }

    const blocks: any[] = [];
    for (const [sceneId, sceneShots] of shotsByScene.entries()) {
      const scene = sceneById.get(sceneId);
      if (!scene) continue;

      const orderedShots = [...sceneShots].sort((a, b) => {
        const orderA = (a as any).orderIndex ?? (a as any).order_index ?? 0;
        const orderB = (b as any).orderIndex ?? (b as any).order_index ?? 0;
        return orderA - orderB;
      });

      const slotDuration = (scene.endSec - scene.startSec) / Math.max(1, orderedShots.length);
      orderedShots.forEach((shot, index) => {
        const startSec = scene.startSec + index * slotDuration;
        const endSec = startSec + slotDuration;
        const x = (startSec - viewStartSec) * pxPerSec;
        const width = Math.max(2, (endSec - startSec) * pxPerSec);
        blocks.push({
          ...(shot as any),
          startSec,
          endSec,
          x,
          width,
          visible: endSec >= viewStartSec && startSec <= viewEndSec,
          label: (shot as any).shotNumber || (shot as any).shot_number || (shot as any).title || `Shot ${index + 1}`,
        });
      });
    }

    return blocks;
  }, [isBookProject, timelineData, sceneBlocks, viewStartSec, pxPerSec, viewEndSec]);
  
  // 🎯 UPDATE REF: Store sceneBlocks for playback functions
  sceneBlocksRef.current = sceneBlocks;
  
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
              // 🎬 FILM: Video placeholder
              <>
                <img 
                  src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=450&fit=crop"
                  alt="Preview"
                  className="w-full h-full object-cover rounded"
                />
                
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
            onClick={() => setZoomAroundCursor(Math.max(0, zoom - 0.1))}
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
            onClick={() => setZoomAroundCursor(Math.min(1, zoom + 0.1))}
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
        <div className="w-20 flex-shrink-0 bg-card border-r border-border">
          <div className="h-12 border-b border-border px-2 flex items-center bg-card">
            <span className="text-[9px] text-foreground font-medium">Zeit</span>
          </div>
          <div 
            className="border-b border-border px-2 flex items-center justify-between bg-card relative"
            style={{ height: `${trackHeights.beat}px` }}
          >
            <span className="text-[9px] text-foreground font-medium">Beat</span>
            <button
              onClick={() => setBeatMagnetEnabled(!beatMagnetEnabled)}
              className={cn(
                'text-sm transition-all hover:scale-110',
                beatMagnetEnabled ? 'opacity-100' : 'opacity-30 grayscale'
              )}
              title={beatMagnetEnabled ? 'Magnet: ON (Ripple aktiv)' : 'Magnet: OFF (Keine Ripple)'}
            >
              🧲
            </button>
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'beat' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('beat', e)}
            />
          </div>
          <div 
            className="border-b border-border px-2 flex items-center bg-card relative"
            style={{ height: `${trackHeights.act}px` }}
          >
            <span className="text-[9px] text-foreground font-medium">
              {isBookProject ? 'Akt' : 'Act'}
            </span>
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'act' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('act', e)}
            />
          </div>
          <div 
            className="border-b border-border px-2 flex items-center bg-card relative"
            style={{ height: `${trackHeights.sequence}px` }}
          >
            <span className="text-[9px] text-foreground font-medium">
              {isBookProject ? 'Kapitel' : 'Seq'}
            </span>
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'sequence' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('sequence', e)}
            />
          </div>
          <div 
            className="border-b border-border px-2 flex items-center bg-card relative"
            style={{ height: `${trackHeights.scene}px` }}
          >
            <span className="text-[9px] text-foreground font-medium">
              {isBookProject ? 'Abschnitt' : 'Scene'}
            </span>
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === 'scene' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
              )}
              onMouseDown={(e) => handleResizeStart('scene', e)}
            />
          </div>
          {!isBookProject && (
            <div
              className="border-b border-border px-2 flex items-center bg-card relative"
              style={{ height: `${trackHeights.shot}px` }}
            >
              <span className="text-[9px] text-foreground font-medium">
                Shot
              </span>
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                  resizingTrack === 'shot' ? 'border-b-4 border-primary' : 'hover:border-b-4 hover:border-primary'
                )}
                onMouseDown={(e) => handleResizeStart('shot', e)}
              />
            </div>
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
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.beat}px` }}
            >
              {beatBlocks
                .filter(beat => beat.visible)
                .map((beat, index) => {
                  const displayText = getBlockText(beat.label || '', beat.width, 'beat', index);
                  const beatColor = getBeatColorClasses(beat.color);
                  return (
                    <div
                      key={beat.id}
                      className={cn(
                        'absolute top-1 bottom-1 rounded cursor-pointer hover:opacity-80 transition-opacity group',
                        BEAT_STYLES.container,
                        beatColor.container
                      )}
                      style={{
                        left: `${beat.x}px`,
                        width: `${beat.width}px`,
                        backgroundColor: beat.color || undefined,
                      }}
                      onDoubleClick={() => handleDeleteBeat(beat.id)}
                      title="Doppelklick zum Löschen"
                    >
                      {/* Left Handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-900/80 dark:bg-purple-600/80 cursor-ew-resize hover:bg-purple-700 dark:hover:bg-purple-500 transition-colors rounded-l z-10"
                        onMouseDown={(e) => handleTrimStart(beat.id, 'left', e)}
                        title="Linken Rand ziehen"
                      />
                      
                      {/* Center Content */}
                      <div className="h-full flex items-center justify-center px-1 overflow-hidden">
                        <span className={cn('text-[10px] truncate', BEAT_STYLES.text, beatColor.text)}>
                          {displayText}
                        </span>
                      </div>
                      
                      {/* Right Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 bg-purple-900/80 dark:bg-purple-600/80 cursor-ew-resize hover:bg-purple-700 dark:hover:bg-purple-500 transition-colors rounded-r z-10"
                        onMouseDown={(e) => handleTrimStart(beat.id, 'right', e)}
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
              className="relative border-b border-border bg-muted/30"
              style={{ height: `${trackHeights.act}px` }}
            >
              {actBlocks
                .filter(act => act.visible)
                .map((act, index) => {
                  const displayText = getBlockText(act.title || '', act.width, 'act', index);
                  return (
                    <div
                      key={act.id}
                      className="absolute top-1 bottom-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-700"
                      style={{
                        left: `${act.x}px`,
                        width: `${act.width}px`,
                      }}
                    >
                      <div className="h-full flex items-center justify-center px-1 overflow-hidden">
                        <span className="text-[10px] text-blue-900 dark:text-blue-100 font-medium truncate">
                          {displayText}
                        </span>
                      </div>
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
                      className="absolute top-1 bottom-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-green-50 dark:bg-green-950/40 border-2 border-green-200 dark:border-green-700"
                      style={{
                        left: `${seq.x}px`,
                        width: `${seq.width}px`,
                      }}
                    >
                      <div className="h-full flex items-center justify-center px-1 overflow-hidden">
                        <span className="text-[10px] text-green-900 dark:text-green-100 font-medium truncate">
                          {displayText}
                        </span>
                      </div>
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
                      className="absolute top-1 bottom-1 rounded cursor-pointer hover:opacity-90 transition-opacity bg-pink-50 border-2 border-pink-200 dark:bg-pink-950/40 dark:border-pink-700 overflow-hidden"
                      style={{
                        left: `${scene.x}px`,
                        width: `${scene.width}px`,
                      }}
                      onClick={() => {
                        console.log('[VideoEditorTimeline] 🚀 Opening Content Modal for scene:', scene.id);
                        setEditingSceneForModal(scene);
                        setShowContentModal(true);
                      }}
                    >
                      {showFullContent && (
                        <div className="h-full flex flex-col px-2 py-1 overflow-hidden">
                          <span className="text-[9px] font-medium mb-0.5 truncate text-[rgb(230,0,118)] dark:text-pink-300">
                            {scene.title}
                          </span>
                          <div className="flex-1 overflow-hidden text-[8px] text-pink-800 dark:text-pink-200/90">
                            {scene.content && typeof scene.content === 'object' ? (
                              <ReadonlyTiptapView content={scene.content} />
                            ) : (
                              <em className="text-muted-foreground/50">Leer...</em>
                            )}
                          </div>
                        </div>
                      )}
                      {showAbbreviatedTitle && (
                        <div className="h-full flex items-center justify-center px-1 overflow-hidden">
                          <span className="text-[9px] font-medium truncate text-[rgb(230,0,118)] dark:text-pink-300">
                            {displayText}
                          </span>
                        </div>
                      )}
                      {showMinimal && (
                        <div className="h-full flex items-center justify-center overflow-hidden">
                          <span className="text-[9px] font-bold text-[rgb(230,0,118)] dark:text-pink-300">
                            {displayText}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {/* Playhead */}
              <div
                ref={playheadSceneRef}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              />
            </div>

            {/* Shot Track */}
            {!isBookProject && (
              <div
                className="relative border-b border-border bg-muted/20"
                style={{ height: `${trackHeights.shot}px` }}
              >
                {shotBlocks
                  .filter(shot => shot.visible)
                  .map((shot, index) => {
                    const displayText = getBlockText(shot.label || '', shot.width, 'shot', index);
                    return (
                      <div
                        key={shot.id}
                        className="absolute top-1 bottom-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-yellow-50 border-2 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-600"
                        style={{
                          left: `${shot.x}px`,
                          width: `${shot.width}px`,
                        }}
                      >
                        <div className="h-full flex items-center justify-center px-1 overflow-hidden">
                          <span className="text-[10px] text-yellow-900 dark:text-yellow-100 font-medium truncate">
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
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-card border-t border-border p-3">
        <Button variant="outline" size="sm" className="border-2 border-primary">
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>
      
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
          title={editingSceneForModal.title}
        />
      )}
    </div>
  );
}