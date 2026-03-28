/**
 * React context: Creative Gym deps + mode (composition root per user).
 * Location: src/modules/creative-gym/presentation/creative-gym-context.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CreativeGymDeps } from "../application/creative-gym-deps";
import type { CreativeGymMode } from "../domain/types";
import * as UC from "../application/use-cases";
import {
  createCreativeGymDeps,
  LocalStorageModeResolver,
  resolveCreativeGymMode,
} from "../application/wiring";

export type GymUserDisplay = {
  name: string;
  email: string;
  avatar?: string;
};

export type GymProgressOverview = Awaited<ReturnType<typeof UC.getProgressOverviewUseCase>>;

const Ctx = createContext<{
  deps: CreativeGymDeps;
  mode: CreativeGymMode;
  setMode: (m: CreativeGymMode) => void;
  gymUser?: GymUserDisplay;
  progressOverview: GymProgressOverview | null;
} | null>(null);

export function CreativeGymProvider({
  userId,
  gymUser,
  children,
}: {
  userId: string;
  gymUser?: GymUserDisplay;
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<CreativeGymMode>("integrated");

  useEffect(() => {
    void resolveCreativeGymMode().then(setModeState);
  }, []);

  const setMode = useCallback((m: CreativeGymMode) => {
    LocalStorageModeResolver.setMode(m);
    setModeState(m);
  }, []);

  const deps = useMemo(() => createCreativeGymDeps(userId, mode), [userId, mode]);

  const [progressOverview, setProgressOverview] = useState<GymProgressOverview | null>(null);

  useEffect(() => {
    void UC.getProgressOverviewUseCase(deps).then(setProgressOverview);
  }, [deps]);

  const value = useMemo(
    () => ({
      deps,
      mode,
      setMode,
      gymUser,
      progressOverview,
    }),
    [deps, mode, setMode, gymUser, progressOverview]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCreativeGym() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreativeGym requires CreativeGymProvider");
  return v;
}
