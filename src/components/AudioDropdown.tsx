/**
 * AudioDropdown — Hörbuch/Hörspiel Dropdown-Ansicht
 * Chat-like Audio-Tracks unter Szenen. Keine Shots.
 * Max 300 Zeilen (KISS).
 */

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Mic,
  Music,
  Volume2,
  Wind,
  User,
  Bot,
  Plus,
  Play,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAudioTimeline } from "../hooks/useAudioTimeline";
import type { Act, Sequence, Scene, AudioTrack, Character } from "../lib/types";
import { cn } from "../lib/utils";

interface AudioDropdownProps {
  projectId: string;
  projectType?: string;
  characters?: Character[];
}

const TRACK_ICONS: Record<string, React.ReactNode> = {
  dialog: <Mic className="w-3.5 h-3.5" />,
  narrator: <Mic className="w-3.5 h-3.5" />,
  music: <Music className="w-3.5 h-3.5" />,
  sfx: <Volume2 className="w-3.5 h-3.5" />,
  atmo: <Wind className="w-3.5 h-3.5" />,
};

const TRACK_COLORS: Record<string, string> = {
  dialog:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  narrator:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  music:
    "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  sfx: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  atmo: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
};

export function AudioDropdown({ projectId, projectType }: AudioDropdownProps) {
  const { user } = useAuth();
  const { data, isLoading } = useAudioTimeline(projectId, projectType);

  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedSeqs, setExpandedSeqs] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const toggle = (
    id: string,
    set: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setExpandedActs(new Set(data.acts.map((a) => a.id)));
    setExpandedSeqs(new Set(data.sequences.map((s) => s.id)));
    setExpandedScenes(new Set(data.scenes.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedActs(new Set());
    setExpandedSeqs(new Set());
    setExpandedScenes(new Set());
  };

  // Build lookup maps.
  const seqsByAct = useMemo(() => {
    if (!data) return new Map<string, Sequence[]>();
    return groupBy(data.sequences, "actId");
  }, [data]);

  const scenesBySeq = useMemo(() => {
    if (!data) return new Map<string, Scene[]>();
    return groupBy(data.scenes, "sequenceId");
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
        Keine Acts vorhanden. Füge einen Act hinzu.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">
          {data.acts.length} Acts · {data.scenes.length} Szenen
        </span>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
          >
            Alle öffnen
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
          >
            Alle schließen
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {data.acts.map((act) => (
          <ActNode
            key={act.id}
            act={act}
            isExpanded={expandedActs.has(act.id)}
            onToggle={() => toggle(act.id, setExpandedActs)}
            sequences={seqsByAct.get(act.id) ?? []}
            scenesBySeq={scenesBySeq}
            tracksByScene={data.tracksByScene}
            voiceAssignments={data.voiceAssignments}
            expandedSeqs={expandedSeqs}
            expandedScenes={expandedScenes}
            onToggleSeq={(id) => toggle(id, setExpandedSeqs)}
            onToggleScene={(id) => toggle(id, setExpandedScenes)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function ActNode({
  act,
  isExpanded,
  onToggle,
  sequences,
  scenesBySeq,
  tracksByScene,
  voiceAssignments,
  expandedSeqs,
  expandedScenes,
  onToggleSeq,
  onToggleScene,
}: {
  act: Act;
  isExpanded: boolean;
  onToggle: () => void;
  sequences: Sequence[];
  scenesBySeq: Map<string, Scene[]>;
  tracksByScene: Record<string, AudioTrack[]>;
  voiceAssignments: Record<
    string,
    { voiceActorType?: string; ttsProvider?: string }
  >;
  expandedSeqs: Set<string>;
  expandedScenes: Set<string>;
  onToggleSeq: (id: string) => void;
  onToggleScene: (id: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {act.actNumber}. {act.title || "Unbenannter Act"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {sequences.length} Sequenzen
        </span>
      </button>

      {isExpanded && (
        <div className="pl-4 pr-2 pb-2 space-y-1">
          {sequences.map((seq) => (
            <SequenceNode
              key={seq.id}
              seq={seq}
              isExpanded={expandedSeqs.has(seq.id)}
              onToggle={() => onToggleSeq(seq.id)}
              scenes={scenesBySeq.get(seq.id) ?? []}
              tracksByScene={tracksByScene}
              voiceAssignments={voiceAssignments}
              expandedScenes={expandedScenes}
              onToggleScene={onToggleScene}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceNode({
  seq,
  isExpanded,
  onToggle,
  scenes,
  tracksByScene,
  voiceAssignments,
  expandedScenes,
  onToggleScene,
}: {
  seq: Sequence;
  isExpanded: boolean;
  onToggle: () => void;
  scenes: Scene[];
  tracksByScene: Record<string, AudioTrack[]>;
  voiceAssignments: Record<
    string,
    { voiceActorType?: string; ttsProvider?: string }
  >;
  expandedScenes: Set<string>;
  onToggleScene: (id: string) => void;
}) {
  return (
    <div className="border-l-2 border-border pl-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-2 text-left hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground">
          {seq.sequenceNumber}. {seq.title || "Unbenannte Sequenz"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {scenes.length} Szenen
        </span>
      </button>

      {isExpanded && (
        <div className="pl-4 space-y-1">
          {scenes.map((scene) => (
            <SceneNode
              key={scene.id}
              scene={scene}
              isExpanded={expandedScenes.has(scene.id)}
              onToggle={() => onToggleScene(scene.id)}
              tracks={tracksByScene[scene.id] ?? []}
              voiceAssignments={voiceAssignments}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneNode({
  scene,
  isExpanded,
  onToggle,
  tracks,
  voiceAssignments,
}: {
  scene: Scene;
  isExpanded: boolean;
  onToggle: () => void;
  tracks: AudioTrack[];
  voiceAssignments: Record<
    string,
    { voiceActorType?: string; ttsProvider?: string }
  >;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, AudioTrack[]> = {
      dialog: [],
      narrator: [],
      music: [],
      sfx: [],
      atmo: [],
    };
    for (const t of tracks) {
      groups[t.type]?.push(t);
    }
    return groups;
  }, [tracks]);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground">
          #{scene.sceneNumber} {scene.title || "Unbenannte Szene"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {tracks.length} Tracks
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <TrackGroup
            type="dialog"
            tracks={grouped.dialog}
            voiceAssignments={voiceAssignments}
          />
          <TrackGroup
            type="narrator"
            tracks={grouped.narrator}
            voiceAssignments={voiceAssignments}
          />
          <TrackGroup
            type="music"
            tracks={grouped.music}
            voiceAssignments={voiceAssignments}
          />
          <TrackGroup
            type="sfx"
            tracks={grouped.sfx}
            voiceAssignments={voiceAssignments}
          />
          <TrackGroup
            type="atmo"
            tracks={grouped.atmo}
            voiceAssignments={voiceAssignments}
          />

          <button className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
            <Plus className="w-3.5 h-3.5" />
            Track hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

function TrackGroup({
  type,
  tracks,
  voiceAssignments,
}: {
  type: string;
  tracks: AudioTrack[];
  voiceAssignments: Record<
    string,
    { voiceActorType?: string; ttsProvider?: string }
  >;
}) {
  if (tracks.length === 0) return null;

  const title =
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
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
        {TRACK_ICONS[type]}
        <span>{title}</span>
      </div>
      {tracks.map((track) => (
        <TrackItem
          key={track.id}
          track={track}
          voiceAssignments={voiceAssignments}
        />
      ))}
    </div>
  );
}

function TrackItem({
  track,
  voiceAssignments,
}: {
  track: AudioTrack;
  voiceAssignments: Record<
    string,
    { voiceActorType?: string; ttsProvider?: string }
  >;
}) {
  const isTTS =
    voiceAssignments[track.characterId ?? ""]?.voiceActorType === "tts";
  const voiceBadge = isTTS ? (
    <span className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <Bot className="w-3 h-3" /> KI
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <User className="w-3 h-3" /> Voice
    </span>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-2.5 py-2 rounded-lg border text-sm",
        TRACK_COLORS[track.type] || "bg-muted text-foreground border-border",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium truncate">
            {track.content || "Unbenannter Track"}
          </span>
          {track.characterId && voiceBadge}
        </div>
        {track.audioDuration != null && (
          <div className="text-xs opacity-70">
            {formatDuration(track.audioDuration)}
          </div>
        )}
      </div>
      <button className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
        <Play className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Utilities ──────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = String(item[key] ?? "");
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
