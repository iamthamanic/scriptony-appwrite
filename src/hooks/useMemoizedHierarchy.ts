/**
 * 🚀 MEMOIZED HIERARCHY HOOK
 * 
 * Efficiently filters and memoizes hierarchical timeline data
 * Prevents re-computation on every render
 */

import { useMemo } from 'react';
import type { Act, Sequence, Scene, Shot } from '../lib/types';

interface TimelineHierarchy {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots?: Shot[];
}

/**
 * Get sequences for a specific act (memoized)
 */
export function useActSequences(
  sequences: Sequence[],
  actId: string
): Sequence[] {
  return useMemo(() => {
    return sequences
      .filter((seq) => seq.actId === actId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [sequences, actId]);
}

/**
 * Get scenes for a specific sequence (memoized)
 */
export function useSequenceScenes(
  scenes: Scene[],
  sequenceId: string
): Scene[] {
  return useMemo(() => {
    return scenes
      .filter((scene) => scene.sequenceId === sequenceId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [scenes, sequenceId]);
}

/**
 * Get shots for a specific scene (memoized)
 */
export function useSceneShots(shots: Shot[], sceneId: string): Shot[] {
  return useMemo(() => {
    return shots
      .filter((shot) => shot.sceneId === sceneId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [shots, sceneId]);
}

/**
 * Calculate total word count for a container (memoized)
 */
export function useContainerWordCount(
  scenes: Scene[],
  sequenceIds: string[]
): number {
  return useMemo(() => {
    return scenes
      .filter(
        (scene) =>
          scene.sequenceId != null && sequenceIds.includes(scene.sequenceId)
      )
      .reduce((sum, scene) => sum + (scene.wordCount || 0), 0);
  }, [scenes, sequenceIds]);
}

/**
 * Get all hierarchy statistics (memoized)
 */
export function useHierarchyStats(data: TimelineHierarchy) {
  return useMemo(() => {
    const stats = {
      totalActs: data.acts.length,
      totalSequences: data.sequences.length,
      totalScenes: data.scenes.length,
      totalShots: data.shots?.length || 0,
      totalWords: data.scenes.reduce((sum, scene) => sum + (scene.wordCount || 0), 0),
      avgScenesPerSequence: 0,
      avgShotsPerScene: 0,
    };

    if (stats.totalSequences > 0) {
      stats.avgScenesPerSequence = stats.totalScenes / stats.totalSequences;
    }

    if (stats.totalScenes > 0 && data.shots) {
      stats.avgShotsPerScene = stats.totalShots / stats.totalScenes;
    }

    return stats;
  }, [data]);
}

/**
 * Build complete hierarchical tree (memoized)
 * Only use this when you need the FULL tree - usually for export/analysis
 */
export function useCompleteHierarchy(data: TimelineHierarchy) {
  return useMemo(() => {
    return data.acts.map((act) => {
      const actSequences = data.sequences
        .filter((seq) => seq.actId === act.id)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      return {
        ...act,
        sequences: actSequences.map((sequence) => {
          const sequenceScenes = data.scenes
            .filter((scene) => scene.sequenceId === sequence.id)
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

          return {
            ...sequence,
            scenes: sequenceScenes.map((scene) => {
              const sceneShots = data.shots
                ?.filter((shot) => shot.sceneId === scene.id)
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)) || [];

              return {
                ...scene,
                shots: sceneShots,
              };
            }),
          };
        }),
      };
    });
  }, [data]);
}

/**
 * Get only visible items based on expand state (memoized)
 * This is KEY for performance - only process what's visible!
 */
export function useVisibleItems(
  data: TimelineHierarchy,
  expandedActs: Set<string>,
  expandedSequences: Set<string>,
  expandedScenes: Set<string>
) {
  return useMemo(() => {
    const visibleSequences = data.sequences.filter((seq) =>
      expandedActs.has(seq.actId)
    );

    const visibleSequenceIds = new Set(visibleSequences.map((s) => s.id));
    const visibleScenes = data.scenes.filter(
      (scene) =>
        scene.sequenceId != null &&
        visibleSequenceIds.has(scene.sequenceId) &&
        expandedSequences.has(scene.sequenceId)
    );

    const visibleSceneIds = new Set(visibleScenes.map((s) => s.id));
    const visibleShots =
      data.shots?.filter(
        (shot) =>
          shot.sceneId != null &&
          visibleSceneIds.has(shot.sceneId) &&
          expandedScenes.has(shot.sceneId)
      ) || [];

    return {
      sequences: visibleSequences,
      scenes: visibleScenes,
      shots: visibleShots,
    };
  }, [data, expandedActs, expandedSequences, expandedScenes]);
}
