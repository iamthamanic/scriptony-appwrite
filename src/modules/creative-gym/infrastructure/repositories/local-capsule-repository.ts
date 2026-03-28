/**
 * Capsules stored in localStorage (standalone containers).
 * Location: src/modules/creative-gym/infrastructure/repositories/local-capsule-repository.ts
 */

import type { Capsule } from "../../domain/types";
import { readJson, storageKey, writeJson } from "../storage/local-json-storage";

export function loadCapsules(userId: string): Capsule[] {
  return readJson<Capsule[]>(storageKey(userId, "capsules"), []);
}

export function saveCapsules(userId: string, list: Capsule[]): void {
  writeJson(storageKey(userId, "capsules"), list);
}
