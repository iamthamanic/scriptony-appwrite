/**
 * Wiederverwendbare Trim-„Grab Handle“-Styles (Timeline & andere UI).
 *
 * In großen `.map()`-Listen: `getTrimGrabHandleStyles` nutzen (keine Hook-Regel-Verletzung).
 * In kleinen Leaf-Komponenten: `useTrimGrabHandles` (useMemo um die pure Funktion).
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  type TrimGrabPreset,
  clipBorderAndHandleColorFromBase,
  parseColorToHex,
  resolveTrimGrabBaseHex,
  trimEndCapBackgroundFromBase,
} from '../lib/trim-handle-colors';
import { getTrimHandleBgClass } from '../lib/timeline-track-tokens';

export type TrimGrabHandleOptions = {
  /** z. B. beat.color — sonst Preset-Standard */
  baseColorHex?: string | null;
  preset: TrimGrabPreset;
};

/**
 * Gleiche physische Breite wie die sichtbaren Endkappen — für Clip-`--trim-cap` + Content-Einrückung.
 * Vorher schmaler Streifen; jetzt ca. doppelte Griffbreite (min/mid/max jeweils ×2).
 */
export const TRIM_END_CAP_WIDTH = 'clamp(0.15rem, 5.6%, 0.4rem)';

/**
 * Timeline-Clips: `rounded` (= 0.25rem) + `border-2`. Griffe liegen in der Padding-Box; dort ist der
 * wirksame Eckenradius kleiner — sonst Lücken zwischen Rundung, Border und Griff (sichtbare „Schatten“).
 */
const CLIP_INNER_CORNER_RADIUS = 'max(0px, calc(0.25rem - 2px))';

const LAYOUT_BASE = `absolute top-0 bottom-0 z-[45] cursor-ew-resize pointer-events-auto transition-[filter] duration-150 hover:brightness-[1.04]`;

export function getTrimGrabHandleStyles(
  options: TrimGrabHandleOptions
): {
  leftStyle: CSSProperties;
  rightStyle: CSSProperties;
  handleLeftClassName: string;
  handleRightClassName: string;
  /** Wenn aus `baseColorHex` abgeleitet: für `style.borderColor` am Clip (Rand = Griff). */
  clipBorderColor?: string;
} {
  const capSurfaceBase: CSSProperties = {
    width: TRIM_END_CAP_WIDTH,
    minWidth: '3px',
    /** Dezente Trennung zur Clip-Mitte — Außenkante, keine „Nut“ durch Inset-Shadows. */
    boxShadow: '1px 0 0 rgba(0,0,0,0.07)',
  };

  const fromCustom = parseColorToHex(options.baseColorHex);
  if (fromCustom) {
    const edge = clipBorderAndHandleColorFromBase(fromCustom);
    const capSurface: CSSProperties = {
      ...capSurfaceBase,
      backgroundColor: edge,
    };
    return {
      clipBorderColor: edge,
      handleLeftClassName: `${LAYOUT_BASE} left-0`,
      handleRightClassName: `${LAYOUT_BASE} right-0`,
      leftStyle: {
        ...capSurface,
        borderTopLeftRadius: CLIP_INNER_CORNER_RADIUS,
        borderBottomLeftRadius: CLIP_INNER_CORNER_RADIUS,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      },
      rightStyle: {
        ...capSurface,
        boxShadow: '-1px 0 0 rgba(0,0,0,0.07)',
        borderTopRightRadius: CLIP_INNER_CORNER_RADIUS,
        borderBottomRightRadius: CLIP_INNER_CORNER_RADIUS,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      },
    };
  }

  const borderMatchClass = getTrimHandleBgClass(options.preset);

  if (borderMatchClass) {
    // Preset-Registry: Grifffläche = Randfarbe (Act-Muster).
    return {
      handleLeftClassName: `${LAYOUT_BASE} left-0 ${borderMatchClass}`,
      handleRightClassName: `${LAYOUT_BASE} right-0 ${borderMatchClass}`,
      leftStyle: {
        ...capSurfaceBase,
        borderTopLeftRadius: CLIP_INNER_CORNER_RADIUS,
        borderBottomLeftRadius: CLIP_INNER_CORNER_RADIUS,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      },
      rightStyle: {
        ...capSurfaceBase,
        boxShadow: '-1px 0 0 rgba(0,0,0,0.07)',
        borderTopRightRadius: CLIP_INNER_CORNER_RADIUS,
        borderBottomRightRadius: CLIP_INNER_CORNER_RADIUS,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      },
    };
  }

  const base = resolveTrimGrabBaseHex(options.baseColorHex, options.preset);
  const cap = trimEndCapBackgroundFromBase(base);

  const capSurface: CSSProperties = {
    ...capSurfaceBase,
    backgroundColor: cap,
  };

  return {
    handleLeftClassName: `${LAYOUT_BASE} left-0`,
    handleRightClassName: `${LAYOUT_BASE} right-0`,
    leftStyle: {
      ...capSurface,
      borderTopLeftRadius: CLIP_INNER_CORNER_RADIUS,
      borderBottomLeftRadius: CLIP_INNER_CORNER_RADIUS,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    rightStyle: {
      ...capSurface,
      boxShadow: '-1px 0 0 rgba(0,0,0,0.07)',
      borderTopRightRadius: CLIP_INNER_CORNER_RADIUS,
      borderBottomRightRadius: CLIP_INNER_CORNER_RADIUS,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
  };
}

/** Leaf-Komponenten: gleiche Logik wie getTrimGrabHandleStyles, memoized. */
export function useTrimGrabHandles(options: TrimGrabHandleOptions) {
  return useMemo(
    () => getTrimGrabHandleStyles(options),
    [options.baseColorHex, options.preset]
  );
}

export type { TrimGrabPreset };
