/**
 * T14 Supported Jobs Registry.
 * Neue Job-Typen nur mit Eintrag + Worker-Support.
 */

export const SUPPORTED_JOBS: Record<
  string,
  { functionId: string; timeoutMs: number; requiresAuth: boolean }
> = {
  "style-guide": {
    functionId: "scriptony-style-guide",
    timeoutMs: 120000,
    requiresAuth: true,
  },
  "image-generate": {
    functionId: "scriptony-image",
    timeoutMs: 180000,
    requiresAuth: true,
  },
  "audio-process": {
    functionId: "scriptony-audio",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  // T08: Audio Production Orchestration
  "audio-production-generate": {
    functionId: "scriptony-audio-story",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  "audio-production-preview": {
    functionId: "scriptony-audio-story",
    timeoutMs: 300000,
    requiresAuth: true,
  },
  "audio-production-export": {
    functionId: "scriptony-audio-story",
    timeoutMs: 600000,
    requiresAuth: true,
  },
};
