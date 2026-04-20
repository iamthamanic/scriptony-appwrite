import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BeatDefinition } from "./BeatRail";
import type { ContainerData } from "./ContainerCard";

/**
 * 🎵 BEAT BAND (Einzelner Beat mit Collapsible Edit-Form)
 *
 * Klickbar → expandiert → zeigt Edit-Felder:
 * - Template & Label
 * - Start Container (Dropdown)
 * - End Container (Dropdown)
 * - Percentage Range (Inputs)
 */

interface BeatBandProps {
  beat: BeatDefinition;
  containers: ContainerData[];
  onUpdate: (beatId: string, updates: Partial<BeatDefinition>) => void;
  style?: React.CSSProperties;
}

export function BeatBand({ beat, containers, onUpdate, style }: BeatBandProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Flatten all containers for selection
  const allContainerIds = flattenContainerIds(containers);

  return (
    <div
      id={`beat-band-${beat.id}`}
      className={`absolute left-0 right-0 transition-all duration-200 overflow-visible group ${
        isExpanded
          ? "bg-primary/50 border-l-4 border-primary shadow-lg z-20"
          : "bg-primary/20 border-l-4 border-primary hover:bg-primary/30 cursor-pointer"
      }`}
      style={style}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <>
          {/* Template Badge */}
          <div className="absolute top-1 left-1">
            <Badge
              variant="outline"
              className="text-xs h-5 px-1.5 bg-primary/90 text-primary-foreground border-primary"
            >
              {beat.templateAbbr}
            </Badge>
          </div>

          {/* Beat Label (rotated) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 origin-center">
            <div className="whitespace-nowrap text-xs font-medium text-primary transform -rotate-90">
              {beat.label}
            </div>
          </div>

          {/* Percentage Range */}
          <div className="absolute bottom-1 left-1 right-1">
            <div className="text-xs text-muted-foreground bg-background/80 rounded px-1 text-center">
              {beat.pctFrom}-{beat.pctTo}%
            </div>
          </div>

          {/* Tooltip on Hover */}
          <div className="absolute left-full ml-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {beat.templateAbbr}
                  </Badge>
                  <span className="font-medium">{beat.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {beat.pctFrom}% - {beat.pctTo}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {beat.fromContainerId} → {beat.toContainerId}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Expanded View - Edit Form */}
      {isExpanded && (
        <div className="absolute left-0 top-0 bottom-0 p-3 space-y-3 bg-background/95 backdrop-blur-sm rounded-r-lg border border-border shadow-xl min-w-[320px] z-30">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <ChevronDown className="size-4" />
              </Button>

              <Badge
                variant="outline"
                className="shrink-0 bg-primary/10 text-primary border-primary/30"
              >
                {beat.templateAbbr}
              </Badge>

              <span className="font-medium truncate">{beat.label}</span>
            </div>
          </div>

          <Separator />

          {/* Start Container */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Start Container
            </Label>
            <Select
              value={beat.fromContainerId}
              onValueChange={(value) => {
                onUpdate(beat.id, { fromContainerId: value });
              }}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allContainerIds.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">
              {beat.fromContainerId}
            </div>
          </div>

          <Separator />

          {/* End Container */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              End Container
            </Label>
            <Select
              value={beat.toContainerId}
              onValueChange={(value) => {
                onUpdate(beat.id, { toContainerId: value });
              }}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allContainerIds.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">
              {beat.toContainerId}
            </div>
          </div>

          <Separator />

          {/* Percentage Range */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Percentage Range
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={beat.pctFrom}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onUpdate(beat.id, {
                    pctFrom: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="number"
                min="0"
                max="100"
                value={beat.pctTo}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onUpdate(beat.id, {
                    pctTo: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <strong>Tipp:</strong> Container ändern → Beat-Band passt sich
            automatisch an
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Flatten nested containers into a flat list with hierarchical labels
 */
function flattenContainerIds(
  containers: ContainerData[],
  prefix = "",
): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];

  for (const container of containers) {
    const label = prefix ? `${prefix} → ${container.title}` : container.title;
    result.push({ id: container.id, label });

    if (container.children) {
      result.push(...flattenContainerIds(container.children, label));
    }
  }

  return result;
}
