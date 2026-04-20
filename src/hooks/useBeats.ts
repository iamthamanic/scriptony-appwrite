/**
 * 🎬 BEATS QUERY HOOKS
 *
 * Performance-optimierte React Query Hooks für Beats
 * mit Optimistic Updates & Prefetching
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner@2.0.3";
import {
  getBeats,
  createBeat,
  updateBeat,
  deleteBeat,
  reorderBeats,
  type StoryBeat,
  type CreateBeatPayload,
  type UpdateBeatPayload,
} from "../lib/api/beats-api";
import { queryKeys } from "../lib/react-query";

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * ⚡ Get Beats für ein Projekt
 *
 * Performance: <10ms aus Cache, ~200ms bei Cold Start
 */
export function useBeats(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.beats.byProject(projectId || ""),
    queryFn: () => getBeats(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30s - beats ändern sich selten
    gcTime: 5 * 60 * 1000, // 5 min cache
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * 🎯 Create Beat mit Optimistic Update
 */
export function useCreateBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBeat,

    // 🚀 Optimistic Update: UI updated sofort!
    onMutate: async (newBeat) => {
      const projectId = newBeat.project_id;
      const queryKey = queryKeys.beats.byProject(projectId);

      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey });

      // Snapshot von alten Daten
      const previousBeats = queryClient.getQueryData<StoryBeat[]>(queryKey);

      // Optimistic Update
      if (previousBeats) {
        const optimisticBeat: StoryBeat = {
          ...newBeat,
          id: `temp-${Date.now()}`, // Temp ID
          user_id: "temp-user",
          order_index: newBeat.order_index ?? previousBeats.length,
          pct_from: newBeat.pct_from ?? 0,
          pct_to: newBeat.pct_to ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<StoryBeat[]>(queryKey, [
          ...previousBeats,
          optimisticBeat,
        ]);
      }

      return { previousBeats, projectId };
    },

    // ✅ Success: Ersetze optimistic data mit echten Daten
    onSuccess: (newBeat, variables, context) => {
      const queryKey = queryKeys.beats.byProject(context.projectId);

      queryClient.setQueryData<StoryBeat[]>(queryKey, (old) => {
        if (!old) return [newBeat];
        // Ersetze temp beat mit echtem beat
        return old.map((beat) =>
          beat.id.startsWith("temp-") ? newBeat : beat,
        );
      });

      toast.success("Beat erstellt");
    },

    // ❌ Error: Rollback
    onError: (error, variables, context) => {
      if (context?.previousBeats) {
        queryClient.setQueryData(
          queryKeys.beats.byProject(context.projectId),
          context.previousBeats,
        );
      }

      console.error("[useCreateBeat] Error:", error);
      toast.error("Beat konnte nicht erstellt werden");
    },

    // 🔄 Finally: Invalidate query
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.beats.byProject(variables.project_id),
      });
    },
  });
}

/**
 * 🔄 Update Beat mit Optimistic Update
 */
export function useUpdateBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      beatId,
      payload,
    }: {
      beatId: string;
      payload: UpdateBeatPayload;
    }) => updateBeat(beatId, payload),

    // 🚀 Optimistic Update
    onMutate: async ({ beatId, payload }) => {
      // Find project ID von dem Beat
      const allBeatsQueries = queryClient.getQueriesData<StoryBeat[]>({
        queryKey: queryKeys.beats.all,
      });

      let projectId: string | undefined;
      let previousBeats: StoryBeat[] | undefined;

      for (const [queryKey, beats] of allBeatsQueries) {
        if (beats) {
          const beat = beats.find((b) => b.id === beatId);
          if (beat) {
            projectId = beat.project_id;
            previousBeats = beats;
            break;
          }
        }
      }

      if (!projectId || !previousBeats) {
        return {};
      }

      const queryKey = queryKeys.beats.byProject(projectId);

      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey });

      // Optimistic Update
      queryClient.setQueryData<StoryBeat[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((beat) =>
          beat.id === beatId ? { ...beat, ...payload } : beat,
        );
      });

      return { previousBeats, projectId };
    },

    // ✅ Success
    onSuccess: (updatedBeat, variables, context) => {
      if (context.projectId) {
        const queryKey = queryKeys.beats.byProject(context.projectId);

        queryClient.setQueryData<StoryBeat[]>(queryKey, (old) => {
          if (!old) return [updatedBeat];
          return old.map((beat) =>
            beat.id === updatedBeat.id ? updatedBeat : beat,
          );
        });
      }

      toast.success("Beat aktualisiert");
    },

    // ❌ Error: Rollback
    onError: (error, variables, context) => {
      if (context?.previousBeats && context?.projectId) {
        queryClient.setQueryData(
          queryKeys.beats.byProject(context.projectId),
          context.previousBeats,
        );
      }

      console.error("[useUpdateBeat] Error:", error);
      toast.error("Beat konnte nicht aktualisiert werden");
    },

    // 🔄 Finally
    onSettled: (data, error, variables, context) => {
      if (context?.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.beats.byProject(context.projectId),
        });
      }
    },
  });
}

/**
 * 🗑️ Delete Beat mit Optimistic Update
 */
export function useDeleteBeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBeat,

    // 🚀 Optimistic Update
    onMutate: async (beatId) => {
      // Find project ID
      const allBeatsQueries = queryClient.getQueriesData<StoryBeat[]>({
        queryKey: queryKeys.beats.all,
      });

      let projectId: string | undefined;
      let previousBeats: StoryBeat[] | undefined;

      for (const [queryKey, beats] of allBeatsQueries) {
        if (beats) {
          const beat = beats.find((b) => b.id === beatId);
          if (beat) {
            projectId = beat.project_id;
            previousBeats = beats;
            break;
          }
        }
      }

      if (!projectId || !previousBeats) {
        return {};
      }

      const queryKey = queryKeys.beats.byProject(projectId);

      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey });

      // Optimistic Update: Entferne Beat sofort
      queryClient.setQueryData<StoryBeat[]>(queryKey, (old) => {
        if (!old) return old;
        return old.filter((beat) => beat.id !== beatId);
      });

      return { previousBeats, projectId };
    },

    // ✅ Success
    onSuccess: () => {
      toast.success("Beat gelöscht");
    },

    // ❌ Error: Rollback
    onError: (error, beatId, context) => {
      if (context?.previousBeats && context?.projectId) {
        queryClient.setQueryData(
          queryKeys.beats.byProject(context.projectId),
          context.previousBeats,
        );
      }

      console.error("[useDeleteBeat] Error:", error);
      toast.error("Beat konnte nicht gelöscht werden");
    },

    // 🔄 Finally
    onSettled: (data, error, beatId, context) => {
      if (context?.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.beats.byProject(context.projectId),
        });
      }
    },
  });
}

/**
 * 🔀 Reorder Beats mit Optimistic Update
 */
export function useReorderBeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderBeats,

    // 🚀 Optimistic Update
    onMutate: async (reorderedBeats) => {
      // Find project ID vom ersten Beat
      const allBeatsQueries = queryClient.getQueriesData<StoryBeat[]>({
        queryKey: queryKeys.beats.all,
      });

      let projectId: string | undefined;
      let previousBeats: StoryBeat[] | undefined;

      for (const [queryKey, beats] of allBeatsQueries) {
        if (beats) {
          const beat = beats.find((b) => b.id === reorderedBeats[0]?.id);
          if (beat) {
            projectId = beat.project_id;
            previousBeats = beats;
            break;
          }
        }
      }

      if (!projectId || !previousBeats) {
        return {};
      }

      const queryKey = queryKeys.beats.byProject(projectId);

      // Cancel laufende Queries
      await queryClient.cancelQueries({ queryKey });

      // Optimistic Update: Reorder sofort
      queryClient.setQueryData<StoryBeat[]>(queryKey, (old) => {
        if (!old) return old;

        const reorderedMap = new Map(
          reorderedBeats.map((b) => [b.id, b.order_index]),
        );

        return [...old]
          .map((beat) => ({
            ...beat,
            order_index: reorderedMap.get(beat.id) ?? beat.order_index,
          }))
          .sort((a, b) => a.order_index - b.order_index);
      });

      return { previousBeats, projectId };
    },

    // ✅ Success
    onSuccess: () => {
      toast.success("Reihenfolge gespeichert");
    },

    // ❌ Error: Rollback
    onError: (error, variables, context) => {
      if (context?.previousBeats && context?.projectId) {
        queryClient.setQueryData(
          queryKeys.beats.byProject(context.projectId),
          context.previousBeats,
        );
      }

      console.error("[useReorderBeats] Error:", error);
      toast.error("Reihenfolge konnte nicht gespeichert werden");
    },

    // 🔄 Finally
    onSettled: (data, error, variables, context) => {
      if (context?.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.beats.byProject(context.projectId),
        });
      }
    },
  });
}

// =============================================================================
// PREFETCHING UTILITIES
// =============================================================================

/**
 * 🚀 Prefetch Beats für ein Projekt
 *
 * Call this when user hovers über ein Projekt oder bevor Navigation
 */
export function usePrefetchBeats() {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.beats.byProject(projectId),
      queryFn: () => getBeats(projectId),
      staleTime: 30 * 1000,
    });
  };
}
