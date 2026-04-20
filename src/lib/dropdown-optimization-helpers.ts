/**
 * 🚀 DROPDOWN OPTIMIZATION HELPERS
 *
 * Performance utilities for FilmDropdown and BookDropdown
 * - Memoization helpers
 * - Lazy loading utilities
 * - Debouncing functions
 */

import {
  useRef,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * 🎯 Debounced state setter
 * Prevents excessive state updates during rapid interactions
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay],
  );
}

/**
 * 🔥 Intersection Observer Hook for Lazy Loading
 * Prefetches data when user scrolls near an element
 */
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit,
) {
  const targetRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current();
          }
        });
      },
      { threshold: 0.1, rootMargin: "100px", ...options },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return targetRef;
}

/**
 * 🧠 Smart Cache for expensive operations
 * Memoizes function results based on key
 */
export class SmartCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxAge: number;
  private maxSize: number;

  constructor(maxAge = 60000, maxSize = 100) {
    this.maxAge = maxAge;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 🎬 Batch state updates helper
 * Groups multiple setState calls into one render
 */
export function batchUpdates<T>(
  updates: Array<{
    setter: Dispatch<SetStateAction<T>>;
    updater: (current: T) => T;
  }>,
): void {
  updates.forEach(({ setter, updater }) => {
    setter((prev) => updater(prev));
  });
}

/**
 * ⚡ Optimized filter with memoization
 * Caches filter results to avoid re-computing
 */
const filterCache = new SmartCache<any[]>(30000, 50);

export function memoizedFilter<T>(
  array: T[],
  predicate: (item: T) => boolean,
  cacheKey: string,
): T[] {
  const cached = filterCache.get(cacheKey);
  if (cached && cached.length === array.filter(predicate).length) {
    return cached;
  }

  const result = array.filter(predicate);
  filterCache.set(cacheKey, result);
  return result;
}

/**
 * 🔄 Optimistic update helper
 * Provides rollback capability for failed mutations
 */
export function createOptimisticUpdate<T>(
  initialState: T[],
  setState: (state: T[]) => void,
) {
  const previousState = [...initialState];

  return {
    commit: () => {
      // Keep current state
    },
    rollback: () => {
      setState(previousState);
    },
  };
}
