/**
 * 🚀 OPTIMIZED DROPDOWN COMPONENTS
 *
 * Memoized subcomponents for FilmDropdown and BookDropdown
 * These prevent unnecessary re-renders and improve performance dramatically
 */

import React, { memo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "./ui/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { Act, Sequence, Scene } from "../lib/types";

// =====================================================
// MEMOIZED ACT HEADER
// =====================================================

interface ActHeaderProps {
  act: Act;
  isExpanded: boolean;
  isEditing: boolean;
  isPending: boolean;
  editValue: string;
  onToggle: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStats: () => void;
  onChange: (value: string) => void;
}

export const MemoizedActHeader = memo(function ActHeader({
  act,
  isExpanded,
  isEditing,
  isPending,
  editValue,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onStats,
  onChange,
}: ActHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors">
      {/* Expand/Collapse */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggle}
        disabled={isPending}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Title (Editable) */}
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          className="h-8 flex-1"
          disabled={isPending}
        />
      ) : (
        <span
          className={cn("flex-1 font-medium", isPending && "opacity-50 italic")}
          onDoubleClick={onEdit}
        >
          {act.title}
        </span>
      )}

      {/* Word Count Badge (if available) */}
      {act.wordCount !== undefined && act.wordCount > 0 && (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
          {act.wordCount.toLocaleString()} Wörter
        </span>
      )}

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStats}>
            <Info className="h-4 w-4 mr-2" />
            Statistiken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplizieren
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// =====================================================
// MEMOIZED SEQUENCE HEADER
// =====================================================

interface SequenceHeaderProps {
  sequence: Sequence;
  isExpanded: boolean;
  isEditing: boolean;
  isPending: boolean;
  editValue: string;
  onToggle: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStats: () => void;
  onChange: (value: string) => void;
  label?: string; // "Sequence" or "Kapitel"
}

export const MemoizedSequenceHeader = memo(function SequenceHeader({
  sequence,
  isExpanded,
  isEditing,
  isPending,
  editValue,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onStats,
  onChange,
  label = "Sequence",
}: SequenceHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-md border hover:bg-background transition-colors">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onToggle}
        disabled={isPending}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          className="h-7 flex-1 text-sm"
          disabled={isPending}
        />
      ) : (
        <span
          className={cn("flex-1 text-sm", isPending && "opacity-50 italic")}
          onDoubleClick={onEdit}
        >
          {sequence.title}
        </span>
      )}

      {sequence.wordCount !== undefined && sequence.wordCount > 0 && (
        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
          {sequence.wordCount.toLocaleString()}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStats}>
            <Info className="h-4 w-4 mr-2" />
            Statistiken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplizieren
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// =====================================================
// MEMOIZED SCENE HEADER
// =====================================================

interface SceneHeaderProps {
  scene: Scene;
  isExpanded: boolean;
  isEditing: boolean;
  isPending: boolean;
  editValue: string;
  onToggle: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStats: () => void;
  onChange: (value: string) => void;
  label?: string; // "Scene" or "Abschnitt"
  showWordCount?: boolean;
}

export const MemoizedSceneHeader = memo(function SceneHeader({
  scene,
  isExpanded,
  isEditing,
  isPending,
  editValue,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onStats,
  onChange,
  label = "Scene",
  showWordCount = false,
}: SceneHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/30 rounded-sm border hover:bg-background/50 transition-colors">
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0"
        onClick={onToggle}
        disabled={isPending}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
          className="h-6 flex-1 text-xs"
          disabled={isPending}
        />
      ) : (
        <span
          className={cn("flex-1 text-xs", isPending && "opacity-50 italic")}
          onDoubleClick={onEdit}
        >
          {scene.title}
        </span>
      )}

      {showWordCount &&
        scene.wordCount !== undefined &&
        scene.wordCount > 0 && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            {scene.wordCount.toLocaleString()}
          </span>
        )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStats}>
            <Info className="h-4 w-4 mr-2" />
            Statistiken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplizieren
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// =====================================================
// LOADING SKELETON
// =====================================================

export const LoadingSkeleton = memo(function LoadingSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-muted/50 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
});
