# Performance Roadmap (Phase 2 -> Phase 4)

This roadmap schedules post-Phase-1 work after baseline validation.

## Gate to Start Phase 2

Start Phase 2 only when:

- initial request count <= 2 (target 1)
- initial timeline load p95 improved vs baseline
- no regressions in create/update/delete flow

## Phase 2 (Rendering Optimization)

1. Memoized subcomponents integration
   - wire `MemoizedActHeader`, `MemoizedSequenceHeader`, `MemoizedSceneHeader`
   - confirm stable callback identities
2. State batching
   - reduce clustered async state updates in timeline loading paths
3. DnD scope reduction
   - avoid mounting deep DnD trees for collapsed branches

## Phase 3 Follow-up

1. Code splitting for heavy optional UI blocks
2. Keep Skeleton-first loading as default for perceived performance

## Phase 4 (Architecture)

1. Progressive level loading
   - acts -> sequences -> scenes -> shots/content
2. Edge/API response caching
   - short TTL + stale-while-revalidate on read endpoints

## Validation Checklist per Milestone

- compare `window.scriptonyPerf.getStats('TIMELINE_LOAD')`
- compare network waterfall and payload
- verify no UX regressions in drag/drop and editing flows
- verify cache invalidation on mutations
