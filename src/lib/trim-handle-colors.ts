/**
 * Farblogik für Timeline-Trim-Griffe: Basishex abdunkeln für sichtbare „Grab Handles“.
 * Nutzung in VideoEditorTimeline und überall, wo dieselbe UX gewünscht ist.
 */

import type { TimelineTrackKind } from './timeline-track-tokens';

/** Gleiche Union wie Timeline-Track-Arten — eine Quelle: [timeline-track-tokens.ts](timeline-track-tokens.ts) */
export type TrimGrabPreset = TimelineTrackKind;

/** Mittlere Sättigung pro Track, wenn kein individuelles `baseColorHex` gesetzt ist. */
export const TRIM_GRAB_PRESET_BASE_HEX: Record<TrimGrabPreset, string> = {
  beat: '#a78bfa',
  act: '#60a5fa',
  sequence: '#34d399',
  scene: '#f472b6',
  shot: '#facc15',
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** #rgb, #rrggbb, #rrggbbaa */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  }
  if (s.length !== 6 && s.length !== 8) return null;
  const hex = s.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

/**
 * Hex oder CSS `rgb()` / `rgba()` → `#rrggbb` (für Beat-Farben aus API/Inline-Styles).
 */
export function parseColorToHex(input: string | null | undefined): string | null {
  const fromHex = normalizeHex(input);
  if (fromHex) return fromHex;
  if (!input || typeof input !== 'string') return null;
  const m = input
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)/i);
  if (!m) return null;
  return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (x: number) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** sRGB 0–1 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

/**
 * Endkappen-Farbe: leicht gegenüber der Clipfläche abgesetzt, gleiche Farbfamilie
 * (wirkt wie Teil des Clip-Körpers, nicht wie separater dunkler „Grab-Streifen“).
 */
export function trimEndCapBackgroundFromBase(hexInput: string): string {
  const rgb = hexToRgb(hexInput);
  if (!rgb) return '#7c3aed';
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let nextL = l * 0.88;
  if (l < 0.22) nextL = Math.max(0.12, l * 0.78);
  if (l > 0.78) nextL = l * 0.93;
  nextL = clamp(nextL, 0.12, 0.9);
  const nextS = clamp(s * 0.97, 0, 1);
  const out = hslToRgb(h, nextS, nextL);
  return rgbToHex(out.r, out.g, out.b);
}

/**
 * Griff-Farbe: spürbar dunkler als die Blockfläche, bei sehr dunklen Flächen trotzdem lesbar.
 */
export function grabHandleBackgroundFromBase(hexInput: string): string {
  const rgb = hexToRgb(hexInput);
  if (!rgb) return '#4c1d95';
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let nextL = l * 0.52;
  if (l < 0.22) nextL = Math.max(0.06, l * 0.72);
  nextL = clamp(nextL, 0.05, 0.55);
  const nextS = clamp(s * 1.08, 0, 1);
  const out = hslToRgb(h, nextS, nextL);
  return rgbToHex(out.r, out.g, out.b);
}

/**
 * Sichtbare Randfarbe + Trim-Griff-Farbe wie bei Act: eine „Kante“, etwas dunkler als die Fläche,
 * nicht so extrem wie {@link grabHandleBackgroundFromBase}.
 */
export function clipBorderAndHandleColorFromBase(hexInput: string): string {
  const rgb = hexToRgb(hexInput);
  if (!rgb) return '#6d28d9';
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let nextL = l * 0.72;
  if (l < 0.22) nextL = Math.max(0.08, l * 0.88);
  if (l > 0.82) nextL = l * 0.9;
  nextL = clamp(nextL, 0.08, 0.72);
  const nextS = clamp(s * 1.02, 0, 1);
  const out = hslToRgb(h, nextS, nextL);
  return rgbToHex(out.r, out.g, out.b);
}

export function resolveTrimGrabBaseHex(
  baseColorHex: string | null | undefined,
  preset: TrimGrabPreset
): string {
  return parseColorToHex(baseColorHex) ?? TRIM_GRAB_PRESET_BASE_HEX[preset];
}
