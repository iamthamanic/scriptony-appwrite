/**
 * Outer structure trim (first/last handle): only the adjacent pair of siblings
 * absorbs the length change — not proportional redistribution across all siblings.
 * Matches NLE-style “expand this segment / shrink neighbor” rather than scaling everyone.
 */

import { clampBoundaryToChildren } from './timeline-structure-trim-clamp';

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function outerTrimAdjustLastPair(
  durs: number[],
  newLastDur: number,
  budget: number,
  minD: number
): number[] {
  const n = durs.length;
  if (n === 0) return [];
  if (n === 1) {
    return [Math.max(minD, Math.min(budget, newLastDur))];
  }
  const sumPrefix = durs.slice(0, n - 2).reduce((s, x) => s + x, 0);
  const pairBudget = budget - sumPrefix;
  if (pairBudget < 2 * minD - 1e-6) {
    const last = Math.max(minD, Math.min(pairBudget - minD, newLastDur));
    const pen = Math.max(minD, pairBudget - last);
    return [...durs.slice(0, n - 2), pen, pairBudget - pen];
  }
  const last = Math.max(minD, Math.min(newLastDur, pairBudget - minD));
  const pen = Math.max(minD, pairBudget - last);
  return [...durs.slice(0, n - 2), pen, pairBudget - pen];
}

export function outerTrimAdjustFirstPair(
  durs: number[],
  newFirstDur: number,
  budget: number,
  minD: number
): number[] {
  const n = durs.length;
  if (n === 0) return [];
  if (n === 1) {
    return [Math.max(minD, Math.min(budget, newFirstDur))];
  }
  const sumSuffix = n > 2 ? durs.slice(2).reduce((s, x) => s + x, 0) : 0;
  const pairBudget = budget - sumSuffix;
  if (pairBudget < 2 * minD - 1e-6) {
    const first = Math.max(minD, Math.min(pairBudget - minD, newFirstDur));
    const second = Math.max(minD, pairBudget - first);
    return [first, second, ...durs.slice(2)];
  }
  const first = Math.max(minD, Math.min(newFirstDur, pairBudget - minD));
  const second = Math.max(minD, pairBudget - first);
  return [first, second, ...durs.slice(2)];
}

export function clampOuterLastDurationToChildHull(args: {
  desiredLastDur: number;
  pairStartSec: number;
  totalEndSec: number;
  minD: number;
  leftHullEndSec?: number | null;
  rightHullStartSec?: number | null;
}): number {
  const { desiredLastDur, pairStartSec, totalEndSec, minD, leftHullEndSec, rightHullStartSec } = args;
  const minBoundary = pairStartSec + minD;
  const maxBoundary = totalEndSec - minD;
  const desiredBoundary = totalEndSec - desiredLastDur;
  const clampedBoundary = clampBoundaryToChildren(
    desiredBoundary,
    minBoundary,
    maxBoundary,
    isFiniteNumber(leftHullEndSec) ? leftHullEndSec : minBoundary,
    isFiniteNumber(rightHullStartSec) ? rightHullStartSec : maxBoundary
  );
  return Math.max(minD, totalEndSec - clampedBoundary);
}

export function clampOuterFirstDurationToChildHull(args: {
  desiredFirstDur: number;
  totalStartSec: number;
  pairEndSec: number;
  minD: number;
  leftHullEndSec?: number | null;
  rightHullStartSec?: number | null;
}): number {
  const { desiredFirstDur, totalStartSec, pairEndSec, minD, leftHullEndSec, rightHullStartSec } = args;
  const minBoundary = totalStartSec + minD;
  const maxBoundary = pairEndSec - minD;
  const desiredBoundary = totalStartSec + desiredFirstDur;
  const clampedBoundary = clampBoundaryToChildren(
    desiredBoundary,
    minBoundary,
    maxBoundary,
    isFiniteNumber(leftHullEndSec) ? leftHullEndSec : minBoundary,
    isFiniteNumber(rightHullStartSec) ? rightHullStartSec : maxBoundary
  );
  return Math.max(minD, clampedBoundary - totalStartSec);
}
