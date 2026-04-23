/**
 * SceneContentRenderer - Wählt je nach Projekt-Typ die richtige Scene-Komponente
 * Für Film/Serie: null zurückgeben (FilmDropdown rendert ShotCards selbst)
 * Für Audio/Hörbuch: AudioSceneCard mit Dialog-Tracks, Musik, SFX
 */

import type { Scene, Character } from "../lib/types";
import { AudioSceneCard } from "./AudioSceneCard";

export function isAudioProject(projectType: string): boolean {
  return projectType === "audio" || projectType === "book";
}

interface SceneContentRendererProps {
  projectType: string;
  projectId: string;
  scene: Scene;
  characters: Character[];
}

export function SceneContentRenderer({
  projectType,
  projectId,
  scene,
  characters,
}: SceneContentRendererProps) {
  // Nur für Audio/Hörbuch Projekte anzeigen
  if (isAudioProject(projectType)) {
    return (
      <AudioSceneCard
        scene={scene}
        projectId={projectId}
        characters={characters}
      />
    );
  }

  // Für Film/Serie: null - FilmDropdown rendert ShotCards selbst
  return null;
}

export default SceneContentRenderer;
