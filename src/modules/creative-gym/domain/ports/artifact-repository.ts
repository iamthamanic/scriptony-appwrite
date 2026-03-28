/**
 * Port: saved outputs from sessions.
 * Location: src/modules/creative-gym/domain/ports/artifact-repository.ts
 */

import type { CreativeArtifact } from "../types";

export interface ArtifactRepository {
  create(artifact: CreativeArtifact): Promise<CreativeArtifact>;
  update(artifact: CreativeArtifact): Promise<CreativeArtifact>;
  listByUser(userId: string): Promise<CreativeArtifact[]>;
  getById(id: string): Promise<CreativeArtifact | null>;
}
