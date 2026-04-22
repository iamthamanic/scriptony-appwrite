/**
 * 🚀 SCRIPTONY PERFORMANCE DASHBOARD
 *
 * Development-only overlay for performance monitoring
 * Shows SLA violations and cache stats in real-time
 */

import { useState, useEffect } from "react";
import {
  perfMonitor,
  SLA_TARGETS,
  type SLACategory,
} from "../lib/performance-monitor";
import { cacheManager } from "../lib/cache-manager";
import { prefetchManager } from "../lib/prefetch-manager";
import { X, Activity, Database, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export function PerformanceDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [allCategoryStats, setAllCategoryStats] = useState<
    Record<string, ReturnType<typeof perfMonitor.getStats>>
  >({});
  const [cacheStats, setCacheStats] = useState(cacheManager.getStats());
  const [prefetchStats, setPrefetchStats] = useState(
    prefetchManager.getStats(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      // Get stats for all categories
      const categories = Object.keys(SLA_TARGETS) as SLACategory[];
      const statsMap: Record<
        string,
        ReturnType<typeof perfMonitor.getStats>
      > = {};

      for (const category of categories) {
        statsMap[category] = perfMonitor.getStats(category);
      }

      setAllCategoryStats(statsMap);
      setCacheStats(cacheManager.getStats());
      setPrefetchStats(prefetchManager.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Get overall stats
  const overallStats = perfMonitor.getStats();
  const violationRate = overallStats.violationRate * 100;
  const isHealthy = violationRate < 10; // < 10% violations = healthy

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between",
          isHealthy
            ? "bg-green-50 dark:bg-green-900/20"
            : "bg-red-50 dark:bg-red-900/20",
        )}
      >
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-[#6E59A5]" />
          <div>
            <h3 className="font-semibold">Performance Monitor</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {overallStats.total} measurements • {violationRate.toFixed(1)}%
              violations
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Cache Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database className="size-4" />
            Cache Stats
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-gray-600 dark:text-gray-400">Memory</div>
              <div className="font-semibold">
                {cacheStats.memoryEntries} entries
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-gray-600 dark:text-gray-400">
                LocalStorage
              </div>
              <div className="font-semibold">
                {cacheStats.localStorageEntries} entries
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded col-span-2">
              <div className="text-gray-600 dark:text-gray-400">Total Size</div>
              <div className="font-semibold">
                {(cacheStats.totalSize / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        </div>

        {/* Prefetch Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="size-4" />
            Prefetch Stats
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-gray-600 dark:text-gray-400">Prefetched</div>
              <div className="font-semibold">
                {prefetchStats.prefetchedKeys}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="text-gray-600 dark:text-gray-400">Queue</div>
              <div className="font-semibold">{prefetchStats.queueLength}</div>
            </div>
          </div>
        </div>

        {/* SLA Stats (only categories with measurements) */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">SLA Performance</div>
          <div className="space-y-1 text-xs">
            {Object.entries(allCategoryStats)
              .filter(([_, s]) => s.total > 0)
              .sort((a, b) => b[1].violationRate - a[1].violationRate)
              .slice(0, 10) // Top 10
              .map(([category, s]) => {
                const target = SLA_TARGETS[category as SLACategory];
                const isViolated = s.violationRate > 0.1; // > 10% violations

                return (
                  <div
                    key={category}
                    className={cn(
                      "p-2 rounded flex items-center justify-between",
                      isViolated
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        : "bg-gray-50 dark:bg-gray-800",
                    )}
                  >
                    <div>
                      <div className="font-mono">{category}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {s.total} calls • P95: {s.p95.toFixed(0)}ms / {target}ms
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        isViolated
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400",
                      )}
                    >
                      {(s.violationRate * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => perfMonitor.printReport()}
            className="flex-1 text-xs"
          >
            Print Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              perfMonitor.clear();
              cacheManager.clear();
              prefetchManager.clearHistory();
            }}
            className="flex-1 text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}
