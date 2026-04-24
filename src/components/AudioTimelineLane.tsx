/**
 * AudioTimelineLane — Einzelne horizontale Spur (Lane).
 * Zeigt Track-Segmente als farbige Blöcke.
 */

import type { AudioTrack } from "../lib/types";
import { AudioTimelineSegment } from "./AudioTimelineSegment";

interface AudioTimelineLaneProps {
  label: string;
  color?: string;
  tracks: AudioTrack[];
  pxPerSec: number;
  durationSec: number;
}

export function AudioTimelineLane({
  label,
  color = "#6366f1",
  tracks,
  pxPerSec,
  durationSec,
}: AudioTimelineLaneProps) {
  const width = Math.max(durationSec * pxPerSec, 800);

  return (
    <div className="relative h-14 border-b border-border/50 bg-background/50 hover:bg-muted/20 transition-colors">
      {/* Lane Label (sticky left) */}
      <div className="absolute left-0 top-0 bottom-0 w-32 border-r border-border bg-muted/40 z-10 flex items-center px-3">
        <div
          className="w-2 h-2 rounded-full mr-2 shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium text-foreground truncate">
          {label}
        </span>
      </div>

      {/* Track segments container */}
      <div
        className="absolute inset-y-0 left-32 flex items-center"
        style={{ width: `${width}px` }}
      >
        {tracks.map((track) => (
          <AudioTimelineSegment
            key={track.id}
            track={track}
            pxPerSec={pxPerSec}
          />
        ))}
      </div>
    </div>
  );
}

export default AudioTimelineLane;
