/**
 * Mode resolver: integrated by default; `localStorage['cg:v1:mode']` = standalone|integrated.
 * Location: src/modules/creative-gym/adapters/integrated/local-storage-mode-resolver.ts
 */

import type { ModeResolverPort } from "../../domain/ports/mode-resolver-port";
import type { CreativeGymMode } from "../../domain/types";

const KEY = "cg:v1:mode";

export class LocalStorageModeResolver implements ModeResolverPort {
  async getMode(): Promise<CreativeGymMode> {
    if (typeof window === "undefined") return "integrated";
    const v = window.localStorage.getItem(KEY);
    if (v === "standalone" || v === "integrated") return v;
    return "integrated";
  }

  static setMode(mode: CreativeGymMode): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, mode);
  }
}
