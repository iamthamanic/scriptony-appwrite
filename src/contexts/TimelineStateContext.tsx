/**
 * 🎬 TIMELINE STATE CONTEXT
 *
 * Single Source of Truth for all timeline data across views:
 * - FilmDropdown, BookDropdown, VideoEditorTimeline, NativeViews
 * - Changes in one view are instantly visible in all others
 * - Undo/Redo support via history stack
 *
 * Architecture:
 *   ProjectsPage → StructureBeatsSection → <TimelineStateProvider>
 *     ├── FilmDropdown (reads/writes via context)
 *     ├── VideoEditorTimeline (reads/writes via context)
 *     ├── BookDropdown (reads/writes via context)
 *     └── NativeViews (reads from context)
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useMemo, useEffect } from 'react';
import type { Act, Sequence, Scene, Shot, Character } from '../lib/types';

// ─── Data Types ──────────────────────────────────────────────────────

export interface TimelineStateData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
}

// ─── Actions ─────────────────────────────────────────────────────────

type TimelineAction =
  | { type: 'SET_TIMELINE_DATA'; payload: Partial<TimelineStateData> }
  // Acts
  | { type: 'SET_ACTS'; payload: Act[] }
  | { type: 'ADD_ACT'; payload: Act }
  | { type: 'UPDATE_ACT'; id: string; payload: Partial<Act> }
  | { type: 'DELETE_ACT'; id: string }
  // Sequences
  | { type: 'SET_SEQUENCES'; payload: Sequence[] }
  | { type: 'ADD_SEQUENCE'; payload: Sequence }
  | { type: 'UPDATE_SEQUENCE'; id: string; payload: Partial<Sequence> }
  | { type: 'DELETE_SEQUENCE'; id: string }
  // Scenes
  | { type: 'SET_SCENES'; payload: Scene[] }
  | { type: 'ADD_SCENE'; payload: Scene }
  | { type: 'UPDATE_SCENE'; id: string; payload: Partial<Scene> }
  | { type: 'DELETE_SCENE'; id: string }
  // Shots
  | { type: 'SET_SHOTS'; payload: Shot[] }
  | { type: 'ADD_SHOT'; payload: Shot }
  | { type: 'UPDATE_SHOT'; id: string; payload: Partial<Shot> }
  | { type: 'DELETE_SHOT'; id: string }
  // Characters
  | { type: 'SET_CHARACTERS'; payload: Character[] }
  // Batch (for trim operations — single dispatch, single re-render)
  | { type: 'BATCH_UPDATE'; payload: { acts?: Array<{ id: string; updates: Partial<Act> }>; sequences?: Array<{ id: string; updates: Partial<Sequence> }>; scenes?: Array<{ id: string; updates: Partial<Scene> }>; shots?: Array<{ id: string; updates: Partial<Shot> }> } }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ─── State ───────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

interface TimelineState {
  data: TimelineStateData;
  history: TimelineStateData[];
  historyIndex: number;
}

type ComparableTimelineData = {
  acts: Array<{ id?: string; updatedAt?: string }>;
  sequences: Array<{ id?: string; updatedAt?: string }>;
  scenes: Array<{ id?: string; updatedAt?: string }>;
  /** imageUrl included so server-side preview updates (e.g. Stage upload) reflow into context */
  shots: Array<{ id?: string; updatedAt?: string; imageUrl?: string }>;
};

function toComparableTimelineData(data?: Partial<TimelineStateData>): ComparableTimelineData {
  const mapItems = (items: Array<any> | undefined) =>
    (items || [])
      .map((item) => ({
        id: item?.id,
        updatedAt: item?.updatedAt,
      }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

  const mapShots = (items: Array<any> | undefined) =>
    (items || [])
      .map((item) => ({
        id: item?.id,
        updatedAt: item?.updatedAt,
        imageUrl: item?.imageUrl ?? item?.image_url ?? "",
      }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

  return {
    acts: mapItems(data?.acts),
    sequences: mapItems(data?.sequences),
    scenes: mapItems(data?.scenes),
    shots: mapShots(data?.shots),
  };
}

function timelineSignature(data?: Partial<TimelineStateData>): string {
  return JSON.stringify(toComparableTimelineData(data));
}

function createInitialState(initialData?: Partial<TimelineStateData>): TimelineState {
  const data: TimelineStateData = {
    acts: initialData?.acts || [],
    sequences: initialData?.sequences || [],
    scenes: initialData?.scenes || [],
    shots: initialData?.shots || [],
    characters: initialData?.characters || [],
  };
  return {
    data,
    history: [structuredClone(data)],
    historyIndex: 0,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────

function pushHistory(state: TimelineState, newData: TimelineStateData): TimelineState {
  // Trim future history (if we undid and now do a new action)
  const trimmedHistory = state.history.slice(0, state.historyIndex + 1);
  const newHistory = [...trimmedHistory, structuredClone(newData)];
  // Cap at MAX_HISTORY
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  return {
    data: newData,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    // ── Full data set (initial load, cache update) — no history push ──
    case 'SET_TIMELINE_DATA': {
      const newData = {
        ...state.data,
        ...action.payload,
      };
      // Replace history with current state (reset on full load)
      return {
        data: newData,
        history: [structuredClone(newData)],
        historyIndex: 0,
      };
    }

    // ── Acts ──
    case 'SET_ACTS': {
      const newData = { ...state.data, acts: action.payload };
      return pushHistory(state, newData);
    }
    case 'ADD_ACT': {
      const newData = { ...state.data, acts: [...state.data.acts, action.payload] };
      return pushHistory(state, newData);
    }
    case 'UPDATE_ACT': {
      const newData = {
        ...state.data,
        acts: state.data.acts.map(a => a.id === action.id ? { ...a, ...action.payload } : a),
      };
      return pushHistory(state, newData);
    }
    case 'DELETE_ACT': {
      const newData = {
        ...state.data,
        acts: state.data.acts.filter(a => a.id !== action.id),
        // Cascade: remove sequences/scenes/shots under this act
        sequences: state.data.sequences.filter(s => s.actId !== action.id),
        scenes: state.data.scenes.filter(sc => {
          const actSequenceIds = state.data.sequences.filter(s => s.actId === action.id).map(s => s.id);
          return !actSequenceIds.includes(sc.sequenceId || '');
        }),
        shots: state.data.shots.filter(sh => {
          const actSequenceIds = state.data.sequences.filter(s => s.actId === action.id).map(s => s.id);
          const actSceneIds = state.data.scenes.filter(sc => actSequenceIds.includes(sc.sequenceId || '')).map(sc => sc.id);
          return !actSceneIds.includes(sh.sceneId);
        }),
      };
      return pushHistory(state, newData);
    }

    // ── Sequences ──
    case 'SET_SEQUENCES': {
      const newData = { ...state.data, sequences: action.payload };
      return pushHistory(state, newData);
    }
    case 'ADD_SEQUENCE': {
      const newData = { ...state.data, sequences: [...state.data.sequences, action.payload] };
      return pushHistory(state, newData);
    }
    case 'UPDATE_SEQUENCE': {
      const newData = {
        ...state.data,
        sequences: state.data.sequences.map(s => s.id === action.id ? { ...s, ...action.payload } : s),
      };
      return pushHistory(state, newData);
    }
    case 'DELETE_SEQUENCE': {
      const seqSceneIds = state.data.scenes.filter(sc => sc.sequenceId === action.id).map(sc => sc.id);
      const newData = {
        ...state.data,
        sequences: state.data.sequences.filter(s => s.id !== action.id),
        scenes: state.data.scenes.filter(sc => sc.sequenceId !== action.id),
        shots: state.data.shots.filter(sh => !seqSceneIds.includes(sh.sceneId)),
      };
      return pushHistory(state, newData);
    }

    // ── Scenes ──
    case 'SET_SCENES': {
      const newData = { ...state.data, scenes: action.payload };
      return pushHistory(state, newData);
    }
    case 'ADD_SCENE': {
      const newData = { ...state.data, scenes: [...state.data.scenes, action.payload] };
      return pushHistory(state, newData);
    }
    case 'UPDATE_SCENE': {
      const newData = {
        ...state.data,
        scenes: state.data.scenes.map(sc => sc.id === action.id ? { ...sc, ...action.payload } : sc),
      };
      return pushHistory(state, newData);
    }
    case 'DELETE_SCENE': {
      const newData = {
        ...state.data,
        scenes: state.data.scenes.filter(sc => sc.id !== action.id),
        shots: state.data.shots.filter(sh => sh.sceneId !== action.id),
      };
      return pushHistory(state, newData);
    }

    // ── Shots ──
    case 'SET_SHOTS': {
      const newData = { ...state.data, shots: action.payload };
      return pushHistory(state, newData);
    }
    case 'ADD_SHOT': {
      const newData = { ...state.data, shots: [...state.data.shots, action.payload] };
      return pushHistory(state, newData);
    }
    case 'UPDATE_SHOT': {
      const newData = {
        ...state.data,
        shots: state.data.shots.map(sh => sh.id === action.id ? { ...sh, ...action.payload } : sh),
      };
      return pushHistory(state, newData);
    }
    case 'DELETE_SHOT': {
      const newData = {
        ...state.data,
        shots: state.data.shots.filter(sh => sh.id !== action.id),
      };
      return pushHistory(state, newData);
    }

    // ── Characters ──
    case 'SET_CHARACTERS': {
      // No history push for characters (not undoable)
      return {
        ...state,
        data: { ...state.data, characters: action.payload },
      };
    }

    // ── Batch (trim operations) ──
    case 'BATCH_UPDATE': {
      let newData = { ...state.data };
      if (action.payload.acts) {
        newData.acts = newData.acts.map(a => {
          const upd = action.payload.acts!.find(u => u.id === a.id);
          return upd ? { ...a, ...upd.updates } : a;
        });
      }
      if (action.payload.sequences) {
        newData.sequences = newData.sequences.map(s => {
          const upd = action.payload.sequences!.find(u => u.id === s.id);
          return upd ? { ...s, ...upd.updates } : s;
        });
      }
      if (action.payload.scenes) {
        newData.scenes = newData.scenes.map(sc => {
          const upd = action.payload.scenes!.find(u => u.id === sc.id);
          return upd ? { ...sc, ...upd.updates } : sc;
        });
      }
      if (action.payload.shots) {
        newData.shots = newData.shots.map(sh => {
          const upd = action.payload.shots!.find(u => u.id === sh.id);
          return upd ? { ...sh, ...upd.updates } : sh;
        });
      }
      return pushHistory(state, newData);
    }

    // ── Undo / Redo ──
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        data: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        data: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    }

    default:
      return state;
  }
}

// ─── Context Value ───────────────────────────────────────────────────

interface TimelineContextValue {
  // Data (read)
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  // Dispatch (write)
  dispatch: React.Dispatch<TimelineAction>;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  // Convenience: get the full TimelineData shape for backwards compat
  getTimelineData: () => { acts: Act[]; sequences: Sequence[]; scenes: Scene[]; shots: Shot[] };
  getBookTimelineData: () => { acts: Act[]; sequences: Sequence[]; scenes: Scene[] };
}

const TimelineStateContext = createContext<TimelineContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────

interface TimelineStateProviderProps {
  initialData?: Partial<TimelineStateData>;
  /** Called whenever timeline data changes (for parent cache sync) */
  onDataChange?: (data: { acts: Act[]; sequences: Sequence[]; scenes: Scene[]; shots: Shot[] }) => void;
  children: React.ReactNode;
}

export function TimelineStateProvider({ initialData, onDataChange, children }: TimelineStateProviderProps) {
  const [state, dispatch] = useReducer(timelineReducer, initialData, createInitialState);

  // Keep callback ref to avoid re-render cycles
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  // Sync incoming initialData changes (e.g. cache refresh from parent).
  // Guard strategy:
  // 1) Ignore duplicate initialData payloads
  // 2) Ignore exact echo of our last emitted change (loop prevention)
  // 3) Apply only if incoming payload differs from current context state
  const prevInitialSigRef = useRef<string>(timelineSignature(initialData));
  const lastEmittedSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialData) return;

    const incomingSig = timelineSignature(initialData);
    if (incomingSig === prevInitialSigRef.current) {
      return;
    }
    prevInitialSigRef.current = incomingSig;

    if (incomingSig === lastEmittedSigRef.current) {
      lastEmittedSigRef.current = null;
      return;
    }

    const currentSig = timelineSignature(state.data);
    if (incomingSig === currentSig) {
      return;
    }

    dispatch({ type: 'SET_TIMELINE_DATA', payload: initialData });
  }, [initialData, state.data]);

  // Notify parent of data changes
  const prevDataRef = useRef(state.data);
  useEffect(() => {
    if (state.data !== prevDataRef.current) {
      prevDataRef.current = state.data;
      lastEmittedSigRef.current = timelineSignature(state.data);
      onDataChangeRef.current?.({
        acts: state.data.acts,
        sequences: state.data.sequences,
        scenes: state.data.scenes,
        shots: state.data.shots,
      });
    }
  }, [state.data]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const getTimelineData = useCallback(() => ({
    acts: state.data.acts,
    sequences: state.data.sequences,
    scenes: state.data.scenes,
    shots: state.data.shots,
  }), [state.data.acts, state.data.sequences, state.data.scenes, state.data.shots]);

  const getBookTimelineData = useCallback(() => ({
    acts: state.data.acts,
    sequences: state.data.sequences,
    scenes: state.data.scenes,
  }), [state.data.acts, state.data.sequences, state.data.scenes]);

  const value = useMemo<TimelineContextValue>(() => ({
    acts: state.data.acts,
    sequences: state.data.sequences,
    scenes: state.data.scenes,
    shots: state.data.shots,
    characters: state.data.characters,
    dispatch,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    undo,
    redo,
    getTimelineData,
    getBookTimelineData,
  }), [state.data, state.historyIndex, state.history.length, undo, redo, getTimelineData, getBookTimelineData]);

  return (
    <TimelineStateContext.Provider value={value}>
      {children}
    </TimelineStateContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Main hook — returns all timeline data + dispatch */
export function useTimelineState() {
  const ctx = useContext(TimelineStateContext);
  if (!ctx) {
    throw new Error('useTimelineState must be used within a TimelineStateProvider');
  }
  return ctx;
}

/** Convenience: just undo/redo controls */
export function useTimelineUndo() {
  const ctx = useContext(TimelineStateContext);
  if (!ctx) {
    throw new Error('useTimelineUndo must be used within a TimelineStateProvider');
  }
  return {
    undo: ctx.undo,
    redo: ctx.redo,
    canUndo: ctx.canUndo,
    canRedo: ctx.canRedo,
  };
}

/** Convenience: check if context is available (for optional usage) */
export function useOptionalTimelineState() {
  return useContext(TimelineStateContext);
}

/** Get a single act by ID (memoized) */
export function useActById(actId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(
    () => ctx?.acts.find(a => a.id === actId),
    [ctx?.acts, actId]
  );
}

/** Get sequences for an act (memoized) */
export function useActSequences(actId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(
    () => ctx?.sequences.filter(s => s.actId === actId) || [],
    [ctx?.sequences, actId]
  );
}

/** Get scenes for a sequence (memoized) */
export function useSequenceScenes(sequenceId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(
    () => ctx?.scenes.filter(sc => sc.sequenceId === sequenceId) || [],
    [ctx?.scenes, sequenceId]
  );
}

/** Get shots for a scene (memoized) */
export function useSceneShots(sceneId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(
    () => ctx?.shots.filter(sh => sh.sceneId === sceneId) || [],
    [ctx?.shots, sceneId]
  );
}

/** Get a single shot by ID (memoized) */
export function useShotById(shotId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(
    () => ctx?.shots.find(sh => sh.id === shotId),
    [ctx?.shots, shotId]
  );
}

/** Get the scene that contains a shot (memoized) */
export function useSceneForShot(shotId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(() => {
    if (!ctx || !shotId) return undefined;
    const shot = ctx.shots.find(sh => sh.id === shotId);
    if (!shot) return undefined;
    return ctx.scenes.find(sc => sc.id === shot.sceneId);
  }, [ctx?.shots, ctx?.scenes, shotId]);
}

/** Get breadcrumb path for a shot: Act > Sequence > Scene > Shot */
export function useShotBreadcrumb(shotId: string | undefined) {
  const ctx = useContext(TimelineStateContext);
  return useMemo(() => {
    if (!ctx || !shotId) return null;
    const shot = ctx.shots.find(sh => sh.id === shotId);
    if (!shot) return null;
    const scene = ctx.scenes.find(sc => sc.id === shot.sceneId);
    if (!scene) return null;
    const sequence = ctx.sequences.find(s => s.id === scene.sequenceId);
    const act = sequence ? ctx.acts.find(a => a.id === sequence.actId) : undefined;
    return { act, sequence, scene, shot };
  }, [ctx?.acts, ctx?.sequences, ctx?.scenes, ctx?.shots, shotId]);
}
