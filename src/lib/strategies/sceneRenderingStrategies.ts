/**
 * Scene Rendering Strategies
 * Strategy Pattern für projektspezifische Scene-Darstellung
 *
 * Hörbuch vs Film vs Serie - jeweils eigene Rendering-Logik,
 * aber gemeinsame Scene-Datenstruktur (DRY)
 */

import type { Scene, Shot, AudioTrack } from "../types";

// Gemeinsames Interface für alle Projekttypen
export interface SceneData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  timeOfDay?: string;
  orderIndex: number;
  // Projekt-spezifische Children (eines ist immer gesetzt, basierend auf Typ)
  shots?: Shot[];
  audioTracks?: AudioTrack[];
}

// Strategy Interface
export interface SceneRenderingStrategy {
  readonly projectType: string; // Statt literal type für polymorphismus

  // Rendering Methoden
  renderTimeline(scene: SceneData): React.ReactNode;
  renderDetailView(
    scene: SceneData,
    onUpdate?: (scene: SceneData) => void,
  ): React.ReactNode;
  renderCompactCard(scene: SceneData): React.ReactNode;

  // Duration Berechnung
  calculateDuration(scene: SceneData): number;

  // Hilfs-Methoden
  getSceneStatus(scene: SceneData): "complete" | "incomplete" | "empty";
}

// ============================================
// FILM IMPLEMENTATION
// ============================================
export class FilmSceneStrategy implements SceneRenderingStrategy {
  readonly projectType = "film";

  renderTimeline(scene: SceneData): React.ReactNode {
    // Wird später implementiert - FilmTimeline mit Shots
    return null;
  }

  renderDetailView(
    scene: SceneData,
    onUpdate?: (scene: SceneData) => void,
  ): React.ReactNode {
    // Shot-List, Camera Angles, etc.
    return null;
  }

  renderCompactCard(scene: SceneData): React.ReactNode {
    return null;
  }

  calculateDuration(scene: SceneData): number {
    if (!scene.shots || scene.shots.length === 0) return 0;
    return scene.shots.reduce((sum, shot) => {
      return sum + (shot.duration ? parseInt(shot.duration) : 0);
    }, 0);
  }

  getSceneStatus(scene: SceneData): "complete" | "incomplete" | "empty" {
    if (!scene.shots || scene.shots.length === 0) return "empty";
    const hasIncompleteShots = scene.shots.some(
      (s) => !s.cameraAngle || !s.duration,
    );
    return hasIncompleteShots ? "incomplete" : "complete";
  }
}

// ============================================
// AUDIO (Hörbuch/Hörspiel) IMPLEMENTATION
// ============================================
export class AudioSceneStrategy implements SceneRenderingStrategy {
  readonly projectType = "audio";

  renderTimeline(scene: SceneData): React.ReactNode {
    // Multi-Track Audio Timeline
    return null;
  }

  renderDetailView(
    scene: SceneData,
    onUpdate?: (scene: SceneData) => void,
  ): React.ReactNode {
    // Conversation View + Audio Mixer
    return null;
  }

  renderCompactCard(scene: SceneData): React.ReactNode {
    // Mini Waveform Preview
    return null;
  }

  calculateDuration(scene: SceneData): number {
    if (!scene.audioTracks || scene.audioTracks.length === 0) return 0;
    return scene.audioTracks.reduce((sum, track) => {
      return sum + (track.duration || 0);
    }, 0);
  }

  getSceneStatus(scene: SceneData): "complete" | "incomplete" | "empty" {
    if (!scene.audioTracks || scene.audioTracks.length === 0) return "empty";
    const hasUnrecordedDialog = scene.audioTracks.some(
      (t) => t.type === "dialog" && !t.audioFileId,
    );
    return hasUnrecordedDialog ? "incomplete" : "complete";
  }
}

// ============================================
// SERIES IMPLEMENTATION (wie Film)
// ============================================
export class SeriesSceneStrategy implements SceneRenderingStrategy {
  readonly projectType = "series";

  renderTimeline(scene: SceneData): React.ReactNode {
    return null;
  }

  renderDetailView(
    scene: SceneData,
    _onUpdate?: (scene: SceneData) => void,
  ): React.ReactNode {
    return null;
  }

  renderCompactCard(scene: SceneData): React.ReactNode {
    return null;
  }

  calculateDuration(scene: SceneData): number {
    if (!scene.shots || scene.shots.length === 0) return 0;
    return scene.shots.reduce((sum, shot) => {
      return sum + (shot.duration ? parseInt(shot.duration) : 0);
    }, 0);
  }

  getSceneStatus(scene: SceneData): "complete" | "incomplete" | "empty" {
    if (!scene.shots || scene.shots.length === 0) return "empty";
    const hasIncompleteShots = scene.shots.some(
      (s) => !s.cameraAngle || !s.duration,
    );
    return hasIncompleteShots ? "incomplete" : "complete";
  }
}

// ============================================
// BOOK IMPLEMENTATION (Hörbuch-ähnlich, aber simpler)
// ============================================
export class BookSceneStrategy implements SceneRenderingStrategy {
  readonly projectType = "book";

  renderTimeline(scene: SceneData): React.ReactNode {
    return null;
  }

  renderDetailView(
    scene: SceneData,
    _onUpdate?: (scene: SceneData) => void,
  ): React.ReactNode {
    return null;
  }

  renderCompactCard(scene: SceneData): React.ReactNode {
    return null;
  }

  calculateDuration(scene: SceneData): number {
    // Für Hörbuch-Version eines Buches
    return new AudioSceneStrategy().calculateDuration(scene);
  }

  getSceneStatus(scene: SceneData): "complete" | "incomplete" | "empty" {
    if (!scene.audioTracks || scene.audioTracks.length === 0) return "empty";
    return "incomplete";
  }
}

// ============================================
// STRATEGY FACTORY (KISS)
// ============================================
const strategies: Map<string, SceneRenderingStrategy> = new Map([
  ["film", new FilmSceneStrategy() as SceneRenderingStrategy],
  ["series", new SeriesSceneStrategy() as SceneRenderingStrategy],
  ["audio", new AudioSceneStrategy() as SceneRenderingStrategy],
  ["book", new BookSceneStrategy() as SceneRenderingStrategy],
]);

export function getSceneStrategy(projectType: string): SceneRenderingStrategy {
  const strategy = strategies.get(projectType);
  if (!strategy) {
    console.warn(
      `[SceneStrategy] Unknown project type "${projectType}", falling back to film`,
    );
    return strategies.get("film")!;
  }
  return strategy;
}

export function isAudioProject(projectType: string): boolean {
  return projectType === "audio" || projectType === "book";
}

export function isVisualProject(projectType: string): boolean {
  return projectType === "film" || projectType === "series";
}
