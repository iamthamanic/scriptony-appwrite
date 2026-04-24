/**
 * AudioSceneCard - Für Hörbuch/Hörspiel Projekte
 * Zeigt Audio-Tracks (Dialog/Musik/SFX) statt Film-Shots
 */

import { useState, useMemo } from "react";
import {
  Mic,
  Music,
  Volume2,
  Wind,
  MoreVertical,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Wand2,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "./ui/utils";
import type { Scene, AudioTrack, Character } from "../lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "../lib/auth/getAuthToken";
import {
  getSceneAudioTracks,
  createAudioTrack,
  updateAudioTrack,
  deleteAudioTrack,
} from "../lib/api/audio-story-api";
import { toast } from "sonner@2.0.3";

type AudioTrackType = "dialog" | "narrator" | "music" | "sfx" | "atmo";

interface AudioTrackItemProps {
  track: AudioTrack;
  characters: Character[];
  onUpdate: (track: AudioTrack) => void;
  onDelete: (trackId: string) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

const trackTypeConfig: Record<
  AudioTrackType,
  { icon: React.ReactNode; label: string; color: string }
> = {
  dialog: {
    icon: <Mic className="size-4" />,
    label: "Dialog",
    color: "bg-blue-500",
  },
  narrator: {
    icon: <Mic className="size-4" />,
    label: "Erzähler",
    color: "bg-purple-500",
  },
  music: {
    icon: <Music className="size-4" />,
    label: "Musik",
    color: "bg-green-500",
  },
  sfx: {
    icon: <Volume2 className="size-4" />,
    label: "SFX",
    color: "bg-orange-500",
  },
  atmo: {
    icon: <Wind className="size-4" />,
    label: "Atmo",
    color: "bg-cyan-500",
  },
};

function AudioTrackItem({
  track,
  characters,
  onUpdate,
  onDelete,
  isPlaying,
  onPlayToggle,
}: AudioTrackItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(track.content || "");
  const [editedCharacterId, setEditedCharacterId] = useState(
    track.characterId || "",
  );

  const character = characters.find((c) => c.id === track.characterId);
  const config =
    trackTypeConfig[track.type as AudioTrackType] || trackTypeConfig.dialog;

  const handleSave = () => {
    onUpdate({
      ...track,
      content: editedContent,
      characterId: editedCharacterId || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-white", config.color)}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
          {track.type === "dialog" && (
            <Select
              value={editedCharacterId}
              onValueChange={setEditedCharacterId}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Charakter wählen" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((char) => (
                  <SelectItem key={char.id} value={char.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={char.imageUrl} />
                        <AvatarFallback>{char.name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{char.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          rows={2}
          placeholder={
            track.type === "dialog" ? "Dialogtext..." : "Beschreibung..."
          }
          className="text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSave}>
            Speichern
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-3 group hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={cn(
            "size-8 rounded-full flex items-center justify-center text-white shrink-0",
            config.color,
          )}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {config.label}
            </span>
            {character && (
              <div className="flex items-center gap-1 text-xs">
                <Avatar className="size-5">
                  <AvatarImage src={character.imageUrl} />
                  <AvatarFallback>{character.name[0]}</AvatarFallback>
                </Avatar>
                <span>{character.name}</span>
              </div>
            )}
          </div>
          <p className="text-sm">{track.content || "Kein Text"}</p>

          {/* Audio Player stub */}
          {track.audioFileId && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onPlayToggle}
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
              <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                {track.waveformData ? (
                  <div className="flex items-end h-full gap-px px-1">
                    {/* Waveform visualization stub */}
                    <div className="flex-1 bg-primary/30 rounded-t" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    Keine Waveform
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {track.duration?.toFixed(1)}s
              </span>
            </div>
          )}

          {/* TTS Button */}
          {!track.audioFileId && track.type === "dialog" && (
            <Button variant="outline" size="sm" className="mt-2 gap-1">
              <Wand2 className="size-3" />
              TTS Generieren
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="size-4 mr-2" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(track.id)}
                className="text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface AudioSceneCardProps {
  scene: Scene;
  projectId: string;
  characters: Character[];
}

export function AudioSceneCard({
  scene,
  projectId,
  characters,
}: AudioSceneCardProps) {
  const queryClient = useQueryClient();
  const [newTrackType, setNewTrackType] = useState<AudioTrackType>("dialog");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Fetch audio tracks
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["audio-tracks", scene.id],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return [];
      return getSceneAudioTracks(scene.id, token);
    },
  });

  // Create track mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<AudioTrack>) => {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth token");
      return createAudioTrack(scene.id, projectId, data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-tracks", scene.id] });
      toast.success("Audio-Track erstellt");
    },
  });

  const handleAddTrack = () => {
    createMutation.mutate({
      type: newTrackType,
      content: "",
      startTime: 0,
      duration: 0,
    });
  };

  return (
    <div className="bg-card border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{scene.title}</h3>
          {scene.description && (
            <p className="text-sm text-muted-foreground">{scene.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {tracks.length} Tracks
          </span>
        </div>
      </div>

      {/* Timeline Visualization (stub) */}
      <div className="h-12 bg-muted rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Timeline Visualization (coming soon)
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Lade Audio-Tracks...
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            Keine Audio-Tracks vorhanden.
            <br />
            Füge Dialog, Musik oder SFX hinzu.
          </div>
        ) : (
          tracks.map((track) => (
            <AudioTrackItem
              key={track.id}
              track={track}
              characters={characters}
              onUpdate={(updated) => {
                /* update mutation */
              }}
              onDelete={(id) => {
                /* delete mutation */
              }}
              isPlaying={playingTrackId === track.id}
              onPlayToggle={() =>
                setPlayingTrackId(playingTrackId === track.id ? null : track.id)
              }
            />
          ))
        )}
      </div>

      {/* Add Track */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Select
          value={newTrackType}
          onValueChange={(v) => setNewTrackType(v as AudioTrackType)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dialog">🎭 Dialog</SelectItem>
            <SelectItem value="narrator">📖 Erzähler</SelectItem>
            <SelectItem value="music">🎵 Musik</SelectItem>
            <SelectItem value="sfx">🔊 SFX</SelectItem>
            <SelectItem value="atmo">🌊 Atmo</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddTrack} disabled={createMutation.isPending}>
          <Plus className="size-4 mr-1" />
          Track hinzufügen
        </Button>
      </div>
    </div>
  );
}

export default AudioSceneCard;
