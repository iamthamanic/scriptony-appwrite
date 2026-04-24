/**
 * AudioSceneView - Vollständiger View für Hörspiel-Szenen
 * Zeigt alle Audio-Tracks für eine Szene
 */

import { useState } from "react";
import { Mic, Headphones, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AudioSceneCard } from "./AudioSceneCard";
import type { Scene, Character } from "../lib/types";

interface AudioSceneViewProps {
  scenes: Scene[];
  projectId: string;
  characters: Character[];
}

export function AudioSceneView({
  scenes,
  projectId,
  characters,
}: AudioSceneViewProps) {
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(
    scenes[0]?.id || null,
  );

  const totalDuration = scenes.reduce((sum, scene) => {
    // Hier würde man die tatsächliche Duration berechnen
    return sum + (scene.duration || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Szenen</p>
              <p className="text-2xl font-bold">{scenes.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Charaktere</p>
              <p className="text-2xl font-bold">{characters.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gesamtdauer</p>
              <p className="text-2xl font-bold">
                {Math.round(totalDuration / 60)} min
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scene List */}
      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <div key={scene.id}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Szene {index + 1}</Badge>
              <span className="text-sm text-muted-foreground">
                {scene.location}
              </span>
            </div>
            <AudioSceneCard
              scene={scene}
              projectId={projectId}
              characters={characters}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AudioSceneView;
