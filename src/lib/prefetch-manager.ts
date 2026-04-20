/**
 * 🚀 SCRIPTONY PREFETCH MANAGER
 *
 * Hover-based prefetching like McMaster-Carr
 * Predictive prefetching based on user behavior
 */

import { cacheManager } from "./cache-manager";
import { perfMonitor } from "./performance-monitor";

// =============================================================================
// TYPES
// =============================================================================

interface PrefetchConfig {
  delay?: number; // Delay before prefetch starts (ms)
  priority?: "high" | "low";
  cache?: {
    ttl?: number;
    staleTime?: number;
  };
}

const DEFAULT_CONFIG: Required<PrefetchConfig> = {
  delay: 100, // 100ms hover delay
  priority: "low",
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleTime: 30 * 1000, // 30 seconds
  },
};

// =============================================================================
// PREFETCH MANAGER
// =============================================================================

class PrefetchManager {
  private hoverTimers = new Map<string, number>();
  private prefetchedKeys = new Set<string>();
  private prefetchQueue: Array<{
    key: string;
    fetcher: () => Promise<any>;
    priority: "high" | "low";
  }> = [];
  private isProcessingQueue = false;

  /**
   * Setup hover-based prefetch for an element
   * Returns cleanup function
   */
  setupHoverPrefetch(
    element: HTMLElement | null,
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig = {},
  ): () => void {
    if (!element) return () => {};

    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    const handleMouseEnter = () => {
      // Clear any existing timer
      const existingTimer = this.hoverTimers.get(key);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      // Start new timer
      const timer = window.setTimeout(() => {
        this.prefetch(key, fetcher, fullConfig);
      }, fullConfig.delay);

      this.hoverTimers.set(key, timer);
    };

    const handleMouseLeave = () => {
      const timer = this.hoverTimers.get(key);
      if (timer) {
        window.clearTimeout(timer);
        this.hoverTimers.delete(key);
      }
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup function
    return () => {
      handleMouseLeave();
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }

  /**
   * Prefetch data with caching
   */
  async prefetch(
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig = {},
  ): Promise<void> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Skip if already prefetched recently
    if (this.prefetchedKeys.has(key)) {
      console.log(`[Prefetch] Skipped (already prefetched): ${key}`);
      return;
    }

    // Check if already cached
    const cached = cacheManager.get(key, fullConfig.cache);
    if (cached.data && !cached.isStale) {
      console.log(`[Prefetch] Skipped (already cached): ${key}`);
      return;
    }

    // Add to queue
    this.prefetchQueue.push({ key, fetcher, priority: fullConfig.priority });
    this.prefetchedKeys.add(key);

    // Process queue
    this.processQueue();
  }

  /**
   * Process prefetch queue (low priority, non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.prefetchQueue.length > 0) {
      // Sort by priority (high first)
      this.prefetchQueue.sort((a, b) => {
        if (a.priority === "high" && b.priority === "low") return -1;
        if (a.priority === "low" && b.priority === "high") return 1;
        return 0;
      });

      const item = this.prefetchQueue.shift();
      if (!item) break;

      try {
        await cacheManager.prefetch(item.key, item.fetcher);
        console.log(`[Prefetch] ✅ Completed: ${item.key}`);
      } catch (error) {
        console.warn(`[Prefetch] ❌ Failed: ${item.key}`, error);
      }

      // Yield to main thread between prefetches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear prefetch history (allow re-prefetching)
   */
  clearHistory(): void {
    this.prefetchedKeys.clear();
    console.log("[Prefetch] Cleared prefetch history");
  }

  /**
   * Cancel all pending prefetches
   */
  cancelAll(): void {
    // Clear hover timers
    this.hoverTimers.forEach((timer) => window.clearTimeout(timer));
    this.hoverTimers.clear();

    // Clear queue
    this.prefetchQueue = [];
    this.isProcessingQueue = false;

    console.log("[Prefetch] Cancelled all pending prefetches");
  }

  /**
   * Get stats
   */
  getStats(): {
    prefetchedKeys: number;
    queueLength: number;
    isProcessing: boolean;
  } {
    return {
      prefetchedKeys: this.prefetchedKeys.size,
      queueLength: this.prefetchQueue.length,
      isProcessing: this.isProcessingQueue,
    };
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

export function usePrefetch() {
  return {
    setupHoverPrefetch: (
      element: HTMLElement | null,
      key: string,
      fetcher: () => Promise<any>,
      config?: PrefetchConfig,
    ) => prefetchManager.setupHoverPrefetch(element, key, fetcher, config),

    prefetch: (
      key: string,
      fetcher: () => Promise<any>,
      config?: PrefetchConfig,
    ) => prefetchManager.prefetch(key, fetcher, config),
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const prefetchManager = new PrefetchManager();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).scriptonyPrefetch = {
    manager: prefetchManager,
    stats: () => prefetchManager.getStats(),
    clearHistory: () => prefetchManager.clearHistory(),
    cancelAll: () => prefetchManager.cancelAll(),
  };

  console.log(
    "%c🔮 SCRIPTONY PREFETCH MANAGER ACTIVE",
    "color: #6E59A5; font-weight: bold; font-size: 14px;",
  );
  console.log(
    "%cUse window.scriptonyPrefetch.stats() to see prefetch stats",
    "color: #888;",
  );
}
