/**
 * Distribute items across three buckets (acts). Stable and dependency-free.
 */

export function splitIntoThirds<T>(items: T[]): [T[], T[], T[]] {
  const n = items.length;
  if (n === 0) return [[], [], []];
  const aLen = Math.max(1, Math.ceil(n / 3));
  const restAfterA = n - aLen;
  const bLen = restAfterA <= 0 ? 0 : Math.max(1, Math.ceil(restAfterA / 2));
  const first = items.slice(0, aLen);
  const second = items.slice(aLen, aLen + bLen);
  const third = items.slice(aLen + bLen);
  return [first, second, third];
}
