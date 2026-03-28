/**
 * Session persistence via localStorage (swap for Appwrite later).
 * Location: src/modules/creative-gym/infrastructure/repositories/local-session-repository.ts
 */

import type { SessionRepository } from "../../domain/ports/session-repository";
import type { CreativeSession } from "../../domain/types";
import { readJson, storageKey, writeJson } from "../storage/local-json-storage";

export class LocalSessionRepository implements SessionRepository {
  constructor(private readonly userId: string) {}

  private key(): string {
    return storageKey(this.userId, "sessions");
  }

  private load(): CreativeSession[] {
    return readJson<CreativeSession[]>(this.key(), []);
  }

  private save(list: CreativeSession[]): void {
    writeJson(this.key(), list);
  }

  async create(session: CreativeSession): Promise<CreativeSession> {
    const list = this.load();
    list.push(session);
    this.save(list);
    return session;
  }

  async update(session: CreativeSession): Promise<CreativeSession> {
    const list = this.load();
    const i = list.findIndex((s) => s.id === session.id);
    if (i === -1) {
      list.push(session);
    } else {
      list[i] = session;
    }
    this.save(list);
    return session;
  }

  async getById(id: string): Promise<CreativeSession | null> {
    return this.load().find((s) => s.id === id) ?? null;
  }

  async listByUser(userId: string): Promise<CreativeSession[]> {
    if (userId !== this.userId) return [];
    return [...this.load()].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  async getLastActive(userId: string): Promise<CreativeSession | null> {
    const list = await this.listByUser(userId);
    const active = list.find((s) => s.status === "active" || s.status === "draft");
    if (active) return active;
    return list[0] ?? null;
  }
}
