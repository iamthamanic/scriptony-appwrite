/**
 * 🚀 SCRIPTONY PERFORMANCE MONITOR
 *
 * Service Level Agreements (SLAs) für Performance-Überwachung
 *
 * Automatische Warnung wenn Code zu langsam ist!
 */

// =============================================================================
// SLA DEFINITIONS
// =============================================================================

export const SLA_TARGETS = {
  // Cache Operations (localStorage/memory)
  CACHE_READ: 50, // < 50ms - Cache lesen muss instant sein
  CACHE_WRITE: 100, // < 100ms - Cache schreiben

  // API Calls
  API_FAST: 300, // < 300ms - Schnelle APIs (get single item)
  API_STANDARD: 800, // < 800ms - Standard APIs (list items)
  API_BULK: 2000, // < 2s - Bulk operations

  // UI Rendering
  INITIAL_RENDER: 1000, // < 1s - Erste Seite muss schnell sein
  TAB_SWITCH: 200, // < 200ms - Tab-Wechsel instant
  DROPDOWN_OPEN: 150, // < 150ms - Dropdown öffnen
  USER_INTERACTION: 100, // < 100ms - Button clicks, etc.

  // Data Loading
  TIMELINE_LOAD: 1500, // < 1.5s - Timeline komplett laden (dynamisch basierend auf Größe)
  CHARACTERS_LOAD: 500, // < 500ms - Characters laden
  BEATS_LOAD: 500, // < 500ms - Beats laden

  // Prefetch (background)
  PREFETCH: 5000, // < 5s - Prefetch darf länger dauern
} as const;

export type SLACategory = keyof typeof SLA_TARGETS;

// =============================================================================
// PERFORMANCE TRACKING
// =============================================================================

interface PerformanceMeasurement {
  category: SLACategory;
  operation: string;
  duration: number;
  timestamp: number;
  violated: boolean;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private measurements: PerformanceMeasurement[] = [];
  private maxMeasurements = 1000; // Keep last 1000 measurements
  private timers: Map<string, number> = new Map();
  private warningsEnabled = true;

  /**
   * Start measuring an operation
   */
  start(id: string): void {
    this.timers.set(id, performance.now());
  }

  /**
   * End measuring and check against SLA
   */
  end(
    id: string,
    category: SLACategory,
    operation: string,
    metadata?: Record<string, any>,
  ): number {
    const startTime = this.timers.get(id);
    if (!startTime) {
      console.warn(`[PERF] No start time found for: ${id}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(id);

    const target = SLA_TARGETS[category];
    const violated = duration > target;

    const measurement: PerformanceMeasurement = {
      category,
      operation,
      duration,
      timestamp: Date.now(),
      violated,
      metadata,
    };

    this.measurements.push(measurement);

    // Keep only last N measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // Log result
    if (violated && this.warningsEnabled) {
      console.warn(
        `⚠️ [PERF SLA VIOLATION] ${operation}\n` +
          `   Category: ${category}\n` +
          `   Duration: ${duration.toFixed(2)}ms\n` +
          `   Target: ${target}ms\n` +
          `   Exceeded by: ${(duration - target).toFixed(2)}ms (${((duration / target - 1) * 100).toFixed(1)}%)\n` +
          `   ${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ""}`,
      );
    } else {
      console.log(
        `✅ [PERF] ${operation}: ${duration.toFixed(2)}ms / ${target}ms ${category !== "PREFETCH" ? "✨" : "🔄"}`,
      );
    }

    return duration;
  }

  /**
   * Measure a Promise-based operation
   */
  async measure<T>(
    id: string,
    category: SLACategory,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    this.start(id);
    try {
      const result = await fn();
      this.end(id, category, operation, metadata);
      return result;
    } catch (error) {
      this.end(id, category, `${operation} (ERROR)`, {
        ...metadata,
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    id: string,
    category: SLACategory,
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>,
  ): T {
    this.start(id);
    try {
      const result = fn();
      this.end(id, category, operation, metadata);
      return result;
    } catch (error) {
      this.end(id, category, `${operation} (ERROR)`, {
        ...metadata,
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Get statistics for a category
   */
  getStats(category?: SLACategory): {
    total: number;
    violations: number;
    violationRate: number;
    avgDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const filtered = category
      ? this.measurements.filter((m) => m.category === category)
      : this.measurements;

    if (filtered.length === 0) {
      return {
        total: 0,
        violations: 0,
        violationRate: 0,
        avgDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const violations = filtered.filter((m) => m.violated).length;
    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      total: filtered.length,
      violations,
      violationRate: violations / filtered.length,
      avgDuration: sum / filtered.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Get all measurements (for debugging)
   */
  getMeasurements(category?: SLACategory): PerformanceMeasurement[] {
    return category
      ? this.measurements.filter((m) => m.category === category)
      : [...this.measurements];
  }

  /**
   * Print performance report to console
   */
  printReport(): void {
    console.group("📊 SCRIPTONY PERFORMANCE REPORT");

    const categories = Object.keys(SLA_TARGETS) as SLACategory[];
    const report: Array<{
      category: string;
      stats: ReturnType<PerformanceMonitor["getStats"]>;
    }> = [];

    for (const category of categories) {
      const stats = this.getStats(category);
      if (stats.total > 0) {
        report.push({ category, stats });
      }
    }

    // Sort by violation rate (worst first)
    report.sort((a, b) => b.stats.violationRate - a.stats.violationRate);

    console.table(
      report.map(({ category, stats }) => ({
        Category: category,
        Measurements: stats.total,
        Violations: stats.violations,
        "Violation Rate": `${(stats.violationRate * 100).toFixed(1)}%`,
        "Avg Duration": `${stats.avgDuration.toFixed(2)}ms`,
        P50: `${stats.p50.toFixed(2)}ms`,
        P95: `${stats.p95.toFixed(2)}ms`,
        P99: `${stats.p99.toFixed(2)}ms`,
        Target: `${SLA_TARGETS[category as SLACategory]}ms`,
      })),
    );

    // Overall stats
    const overall = this.getStats();
    console.log("\n📈 Overall Statistics:");
    console.log(`   Total Measurements: ${overall.total}`);
    console.log(`   Total Violations: ${overall.violations}`);
    console.log(
      `   Overall Violation Rate: ${(overall.violationRate * 100).toFixed(1)}%`,
    );
    console.log(`   Average Duration: ${overall.avgDuration.toFixed(2)}ms`);

    console.groupEnd();
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements = [];
    this.timers.clear();
  }

  /**
   * Enable/disable warnings
   */
  setWarningsEnabled(enabled: boolean): void {
    this.warningsEnabled = enabled;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const perfMonitor = new PerformanceMonitor();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).scriptonyPerf = {
    monitor: perfMonitor,
    printReport: () => perfMonitor.printReport(),
    getStats: (category?: SLACategory) => perfMonitor.getStats(category),
    clear: () => perfMonitor.clear(),
    SLA_TARGETS,
  };

  console.log(
    "%c🚀 SCRIPTONY PERFORMANCE MONITORING ACTIVE",
    "color: #6E59A5; font-weight: bold; font-size: 14px;",
  );
  console.log(
    "%cUse window.scriptonyPerf.printReport() to see performance stats",
    "color: #888;",
  );
}
