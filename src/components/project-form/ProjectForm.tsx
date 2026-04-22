/**
 * ProjectForm - DRY: Unified form for Create and Edit Project
 *
 * Used by:
 * - CreateProjectDialog (new projects)
 * - EditProjectDialog (existing projects)
 *
 * Features:
 * - All project fields with consistent tooltips
 * - Conditional Series fields (Episode Layout, Season Engine)
 * - World linking
 * - Concept blocks (Premise, Theme, Hook, Notes)
 * - Inspirations
 */

import { useId, useRef } from "react";
import { Film, Tv, Book, Headphones, Building2, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProjectFieldTooltipIcon } from "@/components/ProjectFieldLabel";
import type { World } from "@/lib/types";

// =============================================================================
// Types
// =============================================================================

export type ProjectType =
  | "film"
  | "series"
  | "book"
  | "audio"
  | "theater"
  | "docu";

export interface ProjectFormData {
  title: string;
  type: ProjectType;
  logline: string;
  narrativeStructure: string;
  beatTemplate: string;
  episodeLayout: string; // Series only
  seasonEngine: string; // Series only
  linkedWorldId: string;
  duration: { hours: string; minutes: string }; // Film/Series/Audio
  targetPages: string; // Book only
  wordsPerPage: string; // Book only
  inspirations: string[];
  conceptBlocks: ConceptBlock[];
}

export interface ConceptBlock {
  type: "premise" | "theme" | "hook" | "notes";
  content: string;
}

interface ProjectFormProps {
  /** Current form data */
  data: ProjectFormData;
  /** Callback when any field changes */
  onChange: (updates: Partial<ProjectFormData>) => void;
  /** Available worlds for linking */
  worlds?: World[];
  /** Whether this is for creating a new project (vs editing) */
  isCreating?: boolean;
  /** Optional file import for scripts (create only) */
  onScriptImport?: (file: File | null) => void;
  /** Current script import file (create only) */
  scriptImportFile?: File | null;
}

// =============================================================================
// Icons & Helpers
// =============================================================================

const ProjectTypeIcons: Record<ProjectType, typeof Film> = {
  film: Film,
  series: Tv,
  book: Book,
  audio: Headphones,
  theater: Building2,
  docu: Mic,
};

function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    film: "Film",
    series: "Serie",
    book: "Buch",
    audio: "Hörspiel",
    theater: "Theater",
    docu: "Dokumentation",
  };
  return labels[type] || type;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectForm({
  data,
  onChange,
  worlds = [],
  isCreating = false,
  onScriptImport,
  scriptImportFile,
}: ProjectFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const durationId = useId();
  const isBook = data.type === "book";
  const isSeries = data.type === "series";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getConceptContent = (type: ConceptBlock["type"]): string => {
    return data.conceptBlocks.find((b) => b.type === type)?.content || "";
  };

  const setConceptContent = (type: ConceptBlock["type"], content: string) => {
    const updated = [...data.conceptBlocks];
    const existing = updated.find((b) => b.type === type);
    if (existing) {
      existing.content = content;
    } else {
      updated.push({ type, content });
    }
    onChange({ conceptBlocks: updated });
  };

  const addInspiration = () => {
    onChange({ inspirations: [...data.inspirations, ""] });
  };

  const updateInspiration = (index: number, value: string) => {
    const updated = [...data.inspirations];
    updated[index] = value;
    onChange({ inspirations: updated });
  };

  const removeInspiration = (index: number) => {
    const updated = data.inspirations.filter((_, i) => i !== index);
    onChange({ inspirations: updated });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5 py-4">
      {/* Title & Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="project-title"
            label="Project Title"
            field="projectType"
          />
          <Input
            id="project-title"
            placeholder="Enter project title"
            className="h-11"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="project-type"
            label="Project Type"
            field="projectType"
          />
          <Select
            value={data.type}
            onValueChange={(value) => onChange({ type: value as ProjectType })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="film">Film</SelectItem>
              <SelectItem value="series">Serie</SelectItem>
              <SelectItem value="book">Buch</SelectItem>
              <SelectItem value="audio">Hörspiel</SelectItem>
              <SelectItem value="theater">Theater</SelectItem>
              <SelectItem value="docu">Dokumentation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Script Import (Create only) */}
      {isCreating && onScriptImport && (
        <div className="space-y-2">
          <Label htmlFor="script-import">Skript-Struktur (optional)</Label>
          <input
            id="script-import"
            ref={fileInputRef}
            type="file"
            accept=".txt,.fountain,.md,.docx,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = "";
              onScriptImport(f);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => fileInputRef.current?.click()}
            >
              Datei wählen
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {scriptImportFile ? scriptImportFile.name : "Keine Datei"}
            </span>
            {scriptImportFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11"
                onClick={() => onScriptImport(null)}
              >
                Entfernen
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            .txt, .fountain, .md, .docx, .pdf imports
          </p>
        </div>
      )}

      {/* Logline */}
      <div className="space-y-2">
        <LabelWithTooltip htmlFor="logline" label="Logline" field="logline" />
        <Textarea
          id="logline"
          placeholder="Eine Junge entdeckt, dass sie..."
          value={data.logline}
          onChange={(e) => onChange({ logline: e.target.value })}
          rows={2}
        />
      </div>

      {/* Narrative Structure & Beat Template */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="narrative-structure"
            label="Narrative Structure"
            field="narrativeStructure"
          />
          <Select
            value={data.narrativeStructure}
            onValueChange={(value) => onChange({ narrativeStructure: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Wählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">Feature (~90 min)</SelectItem>
              <SelectItem value="short">Short (~15 min)</SelectItem>
              <SelectItem value="pilot">Pilot (Series)</SelectItem>
              <SelectItem value="mini">Mini-Series</SelectItem>
              <SelectItem value="anthology">Anthology</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="beat-template"
            label="Story Beat Template"
            field="beatTemplate"
          />
          <Select
            value={data.beatTemplate}
            onValueChange={(value) => onChange({ beatTemplate: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Wählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="save-the-cat">Save the Cat</SelectItem>
              <SelectItem value="heros-journey">Hero's Journey</SelectItem>
              <SelectItem value="3-act">3-Act Structure</SelectItem>
              <SelectItem value="4-act">4-Act Structure</SelectItem>
              <SelectItem value="5-act">5-Act Structure</SelectItem>
              <SelectItem value="7-point">Seven Point Structure</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Series-specific fields */}
      {isSeries && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="episode-layout">Episode Layout</Label>
            <Select
              value={data.episodeLayout}
              onValueChange={(value) => onChange({ episodeLayout: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Keine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sitcom-2-act">Sitcom 2-Akt</SelectItem>
                <SelectItem value="sitcom-4-act">Sitcom 4-Akt</SelectItem>
                <SelectItem value="network-5-act">Network 5-Akt</SelectItem>
                <SelectItem value="streaming-3-act">Streaming 3-Akt</SelectItem>
                <SelectItem value="streaming-4-act">Streaming 4-Akt</SelectItem>
                <SelectItem value="anime-ab">Anime A/B</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="season-engine">Season Engine</Label>
            <Select
              value={data.seasonEngine}
              onValueChange={(value) => onChange({ seasonEngine: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Keine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="case-of-the-week">Fall der Woche</SelectItem>
                <SelectItem value="serial">Serial (Durchlaufend)</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="anthology">Anthology</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Linked World */}
      <div className="space-y-2">
        <LabelWithTooltip
          htmlFor="linked-world"
          label="Welt verknüpfen"
          field="linkedWorld"
        />
        <Select
          value={data.linkedWorldId}
          onValueChange={(value) => onChange({ linkedWorldId: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Keine Welt ausgewählt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Keine Welt</SelectItem>
            {worlds.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration (non-books) or Page Target (books) */}
      {isBook ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="target-pages"
              label="Zielumfang"
              field="durationBook"
            />
            <Input
              id="target-pages"
              type="number"
              placeholder="300"
              value={data.targetPages}
              onChange={(e) => onChange({ targetPages: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="words-per-page">Wörter/Seite</Label>
            <Input
              id="words-per-page"
              type="number"
              placeholder="250"
              value={data.wordsPerPage}
              onChange={(e) => onChange({ wordsPerPage: e.target.value })}
              className="h-11"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor={`${durationId}-hours`}
            label="Dauer"
            field="duration"
          />
          <div className="flex items-center gap-3">
            <Input
              id={`${durationId}-hours`}
              type="number"
              placeholder="1"
              value={data.duration.hours}
              onChange={(e) =>
                onChange({
                  duration: { ...data.duration, hours: e.target.value },
                })
              }
              className="h-11 w-20"
            />
            <span className="text-sm text-muted-foreground">Std</span>
            <Input
              type="number"
              placeholder="30"
              value={data.duration.minutes}
              onChange={(e) =>
                onChange({
                  duration: { ...data.duration, minutes: e.target.value },
                })
              }
              className="h-11 w-20"
            />
            <span className="text-sm text-muted-foreground">Min</span>
          </div>
        </div>
      )}

      {/* Inspirations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LabelWithTooltip label="Inspirations" field="inspirations" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInspiration}
          >
            + Hinzufügen
          </Button>
        </div>
        <div className="space-y-2">
          {data.inspirations.map((inspiration, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={inspiration}
                onChange={(e) => updateInspiration(i, e.target.value)}
                placeholder={`Inspiration ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInspiration(i)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Concept Blocks: Premise, Theme, Hook, Notes */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-1">
          <h4 className="text-sm font-semibold">Konzept</h4>
          <ProjectFieldTooltipIcon field="premise" tooltipSide="top" />
        </div>

        <ConceptField
          type="premise"
          label="Prämisse"
          value={getConceptContent("premise")}
          onChange={(v) => setConceptContent("premise", v)}
          rows={3}
          placeholder="Eine Therapeutin für Götter muss..."
        />

        <div className="grid grid-cols-2 gap-3">
          <ConceptField
            type="theme"
            label="Thema"
            value={getConceptContent("theme")}
            onChange={(v) => setConceptContent("theme", v)}
            rows={2}
            placeholder="Verantwortung vs. Macht"
          />
          <ConceptField
            type="hook"
            label="Hook"
            value={getConceptContent("hook")}
            onChange={(v) => setConceptContent("hook", v)}
            rows={2}
            placeholder="Ein Vampir, der Blut hassst..."
          />
        </div>

        <ConceptField
          type="notes"
          label="Notizen"
          value={getConceptContent("notes")}
          onChange={(v) => setConceptContent("notes", v)}
          rows={3}
          placeholder="Weitere Gedanken, Ideen..."
        />
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface LabelWithTooltipProps {
  htmlFor?: string;
  label: string;
  field:
    | "projectType"
    | "narrativeStructure"
    | "beatTemplate"
    | "linkedWorld"
    | "logline"
    | "duration"
    | "durationBook"
    | "inspirations";
}

function LabelWithTooltip({ htmlFor, label, field }: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      <ProjectFieldTooltipIcon field={field} tooltipSide="top" />
    </div>
  );
}

interface ConceptFieldProps {
  type: ConceptBlock["type"];
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

function ConceptField({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: ConceptFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
}

// Re-export for convenience
export { ProjectFieldTooltipIcon } from "@/components/ProjectFieldLabel";
