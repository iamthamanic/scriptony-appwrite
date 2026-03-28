/**
 * SessionStorage bridge for setup flow (hash router has no query params).
 * Location: src/modules/creative-gym/presentation/setup-intent-storage.ts
 */

import type { CreativeIntent } from "../domain/types";

const KEY = "cg:setupIntent";

function ss(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function writeSetupIntent(intent: CreativeIntent): void {
  ss()?.setItem(KEY, intent);
}

export function readSetupIntent(): CreativeIntent | null {
  const v = ss()?.getItem(KEY);
  if (
    v === "unblock" ||
    v === "explore" ||
    v === "train" ||
    v === "project_extend"
  ) {
    return v;
  }
  return null;
}

export function clearSetupIntent(): void {
  ss()?.removeItem(KEY);
}

const CH_KEY = "cg:challengeId";

export function writeSetupChallengeId(id: string): void {
  ss()?.setItem(CH_KEY, id);
}

export function readSetupChallengeId(): string | null {
  return ss()?.getItem(CH_KEY) ?? null;
}

export function clearSetupChallengeId(): void {
  ss()?.removeItem(CH_KEY);
}
