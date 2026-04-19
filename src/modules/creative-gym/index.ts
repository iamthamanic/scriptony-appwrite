/**
 * Creative Gym — public module surface (for optional extraction from Scriptony).
 * Location: src/modules/creative-gym/index.ts
 */

export { CreativeGymAppWithProvider } from "./presentation/CreativeGymApp";
export {
  CreativeGymProvider,
  useCreativeGym,
} from "./presentation/creative-gym-context";
export type {
  GymProgressOverview,
  GymUserDisplay,
} from "./presentation/creative-gym-context";
export type { CreativeGymDeps } from "./application/creative-gym-deps";
export {
  createCreativeGymDeps,
  resolveCreativeGymMode,
} from "./application/wiring";
export * from "./domain/types";
