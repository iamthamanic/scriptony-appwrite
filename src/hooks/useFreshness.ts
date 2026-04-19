import { useQuery } from "@tanstack/react-query";
import { fetchFreshness } from "../lib/api/freshness-api";
import { computeFreshness } from "../lib/freshness";
import { queryKeys } from "../lib/react-query";
import type { Shot, ShotFreshnessResult } from "../lib/types";

export function useFreshness(shotId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.freshness.byShot(shotId ?? ""),
    queryFn: () => fetchFreshness(shotId!),
    enabled: !!shotId,
    staleTime: 60 * 1000,
  });
}

export function useFreshnessLocal(shot: Shot | undefined): ShotFreshnessResult {
  if (!shot) {
    return {
      guidesStale: "unknown",
      renderStale: "unknown",
      previewStale: "unknown",
      overall: "unknown",
      reasons: [],
    };
  }

  return computeFreshness({
    blenderSyncRevision: shot.blenderSyncRevision,
    guideBundleRevision: shot.guideBundleRevision,
    styleProfileRevision: shot.styleProfileRevision,
    renderRevision: shot.renderRevision,
    lastBlenderSyncAt: shot.lastBlenderSyncAt ?? null,
    lastPreviewAt: shot.lastPreviewAt ?? null,
  });
}
