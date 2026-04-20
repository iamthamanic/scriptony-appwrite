/**
 * React Query: one cached timeline bundle per project (ultra batch + book enrichment).
 * Aligns with VideoEditorTimeline / ProjectsPage data shape.
 */

import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import { loadProjectTimelineBundle } from "../lib/timeline-map";
import type { TimelineData } from "../components/FilmDropdown";
import type { BookTimelineData } from "../components/BookDropdown";

export function useProjectTimeline(
  projectId: string | undefined,
  projectType?: string | null,
) {
  const { getAccessToken, loading: authLoading } = useAuth();
  const isBook = (projectType ?? "").toLowerCase() === "book";

  return useQuery({
    queryKey: queryKeys.timeline.byProject(projectId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return loadProjectTimelineBundle(projectId!, token, isBook) as unknown as
        | TimelineData
        | BookTimelineData;
    },
    // Avoid firing before Appwrite session is ready (would error and leave empty UI).
    enabled: !!projectId && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Prefetch timeline for hover / intersection (e.g. project list). */
export function prefetchProjectTimeline(
  qc: QueryClient,
  projectId: string,
  projectType: string | undefined | null,
  getToken: () => Promise<string | null>,
) {
  const isBook = (projectType ?? "").toLowerCase() === "book";
  return qc.prefetchQuery({
    queryKey: queryKeys.timeline.byProject(projectId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return loadProjectTimelineBundle(projectId, token, isBook);
    },
    staleTime: 30 * 1000,
  });
}

export function setProjectTimelineCache(
  qc: QueryClient,
  projectId: string,
  data: TimelineData | BookTimelineData,
) {
  qc.setQueryData(queryKeys.timeline.byProject(projectId), data);
}
