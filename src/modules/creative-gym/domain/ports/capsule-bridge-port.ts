/**
 * Port: standalone Capsule containers.
 * Location: src/modules/creative-gym/domain/ports/capsule-bridge-port.ts
 */

import type {
  Capsule,
  CreateCapsuleInput,
  SaveArtifactToCapsuleInput,
} from "../types";

export interface CapsuleBridgePort {
  listCapsules(userId: string): Promise<Capsule[]>;
  createCapsule(input: CreateCapsuleInput): Promise<Capsule>;
  saveArtifactToCapsule(input: SaveArtifactToCapsuleInput): Promise<void>;
}
