/**
 * App-weites Undo für Server-Mutationen (nicht Timeline-Beats-Stack).
 *
 * - **Timeline / Struktur-Beats:** Undo läuft über `TimelineStateContext` + Cmd+Z in
 *   `[data-app-undo-priority="timeline"]` (Capture-Phase in `StructureBeatsSection`).
 * - **Globale Aktionen** (Löschen in FilmDropdown, später weitere Features): `registerAppUndo`
 *   bzw. `pushAppUndoAction` — Navigation-Buttons und `setupUndoKeyboardShortcuts` nutzen
 *   `undoManager`.
 *
 * @see `pushAppUndoAction` in `./undo-manager`
 */

import { pushAppUndoAction } from "./undo-manager";

/** `data-app-undo-priority`-Wert für Structure & Beats (Timeline-Stack hat Vorrang per Capture-Handler). */
export const APP_UNDO_PRIORITY_TIMELINE = "timeline" as const;

export type RegisterAppUndoOptions = Parameters<typeof pushAppUndoAction>[0];

/** Dünner Alias für neue Features — gleiche Signatur wie `pushAppUndoAction`. */
export function registerAppUndo(options: RegisterAppUndoOptions): string {
  return pushAppUndoAction(options);
}
