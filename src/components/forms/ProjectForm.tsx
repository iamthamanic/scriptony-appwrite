/**
 * ProjectForm - Unified form for Create and Edit Project
 * DRY: Single component handles both create and edit modes
 */

import { useId } from "react";
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
import type { ProjectTooltipField } from "@/hooks/useProjectTooltips";

export type ProjectType = "film" | "series" | "book" | "audio" | "theater" | "docu";

export interface ProjectFormData {
  title: string;
  type: ProjectType;
  logline: string;
  narrativeStructure: string;
  beatTemplate: string;
  linkedWorldId: string;
  duration: { hours: string; minutes: string };
  inspirations: string[];
  // Series only
  episodeLayout?: string;
  seasonEngine?: string;
}

export interface ProjectFormProps {
  data: ProjectFormData;
  onChange: (data: Partial<ProjectFormData>) => void;
  worlds: Array<{ id: string; name: string }>;
  isSeries: boolean;
}

export function ProjectForm({ data, onChange, worlds, isSeries }: ProjectFormProps) {
  const durationId = useId();

  const labelWithTooltip = (label: string, field: ProjectTooltipField, htmlFor?: string) => (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      <ProjectFieldTooltipIcon field={field} tooltipSide="top" />
    </div>
  );

  return (
    <div className="space-y-5 py-4">
      {/* Title & Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {labelWithTooltip("Project Title", "projectType", "project-title")}
          <Input
            id="project-title"
            placeholder="Enter project title"
            className="h-11"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          {labelWithTooltip("Project Type", "projectType", "project-type")}
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

      {/* Logline */}
      <div className="space-y-2">
        {labelWithTooltip("Logline", "logline", "logline")}
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
          {labelWithTooltip("Narrative Structure", "narrativeStructure", "narrative-structure")}
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
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {labelWithTooltip("Story Beat Template", "beatTemplate", "beat-template")}
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
              value={data.episodeLayout || ""}
              onValueChange={(value) => onChange({ episodeLayout: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sitcom-2-act">Sitcom 2-Akt</SelectItem>
                <SelectItem value="streaming-3-act">Streaming 3-Akt</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="season-engine">Season Engine</Label>
            <Select
              value={data.seasonEngine || ""}
              onValueChange={(value) => onChange({ seasonEngine: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="case-of-the-week">Fall der Woche</SelectItem>
                <SelectItem value="serial">Serial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Linked World */}
      <div className="space-y-2">
        {labelWithTooltip("Welt verknüpfen", "linkedWorld", "linked-world")}
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

      {/* Duration */}
      <div className="space-y-2">
        {labelWithTooltip("Dauer", "duration", `duration-${durationId}`)}
        <div className="flex items-center gap-3">
          <Input
            id={`duration-${durationId}`}
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

      {/* Inspirations */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label>Inspirations</Label>
          <ProjectFieldTooltipIcon field="inspirations" tooltipSide="top" />
        </div>
        <div className="space-y-2">
          {data.inspirations.map((inspiration, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={inspiration}
                onChange={(e) => {
                  const updated = [...data.inspirations];
                  updated[i] = e.target.value;
                  onChange({ inspirations: updated });
                }}
                placeholder={`Inspiration ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updated = data.inspirations.filter((_, idx) => idx !== i);
                  onChange({ inspirations: updated });
                }}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ inspirations: [...data.inspirations, ""] })}
        >
          + Hinzufügen
        </Button>
      </div>
    </div>
  );
}
