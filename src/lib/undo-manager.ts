/**
 * 🔄 UNDO MANAGER - Global Undo/Redo System
 *
 * Provides app-wide undo/redo functionality with CMD+Z / CTRL+Z
 * - Tracks all create, update, delete operations
 * - Maintains undo/redo history
 * - Rollback support for failed operations
 * - Keyboard shortcuts integration
 */

import { toast } from "sonner";

export interface UndoAction {
  type: "create" | "update" | "delete";
  /** `feature` = generische Einträge über pushAppUndoAction (beliebige Features) */
  entity:
    | "act"
    | "sequence"
    | "scene"
    | "shot"
    | "character"
    | "inspiration"
    | "project"
    | "feature";
  id: string;
  data?: any; // For rollback
  previousData?: any; // For undo
  timestamp: Date;
  description: string;
}

interface UndoCallback {
  execute: () => Promise<void>;
  description: string;
}

class UndoManager {
  private history: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxHistorySize = 50;
  private callbacks = new Map<string, UndoCallback>();
  private listeners = new Set<() => void>();

  /** React / UI: bei History-Änderung neu rendern (useSyncExternalStore). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  }

  /**
   * Register an action in the undo history
   */
  push(action: UndoAction): void {
    this.history.push(action);

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.notify();
  }

  /**
   * Register a callback for undoing a specific operation
   */
  registerCallback(key: string, callback: UndoCallback): void {
    this.callbacks.set(key, callback);
  }

  /**
   * Undo last action
   */
  async undo(): Promise<boolean> {
    const action = this.history.pop();
    if (!action) {
      console.log("[Undo Manager] Nothing to undo");
      return false;
    }

    console.log("[Undo Manager] Undoing action:", action);

    try {
      // Get callback for this action
      const callbackKey = this.getCallbackKey(action);
      const callback = this.callbacks.get(callbackKey);

      if (callback) {
        await callback.execute();
        this.redoStack.push(action);
        this.notify();
        return true;
      } else {
        console.warn("[Undo Manager] No callback registered for:", callbackKey);
        return false;
      }
    } catch (error) {
      console.error("[Undo Manager] Error during undo:", error);
      // Restore action to history on failure
      this.history.push(action);
      this.notify();
      return false;
    }
  }

  /**
   * Redo last undone action
   */
  async redo(): Promise<boolean> {
    const action = this.redoStack.pop();
    if (!action) {
      console.log("[Undo Manager] Nothing to redo");
      return false;
    }

    console.log("[Undo Manager] Redoing action:", action);

    try {
      const callbackKey = this.getRedoCallbackKey(action);
      const callback = this.callbacks.get(callbackKey);

      if (callback) {
        await callback.execute();
        this.history.push(action);
        this.notify();
        return true;
      } else {
        console.warn(
          "[Undo Manager] No redo callback registered for:",
          callbackKey,
        );
        return false;
      }
    } catch (error) {
      console.error("[Undo Manager] Error during redo:", error);
      // Restore action to redo stack on failure
      this.redoStack.push(action);
      this.notify();
      return false;
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.redoStack = [];
    this.callbacks.clear();
    this.notify();
  }

  /**
   * Get undo history
   */
  getHistory(): UndoAction[] {
    return [...this.history];
  }

  /**
   * Get redo stack
   */
  getRedoStack(): UndoAction[] {
    return [...this.redoStack];
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private getCallbackKey(action: UndoAction): string {
    return `undo:${action.type}:${action.entity}:${action.id}`;
  }

  private getRedoCallbackKey(action: UndoAction): string {
    return `redo:${action.type}:${action.entity}:${action.id}`;
  }
}

// Singleton instance
export const undoManager = new UndoManager();

function makeFeatureUndoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Einheitliche Registrierung für beliebige Features (Timeline, Dialoge, Stage-Metadaten, …).
 * Nutzt `entity: 'feature'` und passende Callback-Keys für Undo/Redo.
 */
export function pushAppUndoAction(options: {
  description: string;
  undo: () => Promise<void>;
  redo?: () => Promise<void>;
}): string {
  const id = makeFeatureUndoId();
  undoManager.registerCallback(`undo:update:feature:${id}`, {
    execute: options.undo,
    description: options.description,
  });
  if (options.redo) {
    undoManager.registerCallback(`redo:update:feature:${id}`, {
      execute: options.redo,
      description: options.description,
    });
  }
  undoManager.push({
    type: "update",
    entity: "feature",
    id,
    timestamp: new Date(),
    description: options.description,
  });
  return id;
}

function isEditableUndoTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Stage-2D nutzt eigenes Undo für Zeichenstriche — globalen Stack hier nicht abarbeiten. */
function isStageUndoPriorityTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[data-app-undo-priority="stage"]'));
}

/**
 * Hook up keyboard shortcuts for undo/redo (bubble phase on `window`).
 *
 * Structure & Beats: timeline undo runs in **capture** phase in `StructureBeatsSection`
 * (`TimelineUndoRedoShortcuts`) inside `[data-app-undo-priority="timeline"]` and only stops
 * propagation when the timeline stack can handle Cmd+Z — otherwise this handler still runs.
 */
export function setupUndoKeyboardShortcuts(): () => void {
  const handleKeyDown = async (event: KeyboardEvent) => {
    if (isEditableUndoTarget(event.target)) {
      return;
    }
    if (isStageUndoPriorityTarget(event.target)) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    // CMD+Z / CTRL+Z - Undo
    if (ctrlOrCmd && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      const success = await undoManager.undo();
      if (success) {
        toast.success("Rückgängig gemacht");
      }
    }

    // CMD+SHIFT+Z / CTRL+Y - Redo
    if (
      (ctrlOrCmd && event.shiftKey && event.key === "z") ||
      (ctrlOrCmd && event.key === "y")
    ) {
      event.preventDefault();
      const success = await undoManager.redo();
      if (success) {
        toast.success("Wiederherstellt");
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  // Return cleanup function
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * @deprecated Nutze `useAppUndo` aus `hooks/useAppUndo.ts` — re-rendert bei History-Änderungen.
 */
export function useUndo() {
  const canUndo = undoManager.canUndo();
  const canRedo = undoManager.canRedo();

  return {
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    canUndo,
    canRedo,
    history: undoManager.getHistory(),
    redoStack: undoManager.getRedoStack(),
  };
}
