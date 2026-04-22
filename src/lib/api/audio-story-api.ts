/**
 * Audio Story API Client
 * Verbindung zu scriptony-audio-story Function
 */

import { apiGet, apiPost, apiPut, apiDelete, unwrapApiResult } from "../api-client";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../api-gateway";
import type { AudioTrack, RecordingSession, CharacterVoiceAssignment } from "../types";

const AUDIO_STORY_BASE = buildFunctionRouteUrl(EDGE_FUNCTIONS.AUDIO_STORY || "audio-story");

// =============================================================================
// AUDIO TRACKS
// =============================================================================

export async function getSceneAudioTracks(
  sceneId: string,
  accessToken: string,
): Promise<AudioTrack[]> {
  const result = await apiGet(`/tracks/scene/${encodeURIComponent(sceneId)}`);
  const data = unwrapApiResult(result);
  return data?.tracks || [];
}

export async function createAudioTrack(
  sceneId: string,
  trackData: Partial<AudioTrack>,
  accessToken: string,
): Promise<AudioTrack> {
  const result = await apiPost("/tracks", {
    sceneId,
    ...trackData,
  });
  const data = unwrapApiResult(result);
  return data?.track;
}

export async function updateAudioTrack(
  trackId: string,
  trackData: Partial<AudioTrack>,
  accessToken: string,
): Promise<AudioTrack> {
  const result = await apiPut(`/tracks/${trackId}`, trackData);
  const data = unwrapApiResult(result);
  return data?.track;
}

export async function deleteAudioTrack(
  trackId: string,
  accessToken: string,
): Promise<void> {
  await apiDelete(`/tracks/${trackId}`);
}

// =============================================================================
// RECORDING SESSIONS
// =============================================================================

export async function getAudioSessions(
  sceneId: string,
  accessToken: string,
): Promise<RecordingSession[]> {
  const result = await apiGet(`/sessions/scene/${encodeURIComponent(sceneId)}`);
  const data = unwrapApiResult(result);
  return data?.sessions || [];
}

export async function createAudioSession(
  sceneId: string,
  title: string,
  accessToken: string,
): Promise<RecordingSession> {
  const result = await apiPost("/sessions", {
    sceneId,
    title,
  });
  const data = unwrapApiResult(result);
  return data?.session;
}

// =============================================================================
// VOICE CASTING
// =============================================================================

export async function getVoiceAssignments(
  projectId: string,
  accessToken: string,
): Promise<CharacterVoiceAssignment[]> {
  const result = await apiGet(`/voices/project/${encodeURIComponent(projectId)}`);
  const data = unwrapApiResult(result);
  return data?.assignments || [];
}

export async function assignVoice(
  projectId: string,
  characterId: string,
  voiceActorType: "human" | "tts",
  assignmentData: Partial<CharacterVoiceAssignment>,
  accessToken: string,
): Promise<CharacterVoiceAssignment> {
  const result = await apiPost("/voices/assign", {
    projectId,
    characterId,
    voiceActorType,
    ...assignmentData,
  });
  const data = unwrapApiResult(result);
  return data?.assignment;
}

export async function getTTSAvailableVoices(): Promise<
  Array<{ id: string; name: string; provider: string; language: string }>
> {
  const result = await apiGet("/voices/tts/voices");
  const data = unwrapApiResult(result);
  return data?.ttsVoices || [];
}

// =============================================================================
// MIXING & EXPORT
// =============================================================================

export async function createPreviewMix(
  sceneId: string,
  trackIds: string[],
  accessToken: string,
): Promise<{ preview: { status: string; estimatedDuration: number } }> {
  const result = await apiPost("/mixing/preview", {
    sceneId,
    trackIds,
  });
  return unwrapApiResult(result);
}

export async function exportChapter(
  actId: string,
  format: "mp3" | "wav" | "flac" = "mp3",
  accessToken: string,
): Promise<{ export: { status: string; downloadUrl: string | null } }> {
  const result = await apiPost("/mixing/export/chapter", {
    actId,
    format,
  });
  return unwrapApiResult(result);
}
