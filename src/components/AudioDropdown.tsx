/**
 * AudioDropdown — Hörbuch/Hörspiel Dropdown-Ansicht.
 * Identisches Styling wie FilmDropdown:
 * - Act: blau (bg-blue-50 / border-blue-200)
 * - Sequence: grün (bg-green-50 / border-green-200)
 * - Scene: pink (bg-pink-50 / border-pink-200)
 * Innerhalb Scene: Audio-Tracks statt Shots + Scene-Bild-Upload.
 */

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Mic,
  Music,
  Volume2,
  Wind,
  Plus,
  Play,
  Pause,
  ImagePlus,
  User,
  Bot,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useAudioTimeline } from "../hooks/useAudioTimeline";
import type { Act, Sequence, Scene, AudioTrack } from "../lib/types";
import { cn } from "../lib/utils";

interface AudioDropdownProps {
  projectId: string;
  projectType?: string;
}

const TRACK_ICON: Record<string, React.ReactNode> = {
  dialog: <Mic className="size-3.5" />,
  narrator: <Mic className="size-3.5" />,
  music: <Music className="size-3.5" />,
  sfx: <Volume2 className="size-3.5" />,
  atmo: <Wind className="size-3.5" />,
};

const TRACK_COLOR: Record<string, string> = {
  dialog: "bg-amber-500",
  narrator: "bg-amber-400",
  music: "bg-violet-500",
  sfx: "bg-slate-500",
  atmo: "bg-sky-500",
};

export function AudioDropdown({ projectId, projectType }: AudioDropdownProps) {
  const { data, isLoading } = useAudioTimeline(projectId, projectType);

  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedSeqs, setExpandedSeqs] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const toggleSet = (
    set: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seqsByAct = useMemo(() => {
    if (!data) return new Map<string, Sequence[]>();
    const map = new Map<string, Sequence[]>();
    for (const s of data.sequences) {
      const k = s.actId ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [data]);

  const scenesBySeq = useMemo(() => {
    if (!data) return new Map<string, Scene[]>();
    const map = new Map<string, Scene[]>();
    for (const s of data.scenes) {
      const k = s.sequenceId ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Lade Audio-Hierarchie…
      </div>
    );
  }

  if (!data || data.acts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Acts vorhanden.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {data.acts.map((act) => {
        const isExpanded = expandedActs.has(act.id);
        return (
          <div key={act.id} className="mb-3">
            {/* ── ACT CARD (identisch FilmDropdown) ───────────────── */}
            <div
              className={cn(
                "border-2 rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-700 overflow-hidden",
              )}
            >
              {/* Act Header */}
              <div className="flex items-center gap-2 py-4 px-3">
                <GripVertical className="size-4 text-muted-foreground cursor-move flex-shrink-0" />
                <button
                  className="flex-shrink-0"
                  onClick={() => toggleSet(setExpandedActs, act.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
                <span
                  className="flex-1 font-semibold text-[18px] text-[rgb(21,93,252)] cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleSet(setExpandedActs, act.id)}
                >
                  {act.actNumber}. {act.title || "Unbenannter Act"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(seqsByAct.get(act.id) ?? []).length} Sequenzen
                </span>
              </div>

              {/* Act Content */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-2">
                  {(seqsByAct.get(act.id) ?? []).map((seq) => (
                    <SequenceCard
                      key={seq.id}
                      seq={seq}
                      isExpanded={expandedSeqs.has(seq.id)}
                      onToggle={() => toggleSet(setExpandedSeqs, seq.id)}
                      scenes={scenesBySeq.get(seq.id) ?? []}
                      expandedScenes={expandedScenes}
                      onToggleScene={(id) => toggleSet(setExpandedScenes, id)}
                      tracksByScene={data.tracksByScene}
                      voiceAssignments={data.voiceAssignments}
                      playingTrackId={playingTrackId}
                      onPlayTrack={setPlayingTrackId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sequence Card (identisch FilmDropdown: grün) ─────────────────

function SequenceCard({
  seq,
  isExpanded,
  onToggle,
  scenes,
  expandedScenes,
  onToggleScene,
  tracksByScene,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
}: {
  seq: Sequence;
  isExpanded: boolean;
  onToggle: () => void;
  scenes: Scene[];
  expandedScenes: Set<string>;
  onToggleScene: (id: string) => void;
  tracksByScene: Record<string, AudioTrack[]>;
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
}) {
  return (
    <div
      className={cn(
        "border-2 rounded-lg bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-700 overflow-hidden",
      )}
    >
      {/* Sequence Header */}
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
        <button className="flex-shrink-0" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <span
          className="flex-1 text-sm font-semibold text-[14px] text-[rgb(0,166,62)] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onToggle}
        >
          {seq.sequenceNumber}. {seq.title || "Unbenannte Sequenz"}
        </span>
        <span className="text-xs text-muted-foreground">
          {scenes.length} Szenen
        </span>
      </div>

      {/* Sequence Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isExpanded={expandedScenes.has(scene.id)}
              onToggle={() => onToggleScene(scene.id)}
              tracks={tracksByScene[scene.id] ?? []}
              voiceAssignments={voiceAssignments}
              playingTrackId={playingTrackId}
              onPlayTrack={onPlayTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scene Card (identisch FilmDropdown: pink) ────────────────────

function SceneCard({
  scene,
  isExpanded,
  onToggle,
  tracks,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
}: {
  scene: Scene;
  isExpanded: boolean;
  onToggle: () => void;
  tracks: AudioTrack[];
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
}) {
  const [showImageUpload, setShowImageUpload] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<string, AudioTrack[]> = {
      dialog: [],
      narrator: [],
      music: [],
      sfx: [],
      atmo: [],
    };
    for (const t of tracks) g[t.type]?.push(t);
    return g;
  }, [tracks]);

  return (
    <div
      className={cn(
        "border-2 rounded-lg bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-700 overflow-hidden",
      )}
    >
      {/* Scene Header */}
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
        <button className="flex-shrink-0" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <span
          className="flex-1 text-xs font-semibold text-[14px] text-[rgb(230,0,118)] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onToggle}
        >
          #{scene.sceneNumber} {scene.title || "Unbenannte Szene"}
        </span>
        <span className="text-xs text-muted-foreground">
          {tracks.length} Tracks
        </span>
      </div>

      {/* Scene Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Scene Bild-Upload (wie Shot-Bild) */}
          <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-pink-200 dark:border-pink-800">
            <div className="shrink-0">
              {scene.imageUrl ? (
                <img
                  src={scene.imageUrl}
                  alt={scene.title || "Szene"}
                  className="w-24 h-24 object-cover rounded-lg border border-pink-200 dark:border-pink-800"
                />
              ) : (
                <button
                  onClick={() => setShowImageUpload(true)}
                  className="w-24 h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-pink-300 dark:border-pink-700 text-pink-500 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors"
                >
                  <ImagePlus className="size-6 mb-1" />
                  <span className="text-[10px]">Bild</span>
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">
                {scene.setting || "Kein Setting"}
              </div>
              {scene.description && (
                <div className="text-xs text-foreground line-clamp-2">
                  {scene.description}
                </div>
              )}
            </div>
          </div>

          {/* Audio Tracks */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center p-3 text-xs text-muted-foreground border-2 border-dashed border-pink-200 dark:border-pink-700 rounded-lg">
              Keine Audio-Tracks vorhanden
            </div>
          ) : (
            <div className="space-y-1.5">
              <TrackGroup
                type="dialog"
                tracks={grouped.dialog}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="narrator"
                tracks={grouped.narrator}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="sfx"
                tracks={grouped.sfx}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="music"
                tracks={grouped.music}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="atmo"
                tracks={grouped.atmo}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
            </div>
          )}

          {/* Add Track Button */}
          <button className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg border border-dashed border-pink-200 dark:border-pink-700 transition-colors">
            <Plus className="size-3.5" />
            Track hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Track Group ─────────────────────────────────────────────────

function TrackGroup({
  type,
  tracks,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
}: {
  type: string;
  tracks: AudioTrack[];
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
}) {
  if (tracks.length === 0) return null;

  const label =
    type === "dialog"
      ? "Dialog"
      : type === "narrator"
        ? "Erzähler"
        : type === "music"
          ? "Musik"
          : type === "sfx"
            ? "SFX"
            : "Atmo";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            TRACK_COLOR[type] || "bg-gray-500",
          )}
        />
        <span>{label}</span>
      </div>
      {tracks.map((track) => (
        <TrackItem
          key={track.id}
          track={track}
          voiceAssignments={voiceAssignments}
          isPlaying={playingTrackId === track.id}
          onPlay={() =>
            onPlayTrack(playingTrackId === track.id ? null : track.id)
          }
        />
      ))}
    </div>
  );
}

// ─── Track Item ──────────────────────────────────────────────────

function TrackItem({
  track,
  voiceAssignments,
  isPlaying,
  onPlay,
}: {
  track: AudioTrack;
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const va = track.characterId ? voiceAssignments[track.characterId] : null;
  const isTTS = va?.voiceActorType === "tts";

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/80 dark:bg-black/20 border border-pink-100 dark:border-pink-800/50 hover:border-pink-300 dark:hover:border-pink-600 transition-colors">
      <button
        onClick={onPlay}
        className={cn(
          "shrink-0 p-1 rounded-full transition-colors",
          isPlaying
            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            : "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-800/40",
        )}
      >
        {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>

      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          TRACK_COLOR[track.type] || "bg-gray-500",
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">
            {track.content || "(leer)"}
          </span>
          {track.characterId && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[9px] px-1 py-px rounded",
                isTTS
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              )}
            >
              {isTTS ? (
                <Bot className="size-2.5" />
              ) : (
                <User className="size-2.5" />
              )}
              {isTTS ? "KI" : "Voice"}
            </span>
          )}
        </div>
        {(track.audioDuration ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            {formatSec(track.audioDuration ?? 0)}
          </div>
        )}
      </div>

      <button className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100">
        <MoreVertical className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioDropdown;
