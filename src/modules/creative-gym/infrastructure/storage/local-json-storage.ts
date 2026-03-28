/**
 * Browser localStorage JSON helpers for Creative Gym (namespaced).
 * Location: src/modules/creative-gym/infrastructure/storage/local-json-storage.ts
 */

const PREFIX = "cg:v1:";

export function storageKey(userId: string, name: string): string {
  return `${PREFIX}${userId}:${name}`;
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}
