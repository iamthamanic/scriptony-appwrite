/**
 * 🚀 LAZY LOAD SHOTS HOOK
 *
 * Only loads shots when a scene is expanded
 * Dramatically improves initial load time by avoiding loading ALL shots upfront
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import * as ShotsAPI from "../lib/api/shots-api";
import type { Shot } from "../lib/types";
import { SmartCache } from "../lib/dropdown-optimization-helpers";

// Global cache for shots across all components
const shotsCache = new SmartCache<Shot[]>(60000, 100);

interface UseLazyLoadShotsOptions {
  sceneId: string;
  isExpanded: boolean;
  projectId: string;
  enabled?: boolean;
}

export function useLazyLoadShots({
  sceneId,
  isExpanded,
  projectId,
  enabled = true,
}: UseLazyLoadShotsOptions) {
  const { getAccessToken } = useAuth();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadShots = useCallback(async () => {
    if (!enabled || !isExpanded || loadedRef.current) {
      return;
    }

    // Check cache first
    const cacheKey = `shots:${sceneId}`;
    const cached = shotsCache.get(cacheKey);
    if (cached) {
      console.log(
        `[useLazyLoadShots] 💾 Using cached shots for scene ${sceneId}`,
      );
      setShots(cached);
      loadedRef.current = true;
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const token = await getAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      console.log(
        `[useLazyLoadShots] 🔄 Loading shots for scene ${sceneId}...`,
      );
      const loadedShots = await ShotsAPI.getShots(sceneId, token);

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setShots(loadedShots || []);
      loadedRef.current = true;

      // Cache the result
      shotsCache.set(cacheKey, loadedShots || []);
      console.log(
        `[useLazyLoadShots] ✅ Loaded ${loadedShots?.length || 0} shots for scene ${sceneId}`,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log(
          `[useLazyLoadShots] ⏹️ Request aborted for scene ${sceneId}`,
        );
        return;
      }

      console.error(
        `[useLazyLoadShots] ❌ Error loading shots for scene ${sceneId}:`,
        err,
      );
      setError(err instanceof Error ? err : new Error("Failed to load shots"));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [sceneId, isExpanded, enabled, getAccessToken]);

  useEffect(() => {
    if (isExpanded) {
      loadShots();
    }

    return () => {
      // Cleanup: abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isExpanded, loadShots]);

  const invalidate = useCallback(() => {
    loadedRef.current = false;
    shotsCache.set(`shots:${sceneId}`, []);
    setShots([]);
  }, [sceneId]);

  const addShot = useCallback(
    (shot: Shot) => {
      setShots((prev) => [...prev, shot]);
      shotsCache.set(`shots:${sceneId}`, [...shots, shot]);
    },
    [sceneId, shots],
  );

  const updateShot = useCallback((shotId: string, updates: Partial<Shot>) => {
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, ...updates } : s)),
    );
  }, []);

  const deleteShot = useCallback((shotId: string) => {
    setShots((prev) => prev.filter((s) => s.id !== shotId));
  }, []);

  return {
    shots,
    loading,
    error,
    loaded: loadedRef.current,
    invalidate,
    addShot,
    updateShot,
    deleteShot,
    reload: loadShots,
  };
}
