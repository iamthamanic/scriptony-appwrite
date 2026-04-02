# Scriptony Performance Baseline (April 2026)

This file captures how to measure timeline/dropdown performance before and after the Phase 1 rollout.

## Scope

- Page: Projects -> Structure Dropdown (`FilmDropdown`)
- Dataset: one representative large film project
- Focus metrics:
  - Initial request count
  - Initial payload size
  - First interactive dropdown render
  - Scene-expand shot load latency

## Measurement Procedure

1. Open DevTools Network tab (Preserve log enabled).
2. Hard reload the project page.
3. Open the structure dropdown once.
4. Collect:
   - count of `/nodes/ultra-batch-load` and other timeline endpoints
   - transferred size of initial timeline request
5. In browser console run:
   - `window.scriptonyPerf.printReport()`
   - `window.scriptonyPerf.getStats('TIMELINE_LOAD')`
6. Expand a scene and capture:
   - one `shots` request for that scene
   - wall time to first visible shot card

## Baseline Targets from Plan

- Initial API calls: **5 -> 1**
- Initial payload: **2-5 MB -> 50-200 KB**
- Initial load time: **3-5s -> 300-500ms**

## Notes for This Rollout

- Initial timeline load now uses a single ultra-batch call with:
  - `include_shots=false`
  - `exclude_content=true`
- Shots are loaded lazily when scenes are expanded.
- Use this same procedure after each phase step to keep comparisons fair.
