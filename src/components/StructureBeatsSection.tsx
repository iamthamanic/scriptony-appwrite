import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Plus, ChevronUp, ChevronDown, Search, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { BeatColumn } from "./BeatColumn";
import { VideoEditorTimeline } from "./VideoEditorTimeline";
import type { BeatCardData, TimelineNode } from "./BeatCard";
import { ProjectDropdown } from "./ProjectDropdown";
import type { TimelineData } from "./FilmDropdown";
import type { BookTimelineData } from "./BookDropdown";
import { ScriptStructureImportButton } from "./ScriptStructureImportButton";
import { NativeBookView } from "./NativeBookView";
import { NativeScreenplayView } from "./NativeScreenplayView";
import { NativeAudiobookView } from "./NativeAudiobookView";
import {
  generateBeatsFromTemplate,
  LITE_7_TEMPLATE,
  SAVE_THE_CAT_TEMPLATE,
  type BeatTemplate,
} from "../lib/beat-templates";
import { APP_UNDO_PRIORITY_TIMELINE } from "../lib/app-undo-operations";
import {
  useBeats,
  useCreateBeat,
  useUpdateBeat,
  useDeleteBeat,
} from "../hooks/useBeats";
import * as TimelineAPI from "../lib/api/timeline-api";
import { toast } from "sonner";
import {
  TimelineStateProvider,
  useTimelineUndo,
  useOptionalTimelineState,
} from "../contexts/TimelineStateContext";

/**
 * 🎬 STRUCTURE & BEATS SECTION
 *
 * Collapsible-Section für Project-Detail-Page mit:
 * - Dropdown/Timeline Toggle
 * - Beat-Rail (80px links)
 * - Container-Stack (Acts → Sequences → Scenes → Shots)
 * - Beats sind inline editierbar
 */

interface StructureBeatsSectionProps {
  projectId: string;
  projectType?: string;
  beatTemplate?: string | null;
  /** Project narrative_structure (incl. edit-mode draft from ProjectDetail). */
  narrativeStructure?: string | null;
  initialData?: TimelineData | BookTimelineData;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  totalWords?: number;
  targetPages?: number;
  wordsPerPage?: number;
  readingSpeedWpm?: number;
  /** Film/Series/Audio: target length in **minutes** (from project detail); drives timeline ruler & duration label. */
  targetDurationMinutes?: string | number | null;
  /** Film timeline: trim commit needs more seconds than current project duration — parent can offer to extend. */
  onProjectDurationSecondsHint?: (minSeconds: number) => void;
  // 🚀 NEW: Loading state when parent is fetching cache
  isLoadingCache?: boolean;
}

// LITE-7 Story Beat Preset (minimales Template für schnelles Prototyping)
const MOCK_BEATS: BeatCardData[] = generateBeatsFromTemplate(LITE_7_TEMPLATE);

/** Explicit beat generation only — no silent fallback to lite-7 or save-the-cat. */
const SUPPORTED_BEAT_TEMPLATE_MAP: Record<string, BeatTemplate> = {
  "lite-7": LITE_7_TEMPLATE,
  "save-the-cat": SAVE_THE_CAT_TEMPLATE,
};

// 🧪 TEST: Hook bei 5% positionieren (oben sichtbar)
const TEST_BEAT_HOOK: BeatCardData = {
  ...MOCK_BEATS[0], // Hook (0-1%)
  pctFrom: 2, // Start bei 2%
  pctTo: 8, // Ende bei 8% (6% hoch = ca. 60px bei 1000px Höhe)
};

type SearchEntryType = "act" | "sequence" | "scene" | "shot";

interface SearchEntry {
  id: string;
  type: SearchEntryType;
  title: string;
  subtitle: string;
  parentTitle?: string;
  searchBlob: string;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPlainTextFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(extractPlainTextFromUnknown).join(" ");
  if (!isRecord(value)) return "";

  if (typeof value.text === "string") {
    const nested = Array.isArray(value.content)
      ? value.content.map(extractPlainTextFromUnknown).join(" ")
      : "";
    return `${value.text} ${nested}`.trim();
  }

  return Object.values(value).map(extractPlainTextFromUnknown).join(" ");
}

function makeSearchBlob(parts: unknown[]): string {
  return normalizeSearchText(parts.map(extractPlainTextFromUnknown).join(" "));
}

function parseTargetMinutes(
  v: string | number | null | undefined,
): number | null {
  if (v == null || v === "") return null;
  const n =
    typeof v === "number" ? v : parseFloat(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * 🔄 Keyboard shortcut handler for Undo/Redo (Cmd+Z / Cmd+Shift+Z)
 * Must be INSIDE TimelineStateProvider to access the context.
 *
 * Capture phase + only stop propagation when an action runs: so if the timeline stack is
 * empty, the global undoManager (bubble on window) can still handle Cmd+Z.
 */
function TimelineUndoRedoShortcuts() {
  const { undo, redo, canUndo, canRedo } = useTimelineUndo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      const el = e.target instanceof HTMLElement ? e.target : null;
      if (
        !el?.closest(`[data-app-undo-priority="${APP_UNDO_PRIORITY_TIMELINE}"]`)
      )
        return;

      // Don't intercept when user is typing in an input/textarea
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable) return;

      if (e.shiftKey) {
        if (canRedo) {
          e.preventDefault();
          e.stopImmediatePropagation();
          redo();
        }
      } else if (canUndo) {
        e.preventDefault();
        e.stopImmediatePropagation();
        undo();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [undo, redo, canUndo, canRedo]);

  return null; // Render nothing — pure side-effect component
}

export function StructureBeatsSection({
  projectId,
  projectType,
  beatTemplate,
  narrativeStructure,
  initialData,
  onDataChange,
  totalWords,
  targetPages,
  wordsPerPage,
  readingSpeedWpm,
  targetDurationMinutes,
  onProjectDurationSecondsHint,
  isLoadingCache,
}: StructureBeatsSectionProps) {
  const containerStackRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true); // DEFAULT: OPEN
  const [structureView, setStructureView] = useState<
    "dropdown" | "timeline" | "native"
  >("dropdown");
  /** Timeline → FilmDropdown: welcher Shot aufgeklappt & gescrollt werden soll */
  const [expandShotId, setExpandShotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // 🚀 REACT QUERY: Lade Beats für dieses Projekt (mit Cache!)
  const { data: beatsData, isLoading: beatsLoading } = useBeats(projectId);
  const createBeatMutation = useCreateBeat();
  const updateBeatMutation = useUpdateBeat();
  const deleteBeatMutation = useDeleteBeat();
  const [generatingBeatsFromTemplate, setGeneratingBeatsFromTemplate] =
    useState(false);

  // 🎬 Initialize with Save the Cat 15 Beats
  const [beats, setBeats] = useState<BeatCardData[]>([]);

  const [timelineData, setTimelineData] = useState<
    TimelineData | BookTimelineData | null
  >(initialData || null);

  // 🔄 UPDATE: Sync timelineData when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log(
        "[StructureBeatsSection] 🔄 Updating timelineData from initialData:",
        initialData,
      );
      setTimelineData(initialData);
    }
  }, [initialData]);

  // 📖 Book: word/WPM-based length. 🎬 Film/Series/Audio: project "Dauer" field (minutes) → seconds for the timeline.
  const bookTimelineDuration = useMemo(() => {
    console.log("[StructureBeatsSection] 🔍 useMemo - Calculating duration:", {
      projectType,
      readingSpeedWpm,
      targetDurationMinutes,
      hasTimelineData: !!timelineData,
      hasActs: !!timelineData?.acts,
      hasSequences: !!timelineData?.sequences,
      hasScenes: !!timelineData?.scenes,
      scenesCount: timelineData?.scenes?.length || 0,
    });

    if (projectType !== "book") {
      const mins = parseTargetMinutes(targetDurationMinutes);
      if (mins != null && mins > 0) {
        const sec = Math.max(1, Math.round(mins * 60));
        console.log(
          `[StructureBeatsSection] 🎬 Film timeline duration: ${mins} min → ${sec}s`,
        );
        return sec;
      }
      console.log(
        "[StructureBeatsSection] ⚠️ No valid targetDurationMinutes — fallback 300s",
      );
      return 300;
    }

    if (
      projectType === "book" &&
      readingSpeedWpm &&
      timelineData?.acts &&
      timelineData?.sequences &&
      timelineData?.scenes
    ) {
      const DEFAULT_EMPTY_ACT_SECONDS = 300; // 5 minutes = 300 seconds

      console.log(
        "[StructureBeatsSection] 🧮 Calculating book timeline duration from SCENES:",
        {
          readingSpeedWpm,
          actsCount: timelineData.acts.length,
          sequencesCount: timelineData.sequences.length,
          scenesCount: timelineData.scenes.length,
        },
      );

      const actDurations = timelineData.acts.map((act) => {
        // 🔥 CALCULATE word count from sequences/scenes
        const actSequences = timelineData.sequences.filter(
          (seq) => seq.actId === act.id,
        );
        const actScenes = timelineData.scenes.filter((scene) =>
          actSequences.some((seq) => seq.id === scene.sequenceId),
        );

        console.log(
          `  🔍 Act "${act.title}": Found ${actSequences.length} sequences, ${actScenes.length} scenes`,
        );

        // 🚀 FIX: Calculate word count from content if wordCount is 0 or missing
        const actualWordCount = actScenes.reduce((sum, scene) => {
          const dbWordCount = scene.metadata?.wordCount || scene.wordCount || 0;
          if (dbWordCount > 0) {
            console.log(
              `    ✅ Scene "${scene.title}": Using DB wordCount = ${dbWordCount}`,
            );
            return sum + dbWordCount;
          }

          // Calculate from content (like BookDropdown does)
          const content = scene.content as any;
          if (!content?.content || !Array.isArray(content.content)) {
            console.log(
              `    ⚠️ Scene "${scene.title}": No valid content structure`,
            );
            return sum;
          }

          let sceneWords = 0;
          for (const node of content.content) {
            if (node.type === "paragraph" && node.content) {
              for (const child of node.content) {
                if (child.type === "text" && child.text) {
                  const words = child.text
                    .trim()
                    .split(/\s+/)
                    .filter((w: string) => w.length > 0);
                  sceneWords += words.length;
                }
              }
            }
          }
          console.log(
            `    📝 Scene "${scene.title}": Calculated ${sceneWords} words from content`,
          );
          return sum + sceneWords;
        }, 0);

        if (actualWordCount > 0) {
          const durationSec = (actualWordCount / readingSpeedWpm) * 60; // Convert minutes to seconds
          console.log(
            `  📊 Act "${act.title}": ${actualWordCount} words (from ${actScenes.length} scenes) / ${readingSpeedWpm} WPM = ${(actualWordCount / readingSpeedWpm).toFixed(2)} min = ${durationSec.toFixed(0)}s`,
          );
          return durationSec;
        } else {
          console.log(
            `  📊 Act "${act.title}": Empty (0 scenes with text) → ${DEFAULT_EMPTY_ACT_SECONDS}s (5 min default)`,
          );
          return DEFAULT_EMPTY_ACT_SECONDS; // 300 seconds
        }
      });

      const totalDuration = actDurations.reduce((sum, dur) => sum + dur, 0);
      console.log(
        `[StructureBeatsSection] ✅ Total duration: ${totalDuration}s (${(totalDuration / 60).toFixed(1)} min)`,
      );

      return totalDuration;
    } else {
      console.log(
        "[StructureBeatsSection] ⚠️ Using default 300s (5 min) - Book condition not met",
      );
      return 300;
    }
  }, [projectType, readingSpeedWpm, timelineData, targetDurationMinutes]);

  // 🧪 TEST: Hook bei 5% positionieren (oben sichtbar)
  const TEST_BEAT_HOOK: BeatCardData = {
    ...MOCK_BEATS[0], // Hook (0-1%)
    pctFrom: 2, // Start bei 2%
    pctTo: 8, // Ende bei 8% (6% hoch = ca. 60px bei 1000px Höhe)
  };

  const handleUpdateBeat = (beatId: string, updates: Partial<BeatCardData>) => {
    setBeats((prev) =>
      prev.map((beat) => (beat.id === beatId ? { ...beat, ...updates } : beat)),
    );
  };

  const handleDeleteBeat = (beatId: string) => {
    setBeats((prev) => prev.filter((beat) => beat.id !== beatId));
  };

  const handleTimelineChange = (data: TimelineData | BookTimelineData) => {
    setTimelineData(data);
    if (onDataChange) {
      onDataChange(data);
    }
  };

  // 🎯 Convert FilmDropdown TimelineData to BeatCard TimelineNode format
  const convertToTimelineNodes = (
    data: TimelineData | null,
  ): TimelineNode[] => {
    if (!data || !data.acts || !Array.isArray(data.acts)) return [];

    // Build hierarchical structure from flat arrays
    const { acts, sequences, scenes, shots: shotsRaw } = data;
    const shots = shotsRaw ?? [];

    // 🔍 DEBUG: Log shots data
    console.log("[StructureBeatsSection] Converting timeline data:", {
      acts: acts.length,
      sequences: sequences?.length || 0,
      scenes: scenes?.length || 0,
      shots: shots?.length || 0,
      allShots: shots,
    });

    return acts.map((act) => ({
      id: act.id,
      title: act.title ?? "",
      sequences:
        sequences
          ?.filter((seq) => seq.actId === act.id)
          .map((seq) => ({
            id: seq.id,
            title: seq.title ?? "",
            scenes:
              scenes
                ?.filter((scene) => scene.sequenceId === seq.id)
                .map((scene) => {
                  const sceneShots =
                    shots?.filter((shot) => shot.sceneId === scene.id) || [];
                  console.log(
                    `[StructureBeatsSection] Scene "${scene.title}" (${scene.id}) has ${sceneShots.length} shots:`,
                    sceneShots,
                  );

                  return {
                    id: scene.id,
                    title: scene.title,
                    shots: sceneShots.map((shot) => ({
                      id: shot.id,
                      title:
                        shot.shotNumber || shot.description || "Untitled Shot",
                    })),
                  };
                }) || [],
          })) || [],
    }));
  };

  const timelineNodes = convertToTimelineNodes(timelineData);

  const searchEntries = useMemo<SearchEntry[]>(() => {
    if (!timelineData) return [];
    const out: SearchEntry[] = [];
    const acts = timelineData.acts || [];
    const sequences = timelineData.sequences || [];
    const scenes = timelineData.scenes || [];
    const shotsRaw =
      "shots" in timelineData
        ? (timelineData as TimelineData).shots
        : undefined;
    const shots = Array.isArray(shotsRaw) ? shotsRaw : [];

    const actById = new Map(acts.map((a) => [a.id, a]));
    const sequenceById = new Map(sequences.map((s) => [s.id, s]));

    for (const act of acts) {
      out.push({
        id: act.id,
        type: "act",
        title: act.title || "Akt",
        subtitle: "Akt",
        searchBlob: makeSearchBlob([
          act.title,
          act.description,
          act.summary,
          act.metadata,
        ]),
      });
    }

    for (const seq of sequences) {
      const parentAct = actById.get(seq.actId);
      out.push({
        id: seq.id,
        type: "sequence",
        title: seq.title || "Sequenz",
        subtitle: projectType === "book" ? "Kapitel" : "Sequenz",
        parentTitle: parentAct?.title,
        searchBlob: makeSearchBlob([
          seq.title,
          seq.description,
          seq.summary,
          seq.metadata,
          parentAct?.title,
        ]),
      });
    }

    for (const scene of scenes) {
      const parentSeq =
        scene.sequenceId != null
          ? sequenceById.get(scene.sequenceId)
          : undefined;
      out.push({
        id: scene.id,
        type: "scene",
        title: scene.title || (projectType === "book" ? "Abschnitt" : "Szene"),
        subtitle: projectType === "book" ? "Abschnitt" : "Szene",
        parentTitle: parentSeq?.title,
        searchBlob: makeSearchBlob([
          scene.title,
          scene.description,
          scene.summary,
          scene.content,
          scene.metadata,
          parentSeq?.title,
        ]),
      });
    }

    for (const shot of shots) {
      const parentScene = scenes.find((s) => s.id === shot.sceneId);
      out.push({
        id: shot.id,
        type: "shot",
        title: shot.shotNumber || shot.description || "Shot",
        subtitle: "Shot",
        parentTitle: parentScene?.title,
        searchBlob: makeSearchBlob([
          shot.shotNumber,
          shot.description,
          shot.dialog,
          shot.notes,
          shot.soundNotes,
          shot.composition,
          shot.lightingNotes,
          shot.cameraAngle,
          shot.cameraMovement,
          shot.framing,
          shot.lens,
          parentScene?.title,
        ]),
      });
    }

    return out;
  }, [timelineData, projectType]);

  const searchResults = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q) return [];
    const terms = q.split(" ").filter(Boolean);
    if (terms.length === 0) return [];

    return searchEntries
      .filter((entry) => terms.every((term) => entry.searchBlob.includes(term)))
      .sort((a, b) => {
        const aTitle = normalizeSearchText(a.title);
        const bTitle = normalizeSearchText(b.title);
        const aStarts = terms.some((t) => aTitle.startsWith(t));
        const bStarts = terms.some((t) => bTitle.startsWith(t));
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.title.localeCompare(b.title, "de");
      })
      .slice(0, 30);
  }, [searchEntries, searchQuery]);

  useEffect(() => {
    if (
      selectedSearchIndex > 0 &&
      selectedSearchIndex >= searchResults.length
    ) {
      setSelectedSearchIndex(0);
    }
  }, [selectedSearchIndex, searchResults.length]);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!searchContainerRef.current || !t) return;
      if (!searchContainerRef.current.contains(t)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const openSearchHit = (entry: SearchEntry) => {
    setStructureView("dropdown");
    setSearchOpen(false);
    if (entry.type === "shot") {
      setExpandShotId(entry.id);
      toast.message(`Treffer geöffnet: ${entry.title}`);
      return;
    }
    toast.message(`Treffer in Struktur: ${entry.title}`);
  };

  const onSearchKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen && (ev.key === "ArrowDown" || ev.key === "Enter")) {
      setSearchOpen(true);
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setSelectedSearchIndex((prev) =>
        Math.min(prev + 1, Math.max(searchResults.length - 1, 0)),
      );
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setSelectedSearchIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (ev.key === "Enter") {
      if (searchResults.length > 0) {
        ev.preventDefault();
        openSearchHit(searchResults[selectedSearchIndex] || searchResults[0]);
      }
      return;
    }
    if (ev.key === "Escape") {
      setSearchOpen(false);
    }
  };

  // 🎬 Sync beats from React Query data
  useEffect(() => {
    if (beatsData && !beatsLoading) {
      console.log(
        "[StructureBeatsSection] 📊 Syncing beats from React Query:",
        beatsData,
      );

      // Convert API beats to BeatCardData format
      const convertedBeats: BeatCardData[] = beatsData.map((beat) => ({
        id: beat.id,
        label: beat.label,
        pctFrom: beat.pct_from,
        pctTo: beat.pct_to,
        color: beat.color,
        description: beat.description,
        notes: beat.notes,
        templateAbbr: beat.template_abbr,
      }));

      setBeats(convertedBeats);
    }
  }, [beatsData, beatsLoading]);

  const handleGenerateBeatsFromTemplate = useCallback(async () => {
    if (beatsLoading || generatingBeatsFromTemplate) return;
    if (beatsData && beatsData.length > 0) return;

    const key = beatTemplate?.trim();
    if (!key || key.startsWith("custom:")) {
      toast.error(
        "Bitte ein unterstütztes Beat-Template in den Projekteinstellungen wählen.",
      );
      return;
    }
    const selectedTemplate = SUPPORTED_BEAT_TEMPLATE_MAP[key];
    if (!selectedTemplate) {
      toast.error(
        `Das Beat-Template „${key}“ wird für die automatische Erzeugung noch nicht unterstützt.`,
      );
      return;
    }

    try {
      setGeneratingBeatsFromTemplate(true);
      let firstActId = "placeholder-act-1";
      let lastActId = "placeholder-act-3";
      try {
        const acts = await TimelineAPI.getActs(projectId);
        if (acts.length > 0) {
          firstActId = acts[0].id;
          lastActId = acts[acts.length - 1].id;
        }
      } catch {
        /* keep placeholders */
      }

      const generatedBeats = generateBeatsFromTemplate(selectedTemplate);
      let successCount = 0;
      for (let i = 0; i < generatedBeats.length; i++) {
        const beat = generatedBeats[i];
        try {
          await createBeatMutation.mutateAsync({
            project_id: projectId,
            label: beat.label,
            template_abbr:
              beat.templateAbbr || key.toUpperCase().replace("-", ""),
            description: beat.items?.join(", ") || "",
            from_container_id: firstActId,
            to_container_id: lastActId,
            pct_from: beat.pctFrom,
            pct_to: beat.pctTo === beat.pctFrom ? beat.pctFrom + 2 : beat.pctTo,
            color: beat.color,
            order_index: i,
          });
          successCount += 1;
        } catch (error) {
          console.error(
            `[StructureBeatsSection] Failed to create beat "${beat.label}":`,
            error,
          );
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount} Story Beats erzeugt`);
      } else {
        toast.error("Keine Beats konnten angelegt werden.");
      }
    } catch (error) {
      console.error("[StructureBeatsSection] generate beats:", error);
      toast.error("Fehler beim Generieren der Beats");
    } finally {
      setGeneratingBeatsFromTemplate(false);
    }
  }, [
    beatTemplate,
    beatsData,
    beatsLoading,
    createBeatMutation,
    generatingBeatsFromTemplate,
    projectId,
  ]);

  // 🔄 Prepare initialData for TimelineStateProvider
  const providerInitialData = useMemo(() => {
    if (!timelineData) return undefined;
    const base = {
      acts: timelineData.acts || [],
      sequences: timelineData.sequences || [],
      scenes: timelineData.scenes || [],
    };
    // Film/Series have shots; Book does not
    if ("shots" in timelineData) {
      const film = timelineData as TimelineData;
      return {
        ...base,
        shots: film.shots || [],
        clips: film.clips ?? [],
      };
    }
    return base;
  }, [timelineData]);

  return (
    <TimelineStateProvider
      initialData={providerInitialData}
      onDataChange={handleTimelineChange}
    >
      <div
        data-app-undo-priority={APP_UNDO_PRIORITY_TIMELINE}
        className="contents"
      >
        <TimelineUndoRedoShortcuts />
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#6E59A5] text-white h-8 flex items-center">
                Structure & Beats
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <div className="flex items-center gap-3">
              <div
                ref={searchContainerRef}
                className="relative w-[360px] max-w-[42vw]"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(ev) => {
                      setSearchQuery(ev.target.value);
                      setSearchOpen(true);
                      setSelectedSearchIndex(0);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="In Projekt Suche"
                    className="h-9 w-full rounded-md border border-input bg-background pl-10 pr-8 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Suche leeren"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute right-0 mt-1 w-full rounded-md border bg-popover shadow-md z-20 max-h-80 overflow-auto">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Keine Treffer
                      </div>
                    ) : (
                      searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => openSearchHit(result)}
                          className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-accent hover:text-accent-foreground ${
                            selectedSearchIndex === index
                              ? "bg-accent text-accent-foreground"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">
                              {result.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                              {result.subtitle}
                            </span>
                          </div>
                          {result.parentTitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              In: {result.parentTitle}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <ScriptStructureImportButton
                projectId={projectId}
                projectType={projectType}
                onImported={handleTimelineChange}
                enabled={!!projectType && (!isLoadingCache || !!initialData)}
              />
              {/* View Toggle */}
              <Tabs
                value={structureView}
                onValueChange={(v) => setStructureView(v as any)}
              >
                <TabsList className="h-9">
                  <TabsTrigger
                    value="dropdown"
                    className="text-xs md:text-sm px-2 md:px-3"
                  >
                    Dropdown
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="text-xs md:text-sm px-2 md:px-3"
                  >
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger
                    value="native"
                    className="text-xs md:text-sm px-2 md:px-3"
                  >
                    Native
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Content */}
          <CollapsibleContent>
            <div
              className="flex flex-col border border-border rounded-lg overflow-hidden bg-background"
              style={{
                height: structureView === "timeline" ? "600px" : "auto",
              }}
            >
              {!beatsLoading && (!beatsData || beatsData.length === 0) && (
                <div className="shrink-0 border-b border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground space-y-2">
                  {beatTemplate?.trim() &&
                  SUPPORTED_BEAT_TEMPLATE_MAP[beatTemplate.trim()] ? (
                    <>
                      <p>
                        Keine Story Beats angelegt. Du kannst Beats aus dem
                        gewählten Template erzeugen.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={generatingBeatsFromTemplate}
                        onClick={() => void handleGenerateBeatsFromTemplate()}
                      >
                        {generatingBeatsFromTemplate
                          ? "Wird erzeugt…"
                          : "Beats aus Template erzeugen"}
                      </Button>
                    </>
                  ) : beatTemplate?.trim()?.startsWith("custom:") ? (
                    <p>
                      Custom Beat-Template: automatische Erzeugung ist hier noch
                      nicht angebunden.
                    </p>
                  ) : beatTemplate?.trim() ? (
                    <p>
                      Beat-Template „{beatTemplate}“ wird für die automatische
                      Erzeugung noch nicht unterstützt. Unterstützt: lite-7,
                      save-the-cat.
                    </p>
                  ) : (
                    <p>
                      Kein Beat-Template gewählt. Lege in den
                      Projekteinstellungen ein Template fest, um hier Beats
                      erzeugen zu können.
                    </p>
                  )}
                </div>
              )}
              {/* Container Stack - Dynamic Dropdown based on projectType */}
              <div className="flex-1 min-h-0 overflow-y-auto h-full">
                {/* Never block Film/Book dropdown: they must mount to load from API if parent cache is empty. */}
                {structureView === "dropdown" ? (
                  <>
                    {isLoadingCache && !initialData ? (
                      <div className="flex items-center gap-2 border-b border-border/50 px-2 py-1.5 text-xs text-muted-foreground">
                        <span className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-[#6E59A5] border-t-transparent" />
                        Timeline wird geladen…
                      </div>
                    ) : null}
                    {isLoadingCache && initialData ? (
                      <div className="border-b border-border/50 px-2 py-1.5 text-xs text-muted-foreground">
                        Timeline wird aktualisiert…
                      </div>
                    ) : null}
                    <ProjectDropdown
                      projectId={projectId}
                      projectType={projectType}
                      initialData={(timelineData ?? initialData) as never}
                      onDataChange={
                        handleTimelineChange as (data: unknown) => void
                      }
                      containerRef={containerStackRef}
                      expandShotId={expandShotId}
                      onExpandShotIdConsumed={() => setExpandShotId(null)}
                      narrativeStructure={narrativeStructure}
                    />
                  </>
                ) : structureView === "timeline" ? (
                  <VideoEditorTimeline
                    projectId={projectId}
                    projectType={projectType}
                    initialData={timelineData}
                    onDataChange={handleTimelineChange}
                    duration={bookTimelineDuration}
                    beats={beats}
                    totalWords={totalWords}
                    wordsPerPage={wordsPerPage}
                    targetPages={targetPages}
                    readingSpeedWpm={readingSpeedWpm}
                    onOpenShotInStructureTree={(shotId) => {
                      setExpandShotId(shotId);
                      setStructureView("dropdown");
                    }}
                    onProjectDurationSecondsHint={onProjectDurationSecondsHint}
                  />
                ) : structureView === "native" ? (
                  projectType === "book" ? (
                    <NativeBookView
                      key={`native-book-${projectId}-${structureView}`}
                      projectId={projectId}
                      projectType={projectType}
                      initialData={initialData}
                    />
                  ) : projectType === "film" || projectType === "series" ? (
                    <NativeScreenplayView
                      key={`native-screenplay-${projectId}-${structureView}`}
                      projectId={projectId}
                      projectType={projectType}
                      initialData={initialData}
                    />
                  ) : projectType === "audio" ? (
                    <NativeAudiobookView
                      key={`native-audiobook-${projectId}-${structureView}`}
                      projectId={projectId}
                      projectType={projectType}
                      initialData={initialData}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Native View für diesen Projekttyp noch nicht verfügbar
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TimelineStateProvider>
  );
}
