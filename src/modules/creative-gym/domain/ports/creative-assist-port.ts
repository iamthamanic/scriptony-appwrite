/**
 * Port: optional AI assist (mutations / rescue); stub-friendly.
 * Location: src/modules/creative-gym/domain/ports/creative-assist-port.ts
 */

import type {
  ChallengeMutationResult,
  MutationInput,
  RescueInput,
  RescueOutput,
} from "../types";

export interface CreativeAssistPort {
  generateChallengeMutation(
    input: MutationInput,
  ): Promise<ChallengeMutationResult>;
  generateRescuePrompt(input: RescueInput): Promise<RescueOutput>;
}
