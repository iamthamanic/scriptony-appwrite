/**
 * Port: integrated vs standalone mode.
 * Location: src/modules/creative-gym/domain/ports/mode-resolver-port.ts
 */

import type { CreativeGymMode } from "../types";

export interface ModeResolverPort {
  getMode(): Promise<CreativeGymMode>;
}
