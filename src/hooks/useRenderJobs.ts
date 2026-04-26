import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listRenderJobs,
  acceptRenderJob,
  rejectRenderJob,
} from "../lib/api/stage-api";
import { queryKeys } from "../lib/react-query";
import type { RenderJob, ReviewStatus } from "../lib/types";

export function useRenderJobs(shotId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.renderJobs.byShot(shotId ?? ""),
    queryFn: () => listRenderJobs(shotId!),
    enabled: !!shotId,
    staleTime: 15 * 1000,
  });
}

/**
 * Shared factory for accept/reject mutations.
 * Eliminates the near-identical duplication between useAcceptRenderJob
 * and useRejectRenderJob (only the mutationFn, target status, and
 * toast messages differ).
 */
function useReviewMutation(config: {
  mutationFn: (jobId: string) => Promise<RenderJob>;
  reviewStatus: ReviewStatus;
  successMessage: string;
  errorMessage: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,

    onMutate: async (jobId) => {
      await queryClient.cancelQueries({
        queryKey: ["renderJobs"],
      });

      const queries = queryClient.getQueriesData<{ jobs: RenderJob[] }>({
        queryKey: ["renderJobs"],
      });

      const snapshots = new Map(queries);

      queries.forEach(([queryKey, data]) => {
        if (!data?.jobs) return;
        queryClient.setQueryData<{ jobs: RenderJob[] }>(queryKey, {
          jobs: data.jobs.map((j) =>
            j.id === jobId ? { ...j, reviewStatus: config.reviewStatus } : j,
          ),
        });
      });

      return { snapshots };
    },

    onSuccess: () => {
      toast.success(config.successMessage);
    },

    onError: (err, _jobId, context) => {
      if (context?.snapshots) {
        for (const [queryKey, data] of context.snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      console.error("[useReviewMutation]", err);
      toast.error(config.errorMessage);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["renderJobs"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useAcceptRenderJob() {
  return useReviewMutation({
    mutationFn: acceptRenderJob,
    reviewStatus: "accepted",
    successMessage: "Render-Job akzeptiert",
    errorMessage: "Akzeptieren fehlgeschlagen",
  });
}

export function useRejectRenderJob() {
  return useReviewMutation({
    mutationFn: rejectRenderJob,
    reviewStatus: "rejected",
    successMessage: "Render-Job abgelehnt",
    errorMessage: "Ablehnen fehlgeschlagen",
  });
}
