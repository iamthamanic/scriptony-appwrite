import { useState } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * 📦 CONTAINER CARD
 *
 * Collapsible Card für Acts/Sequences/Scenes/Shots.
 * Hat `data-container-id` Attribut für Beat-Band Positionierung.
 */

export interface ContainerData {
  id: string; // "A1", "A1S2", "A1S2SC3", "A1S2SC3SH4"
  type: "act" | "sequence" | "scene" | "shot";
  number: number;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  children?: ContainerData[];
  beatChips?: string[]; // Beat abbreviations (e.g., ["STC:Hook", "STC:Setup"])
}

interface ContainerCardProps {
  container: ContainerData;
  level: number; // 0 = Act, 1 = Sequence, 2 = Scene, 3 = Shot
  defaultExpanded?: boolean;
}

export function ContainerCard({
  container,
  level,
  defaultExpanded = false,
}: ContainerCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasChildren = container.children && container.children.length > 0;

  // Indentation based on level
  const paddingLeft = level * 16;

  // Icons based on type
  const typeIcons = {
    act: "🎬",
    sequence: "📽️",
    scene: "🎥",
    shot: "📸",
  };

  // Colors based on type
  const typeColors = {
    act: "bg-primary/10 border-primary/30",
    sequence: "bg-primary/5 border-primary/20",
    scene: "bg-muted/50 border-border",
    shot: "bg-background border-border",
  };

  return (
    <div
      data-container-id={container.id}
      className="transition-all duration-200"
    >
      <Card
        className={`${typeColors[container.type]} mb-2`}
        style={{ marginLeft: `${paddingLeft}px` }}
      >
        <CardHeader
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            )}

            {/* Icon */}
            <span className="text-lg shrink-0">
              {container.icon || typeIcons[container.type]}
            </span>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{container.title}</span>

                {/* Beat Chips */}
                {container.beatChips && container.beatChips.length > 0 && (
                  <div className="flex gap-1">
                    {container.beatChips.map((chip, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs h-5 px-1.5 bg-primary/10 text-primary border-primary/30"
                      >
                        {chip}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {container.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {container.description}
                </p>
              )}
            </div>

            {/* Container ID Badge */}
            <Badge variant="outline" className="text-xs shrink-0">
              {container.id}
            </Badge>
          </div>
        </CardHeader>

        {/* Children */}
        {hasChildren && isExpanded && (
          <CardContent className="p-2 pt-0 space-y-0">
            {container.children!.map((child, idx) => (
              <ContainerCard
                key={child.id}
                container={child}
                level={level + 1}
                defaultExpanded={level < 1} // Auto-expand first 2 levels
              />
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
