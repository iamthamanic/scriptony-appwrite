import { useState, useRef, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { motion } from "motion/react";

/**
 * 🎵 RESIZABLE BEAT BLOCK
 *
 * FL Studio-style resizable beat block with:
 * - Top and bottom resize handles
 * - Visual feedback during resize
 * - Constraints (cannot go beyond first/last act)
 * - Note field for beat description
 */

export interface BeatBlockData {
  id: string;
  label: string;
  color: string;
  startPercent: number; // 0-100
  endPercent: number; // 0-100
  notes: string;
  templateAbbr: string;
}

interface ResizableBeatBlockProps {
  beat: BeatBlockData;
  timelineHeight: number;
  minPercent: number; // First act boundary
  maxPercent: number; // Last act boundary
  onResize: (id: string, startPercent: number, endPercent: number) => void;
  onNotesChange: (id: string, notes: string) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export function ResizableBeatBlock({
  beat,
  timelineHeight,
  minPercent,
  maxPercent,
  onResize,
  onNotesChange,
  isActive = false,
  onClick,
}: ResizableBeatBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<"top" | "bottom" | null>(
    null,
  );
  const blockRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Convert percent to pixel position
  const topPosition = (beat.startPercent / 100) * timelineHeight;
  const bottomPosition = (beat.endPercent / 100) * timelineHeight;
  const rawHeight = bottomPosition - topPosition;

  // Enforce minimum height of 50px for visibility
  const height = Math.max(rawHeight, 50);

  // Handle mouse down on resize handles
  const handleMouseDown = (handle: "top" | "bottom", e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);

    const startY = e.clientY;
    const startPercent = beat.startPercent;
    const endPercent = beat.endPercent;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = (deltaY / timelineHeight) * 100;

      if (handle === "top") {
        const newStart = Math.max(
          minPercent,
          Math.min(endPercent - 1, startPercent + deltaPercent),
        );
        onResize(beat.id, newStart, endPercent);
      } else {
        const newEnd = Math.min(
          maxPercent,
          Math.max(startPercent + 1, endPercent + deltaPercent),
        );
        onResize(beat.id, startPercent, newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <motion.div
      ref={blockRef}
      layout
      className={`absolute left-0 right-0 group ${isActive ? "z-20" : "z-10"}`}
      style={{
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
      onClick={onClick}
    >
      {/* Top Resize Handle */}
      <div
        className={`absolute -top-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
          resizeHandle === "top" ? "opacity-100" : ""
        }`}
        onMouseDown={(e) => handleMouseDown("top", e)}
        style={{ zIndex: 30 }}
      >
        <div className="h-1 w-16 bg-white/90 rounded-full shadow-md flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-gray-600" />
        </div>
      </div>

      {/* Beat Block Content */}
      <div
        className={`h-full rounded-lg border-2 transition-all ${
          isActive
            ? "border-white shadow-lg"
            : "border-transparent hover:border-white/50"
        } ${isResizing ? "cursor-ns-resize" : "cursor-pointer"}`}
        style={{ backgroundColor: beat.color }}
      >
        <div className="h-full flex flex-col p-2">
          {/* Header with Label and Abbr */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {beat.templateAbbr}
              </div>
              <span className="text-xs font-semibold text-white">
                {beat.label}
              </span>
            </div>
            <div className="text-[9px] text-white/80">
              {beat.startPercent.toFixed(0)}% - {beat.endPercent.toFixed(0)}%
            </div>
          </div>

          {/* Notes Field */}
          <textarea
            ref={notesRef}
            value={beat.notes}
            onChange={(e) => onNotesChange(beat.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Notes: Wo fängt dieser Beat an und wo hört er auf..."
            className="flex-1 bg-white/10 text-white placeholder:text-white/50 text-xs rounded px-2 py-1 resize-none focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
            style={{ minHeight: "40px" }}
          />
        </div>
      </div>

      {/* Bottom Resize Handle */}
      <div
        className={`absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
          resizeHandle === "bottom" ? "opacity-100" : ""
        }`}
        onMouseDown={(e) => handleMouseDown("bottom", e)}
        style={{ zIndex: 30 }}
      >
        <div className="h-1 w-16 bg-white/90 rounded-full shadow-md flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-gray-600" />
        </div>
      </div>
    </motion.div>
  );
}
