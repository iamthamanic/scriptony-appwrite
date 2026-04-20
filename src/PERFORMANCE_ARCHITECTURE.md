# 🏗️ Scriptony Performance Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (React Components: FilmDropdown, BookDropdown, etc.)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE LAYER                             │
│                                                                   │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Prefetch     │  │  Cache Manager  │  │  Perf Monitor    │ │
│  │   Manager      │  │                 │  │                  │ │
│  │                │  │  ┌───────────┐  │  │  ┌────────────┐ │ │
│  │  • Hover       │  │  │  Memory   │  │  │  │ SLA Checks │ │ │
│  │  • Queue       │  │  │  Cache    │  │  │  │            │ │ │
│  │  • Priority    │  │  └───────────┘  │  │  └────────────┘ │ │
│  │                │  │                 │  │                  │ │
│  │                │  │  ┌───────────┐  │  │  ┌────────────┐ │ │
│  │                │  │  │localStorage│  │  │  │ Metrics DB │ │ │
│  │                │  │  └───────────┘  │  │  └────────────┘ │ │
│  └────────────────┘  └─────────────────┘  └──────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  (Supabase Edge Functions: timeline-v2, shots, beats, etc.)    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Timeline Load (First Time)

```
1. USER HOVERS TAB
   ↓
2. Prefetch Manager detects hover (100ms delay)
   ↓
3. Check Cache
   │
   ├─ CACHE MISS → Continue to API
   │
   └─ CACHE HIT → ✅ Done (5ms)
   ↓
4. API Request starts (background)
   │
   ├─ Performance Monitor: START TIMER
   │
   ↓
5. Supabase API responds (400-800ms)
   │
   ├─ Performance Monitor: END TIMER, CHECK SLA
   │  └─ < 1000ms? ✅ Log success
   │  └─ > 1000ms? ⚠️ Log violation
   │
   ↓
6. Cache Manager: SAVE
   │
   ├─ Memory Cache (instant future access)
   │
   └─ localStorage (persistent across reloads)
   ↓
7. USER CLICKS TAB
   │
   └─ Cache Hit! → ✅ Instant render (5ms)
```

## Data Flow: Timeline Load (Cached, Fresh)

```
USER CLICKS
   ↓
Cache Manager: GET
   ↓
Memory Cache: HIT (5ms)
   ↓
Is Fresh? (< 30s old)
   ↓ YES
   ↓
✅ RETURN DATA
   ↓
Component renders INSTANTLY
   ↓
Performance Monitor: 5ms ✅ (< 150ms SLA)
```

## Data Flow: Timeline Load (Cached, Stale)

```
USER CLICKS
   ↓
Cache Manager: GET
   ↓
Memory Cache: HIT (5ms)
   ↓
Is Fresh? (< 30s old)
   ↓ NO (stale but valid)
   ↓
🔄 RETURN STALE DATA (instant UX!)
   ↓
Component renders with stale data
   ↓
BACKGROUND: Revalidate
   │
   ├─ API Request (400-800ms)
   ├─ Cache Update
   └─ Component re-renders with fresh data
```

## Cache Hierarchy

```
┌────────────────────────────────────────────────────────┐
│ Layer 1: React State (Component Memory)               │
│ ├─ Access Time: 0ms                                    │
│ ├─ Lifetime: Component Mount                           │
│ └─ Use: Current View State                             │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ Layer 2: Memory Cache (JavaScript Map)                │
│ ├─ Access Time: < 1ms                                  │
│ ├─ Lifetime: Page Session                              │
│ └─ Use: Instant repeated access                        │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ Layer 3: localStorage (Browser Storage)               │
│ ├─ Access Time: 5-50ms                                 │
│ ├─ Lifetime: Persistent (survives reload)              │
│ └─ Use: Offline capability, fast initial load          │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ Layer 4: API (Supabase)                               │
│ ├─ Access Time: 200-1000ms                             │
│ ├─ Lifetime: Forever (Source of Truth)                 │
│ └─ Use: Fresh data, fallback                           │
└────────────────────────────────────────────────────────┘
```

## Prefetch Strategy

```
PHASE 1: USER BEHAVIOR DETECTION
┌──────────────────────────────────────┐
│ User hovers over tab/button/link    │
└────────────────┬─────────────────────┘
                 │
                 ▼ (100ms delay)
PHASE 2: PRIORITY QUEUE
┌──────────────────────────────────────┐
│ Add to prefetch queue                │
│ ├─ High Priority: User interactions  │
│ └─ Low Priority: Speculative         │
└────────────────┬─────────────────────┘
                 │
                 ▼
PHASE 3: BACKGROUND LOADING
┌──────────────────────────────────────┐
│ Process queue (non-blocking)         │
│ ├─ Check cache first (skip if hit)   │
│ ├─ Load from API                      │
│ ├─ Save to cache                      │
│ └─ Yield to main thread               │
└────────────────┬─────────────────────┘
                 │
                 ▼
PHASE 4: USER ACTION
┌──────────────────────────────────────┐
│ User clicks                           │
│ └─ Cache Hit! ✅ Instant render       │
└──────────────────────────────────────┘
```

## Performance Monitoring Flow

```
CODE EXECUTION
   ↓
perfMonitor.measure(id, category, operation, fn)
   ↓
┌─────────────────────────────────────────┐
│ 1. Start High-Resolution Timer          │
│    (performance.now())                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. Execute Function                      │
│    (async or sync)                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. Stop Timer                            │
│    Calculate Duration                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 4. Check SLA                             │
│    Duration vs Target                    │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
  PASS (< SLA)      FAIL (> SLA)
        │                 │
        ▼                 ▼
  ✅ Log Success    ⚠️ Log Violation
        │                 │
        └────────┬────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 5. Store Measurement                     │
│    ├─ Duration                           │
│    ├─ Category                           │
│    ├─ Timestamp                          │
│    └─ Metadata                           │
└─────────────────────────────────────────┘
```

## Cache Invalidation Strategies

### Strategy 1: Immediate Invalidation (Current)

```
USER UPDATES DATA
   ↓
Optimistic UI Update
   ↓
API Request
   ↓
Success
   ↓
cacheManager.invalidate(key)
   ↓
Next load will hit API (fresh data)
```

### Strategy 2: Smart Invalidation (Future)

```
USER UPDATES DATA
   ↓
Optimistic UI Update
   ↓
Update Cache with new data (instant!)
   ↓
API Request (background)
   ↓
Success → Cache already fresh ✅
Failure → Rollback cache to old data
```

### Strategy 3: Prefix Invalidation

```
DELETE PROJECT
   ↓
cacheManager.invalidatePrefix('project-123')
   ↓
Clears ALL:
├─ timeline:project-123
├─ characters:project-123
├─ beats:project-123
└─ inspirations:project-123
```

## SLA Enforcement Pipeline

```
┌──────────────────────────────────────────────────────────┐
│ Every Operation is Measured                              │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│ Compare Duration vs SLA Target                           │
└─────────────────────┬────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
        WITHIN SLA       VIOLATED SLA
              │               │
              ▼               ▼
      ✅ Log Success   ⚠️ Console Warning
              │               │
              │               ▼
              │     ┌─────────────────────┐
              │     │ Include in Report:  │
              │     │ - Operation name    │
              │     │ - Duration          │
              │     │ - Target            │
              │     │ - Exceeded by       │
              │     │ - Metadata          │
              │     └─────────┬───────────┘
              │               │
              └───────┬───────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│ Store in Metrics Database                                │
│ (for Performance Dashboard & Reports)                    │
└──────────────────────────────────────────────────────────┘
```

## Component Integration Pattern

```typescript
┌──────────────────────────────────────────────────────────┐
│ COMPONENT LIFECYCLE                                      │
└──────────────────────────────────────────────────────────┘

1. MOUNT
   ↓
   useTimelineCache(projectId) hook
   ↓
   Setup hover prefetch on refs
   ├─ dropdownTabRef
   ├─ timelineTabRef
   └─ nativeTabRef

2. HOVER (User explores UI)
   ↓
   prefetchManager detects
   ↓
   Background load + cache
   ↓
   Ready for instant access!

3. CLICK (User wants to see data)
   ↓
   loadTimeline()
   ↓
   cacheManager.getWithRevalidate()
   ├─ Cache Hit (fresh) → Return instantly (5ms)
   ├─ Cache Hit (stale) → Return stale + revalidate
   └─ Cache Miss → Load from API

4. UPDATE (User changes data)
   ↓
   Optimistic UI update
   ↓
   API request
   ↓
   cacheManager.invalidate()
   ↓
   Next access will be fresh

5. UNMOUNT
   ↓
   Cleanup prefetch listeners
   ↓
   Cache stays in memory/localStorage
```

## Performance Dashboard Architecture

```
┌─────────────────────────────────────────────────────────┐
│ FLOATING BUTTON (Development Only)                      │
│ ├─ Position: Fixed bottom-right                         │
│ └─ Toggle: Open/Close dashboard                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ PERFORMANCE DASHBOARD                                    │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ HEADER                                             │  │
│ │ ├─ Status Indicator (Green/Red)                    │  │
│ │ ├─ Total Measurements                              │  │
│ │ └─ Overall Violation Rate                          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ CACHE STATS                                        │  │
│ │ ├─ Memory Entries                                  │  │
│ │ ├─ localStorage Entries                            │  │
│ │ └─ Total Size                                      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ PREFETCH STATS                                     │  │
│ │ ├─ Prefetched Keys                                 │  │
│ │ ├─ Queue Length                                    │  │
│ │ └─ Is Processing                                   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ SLA PERFORMANCE (Top 10)                           │  │
│ │ ├─ Category Name                                   │  │
│ │ ├─ Violation Rate                                  │  │
│ │ ├─ P95 Duration                                    │  │
│ │ └─ Color-coded (Red = Violated)                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ACTIONS                                            │  │
│ │ ├─ [Print Report]                                  │  │
│ │ └─ [Clear All]                                     │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Updates every 2 seconds (real-time monitoring)
```

---

**🎯 Architecture Goal:**

Every layer is optimized for speed:

- **UI Layer**: Instant renders with cached data
- **Performance Layer**: < 50ms overhead
- **API Layer**: Only hit when absolutely necessary

**Result: McMaster-Carr Speed = < 100ms perceived load time**
