/**
 * 🚀 TIMELINE CACHE HOOK
 *
 * Provides caching and prefetching for timeline data
 */

import { useCallback, useEffect, useRef } from "react";
import { cacheManager } from "../lib/cache-manager";
import { prefetchManager } from "../lib/prefetch-manager";
import { perfMonitor } from "../lib/performance-monitor";
import { useAuth } from "./useAuth";
import * as TimelineAPI from "../lib/api/timeline-api";
import * as ShotsAPI from "../lib/api/shots-api";
import * as CharactersAPI from "../lib/api/characters-api";
import * as BeatsAPI from "../lib/api/beats-api";

export interface TimelineData {
  acts: any[];
  sequences: any[];
  scenes: any[];
  shots: any[];
}

export interface CharactersData {
  characters: any[];
}

export interface BeatsData {
  beats: any[];
}

/**
 * Hook for timeline data caching and prefetching
 */
export function useTimelineCache(projectId: string) {
  const { getAccessToken } = useAuth();
  const prefetchedRef = useRef<Set<string>>(new Set());

  /**
   * Load timeline data with caching
   */
  const loadTimeline = useCallback(async (): Promise<TimelineData> => {
    const cacheKey = `timeline:${projectId}`;

    return await cacheManager.getWithRevalidate(
      cacheKey,
      async () => {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const acts = await TimelineAPI.getActs(projectId, token);

        // Load all in parallel
        const [sequences, scenes, shots] = await Promise.all([
          TimelineAPI.getAllSequencesByProject(projectId, token).catch(
            () => [],
          ),
          TimelineAPI.getAllScenesByProject(projectId, token).catch(() => []),
          ShotsAPI.getAllShotsByProject(projectId, token).catch(() => []),
        ]);

        return {
          acts: acts || [],
          sequences: sequences || [],
          scenes: scenes || [],
          shots: shots || [],
        };
      },
      {
        ttl: 5 * 60 * 1000,
        staleTime: 30 * 1000,
        slaCategory: "TIMELINE_LOAD",
      },
    );
  }, [projectId, getAccessToken]);

  /**
   * Load characters with caching
   */
  const loadCharacters = useCallback(async (): Promise<CharactersData> => {
    const cacheKey = `characters:${projectId}`;

    return await cacheManager.getWithRevalidate(
      cacheKey,
      async () => {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const characters = await CharactersAPI.getCharacters(projectId, token);
        return { characters: characters || [] };
      },
      {
        ttl: 5 * 60 * 1000,
        staleTime: 30 * 1000,
        slaCategory: "CHARACTERS_LOAD",
      },
    );
  }, [projectId, getAccessToken]);

  /**
   * Load beats with caching
   */
  const loadBeats = useCallback(async (): Promise<BeatsData> => {
    const cacheKey = `beats:${projectId}`;

    return await cacheManager.getWithRevalidate(
      cacheKey,
      async () => {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const beats = await BeatsAPI.getBeats(projectId);
        return { beats: beats || [] };
      },
      {
        ttl: 5 * 60 * 1000,
        staleTime: 30 * 1000,
        slaCategory: "BEATS_LOAD",
      },
    );
  }, [projectId, getAccessToken]);

  /**
   * Prefetch timeline data on hover
   */
  const prefetchTimeline = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => {};

      const key = `timeline:${projectId}`;
      if (prefetchedRef.current.has(key)) {
        return () => {};
      }

      prefetchedRef.current.add(key);
      return prefetchManager.setupHoverPrefetch(
        element,
        key,
        async () => {
          const token = await getAccessToken();
          if (!token) throw new Error("Not authenticated");

          const acts = await TimelineAPI.getActs(projectId, token);

          const [sequences, scenes, shots] = await Promise.all([
            TimelineAPI.getAllSequencesByProject(projectId, token).catch(
              () => [],
            ),
            TimelineAPI.getAllScenesByProject(projectId, token).catch(() => []),
            ShotsAPI.getAllShotsByProject(projectId, token).catch(() => []),
          ]);

          return {
            acts: acts || [],
            sequences: sequences || [],
            scenes: scenes || [],
            shots: shots || [],
          };
        },
        {
          delay: 100,
          priority: "high",
        },
      );
    },
    [projectId, getAccessToken],
  );

  /**
   * Prefetch characters on hover
   */
  const prefetchCharacters = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => {};

      const key = `characters:${projectId}`;
      if (prefetchedRef.current.has(key)) {
        return () => {};
      }

      prefetchedRef.current.add(key);
      return prefetchManager.setupHoverPrefetch(
        element,
        key,
        async () => {
          const token = await getAccessToken();
          if (!token) throw new Error("Not authenticated");

          const characters = await CharactersAPI.getCharacters(
            projectId,
            token,
          );
          return { characters: characters || [] };
        },
        {
          delay: 100,
          priority: "high",
        },
      );
    },
    [projectId, getAccessToken],
  );

  /**
   * Prefetch beats on hover
   */
  const prefetchBeats = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => {};

      const key = `beats:${projectId}`;
      if (prefetchedRef.current.has(key)) {
        return () => {};
      }

      prefetchedRef.current.add(key);
      return prefetchManager.setupHoverPrefetch(
        element,
        key,
        async () => {
          const token = await getAccessToken();
          if (!token) throw new Error("Not authenticated");

          const beats = await BeatsAPI.getBeats(projectId);
          return { beats: beats || [] };
        },
        {
          delay: 100,
          priority: "high",
        },
      );
    },
    [projectId, getAccessToken],
  );

  /**
   * Invalidate cache when data changes
   */
  const invalidateTimeline = useCallback(() => {
    cacheManager.invalidate(`timeline:${projectId}`);
    prefetchedRef.current.delete(`timeline:${projectId}`);
  }, [projectId]);

  const invalidateCharacters = useCallback(() => {
    cacheManager.invalidate(`characters:${projectId}`);
    prefetchedRef.current.delete(`characters:${projectId}`);
  }, [projectId]);

  const invalidateBeats = useCallback(() => {
    cacheManager.invalidate(`beats:${projectId}`);
    prefetchedRef.current.delete(`beats:${projectId}`);
  }, [projectId]);

  const invalidateAll = useCallback(() => {
    cacheManager.invalidatePrefix(projectId);
    prefetchedRef.current.clear();
  }, [projectId]);

  return {
    // Loading functions
    loadTimeline,
    loadCharacters,
    loadBeats,

    // Prefetch functions (for hover)
    prefetchTimeline,
    prefetchCharacters,
    prefetchBeats,

    // Invalidation functions (call after updates)
    invalidateTimeline,
    invalidateCharacters,
    invalidateBeats,
    invalidateAll,
  };
}
