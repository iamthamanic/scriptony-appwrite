/**
 * User-facing hint: Qwen Custom Voice needs `instruct` at TTS time for designed profiles.
 * Location: src/lib/mve/casting/voice-design-instruct-hint.ts
 */

export const VOICEBOX_DESIGNED_INSTRUCT_HINT =
  "Voicebox/Qwen: Die Stimm-Beschreibung wird bei der Wiedergabe als instruct übergeben — ohne instruct klingen alle Designed-Stimmen gleich (Standard-Männerstimme). Scriptony sendet instruct automatisch für A/B/C.";
