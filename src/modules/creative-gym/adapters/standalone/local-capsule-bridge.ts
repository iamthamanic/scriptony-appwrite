/**
 * Standalone Capsule adapter (localStorage).
 * Location: src/modules/creative-gym/adapters/standalone/local-capsule-bridge.ts
 */

import type { CapsuleBridgePort } from "../../domain/ports/capsule-bridge-port";
import type {
  Capsule,
  CreateCapsuleInput,
  SaveArtifactToCapsuleInput,
} from "../../domain/types";
import {
  loadCapsules,
  saveCapsules,
} from "../../infrastructure/repositories/local-capsule-repository";

function uid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  return c?.randomUUID
    ? c.randomUUID()
    : `cap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class LocalCapsuleBridge implements CapsuleBridgePort {
  async listCapsules(userId: string): Promise<Capsule[]> {
    return [...loadCapsules(userId)].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async createCapsule(input: CreateCapsuleInput): Promise<Capsule> {
    const now = new Date().toISOString();
    const c: Capsule = {
      id: uid(),
      userId: input.userId,
      title: input.title,
      description: input.description,
      artifactIds: [],
      updatedAt: now,
    };
    const list = loadCapsules(input.userId);
    list.push(c);
    saveCapsules(input.userId, list);
    return c;
  }

  async saveArtifactToCapsule(input: SaveArtifactToCapsuleInput): Promise<void> {
    const list = loadCapsules(input.userId);
    const i = list.findIndex((c) => c.id === input.capsuleId);
    if (i === -1) return;
    const cap = { ...list[i] };
    if (!cap.artifactIds.includes(input.artifactId)) {
      cap.artifactIds = [...cap.artifactIds, input.artifactId];
    }
    cap.updatedAt = new Date().toISOString();
    list[i] = cap;
    saveCapsules(input.userId, list);
  }
}
