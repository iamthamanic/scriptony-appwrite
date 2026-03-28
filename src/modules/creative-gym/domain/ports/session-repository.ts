/**
 * Port: creative session persistence.
 * Location: src/modules/creative-gym/domain/ports/session-repository.ts
 */

import type { CreativeSession } from "../types";

export interface SessionRepository {
  create(session: CreativeSession): Promise<CreativeSession>;
  update(session: CreativeSession): Promise<CreativeSession>;
  getById(id: string): Promise<CreativeSession | null>;
  listByUser(userId: string): Promise<CreativeSession[]>;
  getLastActive(userId: string): Promise<CreativeSession | null>;
}
