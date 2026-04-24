/**
 * React Query: Audio timeline bundle — acts/sequences/scenes + audio tracks + voice assignments.
 * Reuses useProjectTimeline for the structural nodes, then fetches audio data in parallel.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import { useProjectTimeline } from "./useProjectTimeline";
import * as AudioAPI from "../lib/api/audio-story-api";
import type { AudioTimelineData } from "../lib/types/audio-timeline";
import type { AudioTrack, CharacterVoiceAssignment } from "../lib/types";

export function useAudioTimeline(
  projectId: string | undefined,
  projectType?: string | null,
) {
  const { getAccessToken, loading: authLoading } = useAuth();

  // Structural nodes (acts/sequences/scenes) — reuse existing timeline query.
  const { data: structuralData } = useProjectTimeline(projectId, projectType);

  return useQuery<AudioTimelineData>({
    queryKey: queryKeys.timeline.audioByProject(projectId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      if (!structuralData) {
        throw new Error("Structural timeline data not loaded");
      }

      const sceneIds = structuralData.scenes.map((s) => s.id);

      // Fetch audio tracks for all scenes in parallel.
      const tracksArrays = await Promise.all(
        sceneIds.map((sceneId) =>
          AudioAPI.getSceneAudioTracks(sceneId, token).catch(
            () => [] as AudioTrack[],
          ),
        ),
      );

      const tracksByScene: Record<string, AudioTrack[]> = {};
      sceneIds.forEach((id, i) => {
        tracksByScene[id] = tracksArrays[i];
      });

      // Fetch voice assignments for the project.
      const voiceAssignments = await AudioAPI.getVoiceAssignments(
        projectId!,
        token,
      ).catch(() => [] as CharacterVoiceAssignment[]);

      const voiceMap: Record<string, CharacterVoiceAssignment> = {};
      voiceAssignments.forEach((va) => {
        voiceMap[va.characterId] = va;
      });

      return {
        acts: structuralData.acts ?? [],
        sequences: structuralData.sequences ?? [],
        scenes: structuralData.scenes ?? [],
        tracksByScene,
        voiceAssignments: voiceMap,
      };
    },
    enabled:
      !!projectId &&
      !authLoading &&
      !!structuralData &&
      (projectType ?? "").toLowerCase() === "audio",
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAudioTracks(
  sceneId: string | undefined,
  projectId: string | undefined,
) {
  const { getAccessToken, loading: authLoading } = useAuth();

  return useQuery<AudioTrack[]>({
    queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return AudioAPI.getSceneAudioTracks(sceneId!, token);
    },
    enabled: !!sceneId && !!projectId && !authLoading,
    staleTime: 10 * 1000,
  });
}

export function useCreateAudioTrack(
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (trackData: Partial<AudioTrack>) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return AudioAPI.createAudioTrack(sceneId!, projectId!, trackData, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
      });
    },
  });
}

export function useUpdateAudioTrack(
  trackId: string,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (trackData: Partial<AudioTrack>) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return AudioAPI.updateAudioTrack(trackId, trackData, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
      });
    },
  });
}

export function useDeleteAudioTrack(
  trackId: string,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return AudioAPI.deleteAudioTrack(trackId, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
      });
    },
  });
}

export function useCharacterVoiceAssignments(projectId: string | undefined) {
  const { getAccessToken, loading: authLoading } = useAuth();

  return useQuery<CharacterVoiceAssignment[]>({
    queryKey: queryKeys.audio.voicesByProject(projectId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return AudioAPI.getVoiceAssignments(projectId!, token);
    },
    enabled: !!projectId && !authLoading,
    staleTime: 60 * 1000,
  });
}
