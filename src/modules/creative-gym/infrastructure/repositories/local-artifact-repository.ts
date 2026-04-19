/**
 * Artifact persistence via localStorage.
 * Location: src/modules/creative-gym/infrastructure/repositories/local-artifact-repository.ts
 */

import type { ArtifactRepository } from "../../domain/ports/artifact-repository";
import type { CreativeArtifact } from "../../domain/types";
import { readJson, storageKey, writeJson } from "../storage/local-json-storage";

export class LocalArtifactRepository implements ArtifactRepository {
  constructor(private readonly userId: string) {}

  private key(): string {
    return storageKey(this.userId, "artifacts");
  }

  private load(): CreativeArtifact[] {
    return readJson<CreativeArtifact[]>(this.key(), []);
  }

  private save(list: CreativeArtifact[]): void {
    writeJson(this.key(), list);
  }

  async create(artifact: CreativeArtifact): Promise<CreativeArtifact> {
    const list = this.load();
    list.push(artifact);
    this.save(list);
    return artifact;
  }

  async update(artifact: CreativeArtifact): Promise<CreativeArtifact> {
    const list = this.load();
    const i = list.findIndex((a) => a.id === artifact.id);
    if (i === -1) list.push(artifact);
    else list[i] = artifact;
    this.save(list);
    return artifact;
  }

  async listByUser(userId: string): Promise<CreativeArtifact[]> {
    if (userId !== this.userId) return [];
    return [...this.load()].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getById(id: string): Promise<CreativeArtifact | null> {
    return this.load().find((a) => a.id === id) ?? null;
  }
}
