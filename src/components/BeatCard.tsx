import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  GripVertical,
  X,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef } from "react";

/**
 * 🎬 BEAT CARD - Resizable Beat Block
 *
 * FL Studio-style resizable beat block mit:
 * - Top/Bottom Resize Handles
 * - Notes-Feld
 * - Label + Percentage
 */

export interface BeatCardData {
  id: string;
  label: string;
  pctFrom: number;
  pctTo: number;
  color?: string;
  description?: string;
  notes?: string; // 🆕 Notes field
  templateAbbr?: string; // 🆕 Template abbreviation (e.g., "STC" for Save the Cat)
  // Position anchors
  fromAct?: string;
  fromSequence?: string;
  fromScene?: string;
  fromShot?: string;
  toAct?: string;
  toSequence?: string;
  toScene?: string;
  toShot?: string;
  /** Nested beat line items (templates / structure beats). */
  items?: unknown[];
}

// Timeline data structure for dropdowns
export interface TimelineNode {
  id: string;
  title: string;
  sequences?: TimelineNode[];
  scenes?: TimelineNode[];
  shots?: TimelineNode[];
}

interface BeatCardProps {
  beat: BeatCardData;
  onUpdate?: (beatId: string, updates: Partial<BeatCardData>) => void;
  onDelete?: (beatId: string) => void;
  timelineData?: TimelineNode[]; // Acts with nested sequences/scenes/shots
  className?: string;
  // 🆕 FL Studio-style resize
  onResize?: (
    beatId: string,
    handle: "top" | "bottom",
    newPctFrom: number,
    newPctTo: number,
  ) => void;
  resizing?: boolean;
  setResizing?: (beatId: string | null) => void;
  // 🎯 Selection
  selected?: boolean;
  setSelected?: (beatId: string | null) => void;
}

export function BeatCard({
  beat,
  onUpdate,
  onDelete,
  timelineData,
  className = "",
  onResize,
  resizing,
  setResizing,
  selected,
  setSelected,
}: BeatCardProps) {
  const bgColor = beat.color || "#B8A8D8"; // Default violet
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<"top" | "bottom" | null>(
    null,
  );
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Handle click to select this beat
  const handleBeatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected?.(beat.id);
    console.log(`🎯 Beat selected: ${beat.label}`);
  };

  // Handle mouse down on resize handles
  const handleMouseDown = (handle: "top" | "bottom", e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onResize) return;

    setIsResizing(true);
    setResizeHandle(handle);
    setResizing?.(beat.id);

    const startY = e.clientY;
    const startPctFrom = beat.pctFrom;
    const startPctTo = beat.pctTo;

    // Find parent element to calculate relative movement
    const parentElement = (e.target as HTMLElement).closest(".relative")
      ?.parentElement?.parentElement;
    if (!parentElement) return;

    const parentHeight = parentElement.scrollHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = (deltaY / parentHeight) * 100;

      if (handle === "top") {
        const newFrom = Math.max(
          0,
          Math.min(startPctTo - 1, startPctFrom + deltaPercent),
        );
        onResize(beat.id, "top", newFrom, beat.pctTo);
      } else {
        const newTo = Math.min(
          100,
          Math.max(startPctFrom + 1, startPctTo + deltaPercent),
        );
        onResize(beat.id, "bottom", beat.pctFrom, newTo);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      setResizing?.(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 🎬 NEW DESIGN: Resizable Beat Block with Top/Bottom Handles
  return (
    <div className="relative w-full h-full group">
      {/* Top Resize Handle - nur bei selected anzeigen */}
      {selected && (
        <div
          className={`absolute -top-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
            resizeHandle === "top" ? "opacity-100" : ""
          }`}
          onMouseDown={(e) => handleMouseDown("top", e)}
          style={{ zIndex: 30 }}
        >
          <div className="h-1 w-12 bg-white/90 rounded-full shadow-md flex items-center justify-center">
            <GripVertical className="w-2.5 h-2.5 text-gray-600" />
          </div>
        </div>
      )}

      {/* Beat Block Content */}
      <div
        className={`h-full rounded-lg border-2 transition-all ${
          selected
            ? "border-white shadow-lg"
            : isResizing
              ? "cursor-ns-resize border-white shadow-lg"
              : "border-transparent hover:border-white/50"
        }`}
        style={{ backgroundColor: bgColor }}
        onClick={handleBeatClick}
      >
        <div className="h-full flex flex-col p-1.5">
          {/* Header with Label */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-semibold text-white leading-tight">
              {beat.label}
            </span>
          </div>

          {/* Notes Field */}
          <textarea
            ref={notesRef}
            value={beat.notes || ""}
            onChange={(e) => onUpdate?.(beat.id, { notes: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Notes..."
            className="flex-1 bg-white/10 text-white placeholder:text-white/50 text-[9px] rounded px-1.5 py-1 resize-none focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
            style={{ minHeight: "24px" }}
          />
        </div>
      </div>

      {/* Bottom Resize Handle - nur bei selected anzeigen */}
      {selected && (
        <div
          className={`absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
            resizeHandle === "bottom" ? "opacity-100" : ""
          }`}
          onMouseDown={(e) => handleMouseDown("bottom", e)}
          style={{ zIndex: 30 }}
        >
          <div className="h-1 w-12 bg-white/90 rounded-full shadow-md flex items-center justify-center">
            <GripVertical className="w-2.5 h-2.5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
}
