/**
 * Zentrale Visuelle für Timeline-Clip-Zellen (VideoEditorTimeline): Act als Vorlage —
 * Pastell-Fill + border-2 + Griff-Farbe (handleBg) aus einer Quelle.
 *
 * Neue Spur:
 * 1. `TIMELINE_TRACK_KINDS` + `TimelineTrackKind` um den neuen Literal erweitern
 * 2. `TIMELINE_TRACK_REGISTRY` um einen Eintrag ergänzen (fill, border, handleBg wie Act-Zeile)
 * 3. `TRIM_GRAB_PRESET_BASE_HEX` in trim-handle-colors.ts ergänzen
 * 4. VideoEditorTimeline: Render nutzt `getTimelineTrackClipClasses` / `getTrimGrabHandleStyles`
 */

import { cn } from "../components/ui/utils";

/** Alle Track-Arten der Film-Timeline (eine Union für Registry + Trim-Preset). */
export const TIMELINE_TRACK_KINDS = [
  "beat",
  "act",
  "sequence",
  "scene",
  "shot",
] as const;
export type TimelineTrackKind = (typeof TIMELINE_TRACK_KINDS)[number];

export type TimelineTrackHoverOpacity = "80" | "90";
export type TimelineTrackOverflow = "visible" | "hidden";

export type TimelineTrackVisual = {
  /** Standard-Fill (Pastell); bei Beat ohne beat.color; bei Shot wenn kein Full-Bleed-Bild */
  fill: string;
  border: string;
  /** Tailwind für Trim-Griffe = sichtbare Randfarbe (gleiche Logik wie Act) */
  handleBg: string;
  hoverOpacity: TimelineTrackHoverOpacity;
  overflow: TimelineTrackOverflow;
  /** Beat: Menü-/Label-Text */
  textDefault: string;
  textWithCustomColor: string;
};

/**
 * Act-Zeile als Referenz; alle anderen folgen demselben Muster (fill + border + handleBg).
 */
export const TIMELINE_TRACK_REGISTRY: Record<
  TimelineTrackKind,
  TimelineTrackVisual
> = {
  act: {
    fill: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-2 border-blue-200 dark:border-blue-700",
    /** Etwas heller als der Rand: sonst verschmilzt 2px Border + Griffstreifen optisch zu einem Block. */
    handleBg: "bg-blue-300 dark:bg-blue-500",
    hoverOpacity: "80",
    overflow: "hidden",
    textDefault: "text-[10px] text-blue-900 dark:text-blue-100 font-medium",
    textWithCustomColor:
      "text-[10px] text-blue-900 dark:text-blue-100 font-medium",
  },
  sequence: {
    fill: "bg-green-50 dark:bg-green-950/40",
    border: "border-2 border-green-200 dark:border-green-700",
    handleBg: "bg-green-300 dark:bg-green-500",
    hoverOpacity: "80",
    overflow: "hidden",
    textDefault: "text-[10px] text-green-900 dark:text-green-100 font-medium",
    textWithCustomColor:
      "text-[10px] text-green-900 dark:text-green-100 font-medium",
  },
  scene: {
    fill: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-2 border-pink-200 dark:border-pink-700",
    handleBg: "bg-pink-300 dark:bg-pink-500",
    hoverOpacity: "90",
    overflow: "visible",
    textDefault: "text-[10px] text-pink-900 dark:text-pink-100 font-medium",
    textWithCustomColor:
      "text-[10px] text-pink-900 dark:text-pink-100 font-medium",
  },
  shot: {
    fill: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-2 border-yellow-400 dark:border-yellow-600",
    handleBg: "bg-yellow-300 dark:bg-yellow-500",
    hoverOpacity: "90",
    overflow: "hidden",
    textDefault:
      "text-[10px] font-medium truncate min-w-0 text-yellow-900 dark:text-yellow-100",
    textWithCustomColor:
      "text-[10px] font-medium truncate min-w-0 text-yellow-900 dark:text-yellow-100",
  },
  beat: {
    fill: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-2 border-purple-400 dark:border-purple-500",
    handleBg: "bg-purple-400 dark:bg-purple-500",
    hoverOpacity: "80",
    overflow: "hidden",
    textDefault: "text-[10px] font-medium text-purple-900 dark:text-purple-100",
    textWithCustomColor:
      "text-[10px] font-medium text-[#6956bd] dark:text-[#6956bd]",
  },
};

const CLIP_SHELL =
  "absolute inset-y-0 rounded cursor-pointer transition-opacity group";

export type TimelineTrackClipOptions = {
  /** Shot: schmales Shot mit Vollflächen-Preview — kein Pastell-Fill, stattdessen bg-cover */
  shotFullBleedImage?: boolean;
  /** Beat: `beat.color` setzt die Fläche per inline — nur Shell + Border, kein Pastell-`fill` */
  beatSkipFill?: boolean;
};

/**
 * `className` für eine Timeline-Clip-Zelle (Layout + Fill/Border aus Registry).
 * Beat: bei gesetztem `beat.color` zusätzlich `style={{ backgroundColor: beat.color }}` setzen; ohne Farbe nur diese Klassen.
 */
export function getTimelineTrackClipClasses(
  kind: TimelineTrackKind,
  options?: TimelineTrackClipOptions,
): string {
  const r = TIMELINE_TRACK_REGISTRY[kind];
  const hover =
    r.hoverOpacity === "90" ? "hover:opacity-90" : "hover:opacity-80";
  const overflow =
    r.overflow === "visible" ? "overflow-visible" : "overflow-hidden";

  if (kind === "shot" && options?.shotFullBleedImage) {
    return cn(CLIP_SHELL, hover, overflow, r.border, "bg-cover bg-center");
  }

  if (kind === "beat" && options?.beatSkipFill) {
    return cn(CLIP_SHELL, hover, overflow, r.border);
  }

  return cn(CLIP_SHELL, hover, overflow, r.fill, r.border);
}

/** Griff-Hintergrund-Klassen = immer `handleBg` aus der Registry (Randfarbe). */
export function getTrimHandleBgClass(kind: TimelineTrackKind): string {
  return TIMELINE_TRACK_REGISTRY[kind].handleBg;
}
