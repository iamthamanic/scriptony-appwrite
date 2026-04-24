/**
 * AudioTimelineSegment — Einzelner Track-Block auf einer Lane.
 * Zeigt Track-Namen, Dauer und optional Wellenform-Platzhalter.
 */

import type { AudioTrack } from "../lib/types";
import { cn } from "../lib/utils";

const TYPE_COLORS: Record<string, string> = {
  dialog: "bg-amber-500 border-amber-600",
  narrator: "bg-amber-400 border-amber-500",
  music: "bg-violet-500 border-violet-600",
  sfx: "bg-slate-500 border-slate-600",
  atmo: "bg-sky-500 border-sky-600",
};

interface AudioTimelineSegmentProps {
  track: AudioTrack;
  pxPerSec: number;
}

export function AudioTimelineSegment({
  track,
  pxPerSec,
}: AudioTimelineSegmentProps) {
  const startPx = track.startTime * pxPerSec;
  const widthPx = Math.max(track.duration * pxPerSec, 4); // Min 4px

  const colorClass = TYPE_COLORS[track.type] || "bg-gray-500 border-gray-600";

  return (
    <div
      className={cn(
        "absolute top-1.5 bottom-1.5 rounded-md border text-white text-[10px] overflow-hidden cursor-pointer",
        "hover:brightness-110 transition-all shadow-sm select-none",
        colorClass,
      )}
      style={{
        left: `${startPx}px`,
        width: `${widthPx}px`,
      }}
      title={`${track.type}: ${track.content || "(kein Text)"} (${formatDuration(track.duration)})`}
    >
      <div className="px-1.5 py-0.5 flex items-center justify-between h-full">
        <span className="truncate font-medium">{track.content || "…"}</span>
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioTimelineSegment;
