/**
 * Globaler Undo/Redo-Hook für die App (singleton undoManager, Cmd/Ctrl+Z in AppContent).
 *
 * - `canUndo` / `canRedo` aktualisieren sich zuverlässig (useSyncExternalStore).
 * - `pushUndoable` = gleiche API wie `pushAppUndoAction` — neue Features sollen darüber Actions registrieren.
 *
 * Hinweis: Eigene Stacks bleiben sinnvoll, wo der State lokal ist:
 * - Stage-Zeichnung (StageCanvas) — Striche pro Layer
 * - TimelineStateContext — Struktur-Undo innerhalb der Structure-Section
 * Diese können bei Bedarf zusätzlich einen Eintrag per `pushUndoable` spiegeln oder nur lokal bleiben.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  undoManager,
  pushAppUndoAction,
  type UndoAction,
} from '../lib/undo-manager';
import { registerAppUndo } from '../lib/app-undo-operations';

export type { UndoAction };
export { registerAppUndo };

/** Stable snapshot for SSR / getServerSnapshot (same reference every call). */
const SERVER_UNDO_SNAPSHOT = {
  canUndo: false,
  canRedo: false,
  historyLength: 0,
} as const;

type UndoSnapshot = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly historyLength: number;
};

let cachedClientSnapshot: UndoSnapshot | null = null;

/**
 * useSyncExternalStore requires getSnapshot to return the **same object reference** when
 * values are unchanged — a fresh `{ ... }` each call triggers "Maximum update depth exceeded".
 */
function getUndoSnapshot(): UndoSnapshot {
  const canUndo = undoManager.canUndo();
  const canRedo = undoManager.canRedo();
  const historyLength = undoManager.getHistory().length;
  if (
    cachedClientSnapshot &&
    cachedClientSnapshot.canUndo === canUndo &&
    cachedClientSnapshot.canRedo === canRedo &&
    cachedClientSnapshot.historyLength === historyLength
  ) {
    return cachedClientSnapshot;
  }
  cachedClientSnapshot = { canUndo, canRedo, historyLength };
  return cachedClientSnapshot;
}

export function useAppUndo() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => undoManager.subscribe(onStoreChange),
    getUndoSnapshot,
    () => SERVER_UNDO_SNAPSHOT
  );

  const undo = useCallback(async () => undoManager.undo(), []);
  const redo = useCallback(async () => undoManager.redo(), []);
  const clear = useCallback(() => undoManager.clear(), []);
  const getHistory = useCallback(() => undoManager.getHistory(), []);

  return {
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    historyLength: snapshot.historyLength,
    undo,
    redo,
    clear,
    /** Neue Undo-Schritte hier registrieren (Undo + optional Redo). */
    pushUndoable: pushAppUndoAction,
    registerAppUndo,
    manager: undoManager,
    getHistory,
  };
}
