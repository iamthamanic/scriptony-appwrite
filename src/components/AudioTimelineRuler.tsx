/**
 * AudioTimelineRuler — Zeitachse mit Beat-Markern und Playhead.
 * KISS: Reiner Anzeige, keine Interaktion (erst im nächsten Sprint).
 */

interface AudioTimelineRulerProps {
  durationSec: number;
  pxPerSec: number;
  currentSec?: number;
}

export function AudioTimelineRuler({
  durationSec,
  pxPerSec,
  currentSec = 0,
}: AudioTimelineRulerProps) {
  const width = Math.max(durationSec * pxPerSec, 800);
  const ticks = Math.ceil(durationSec / 10); // 10-Sekunden-Ticks

  return (
    <div className="relative h-8 border-b border-border bg-muted/20 shrink-0 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex items-end"
        style={{ width: `${width}px` }}
      >
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const sec = i * 10;
          const left = sec * pxPerSec;
          return (
            <div
              key={sec}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${left}px`, transform: "translateX(-50%)" }}
            >
              <span className="text-[10px] text-muted-foreground tabular-nums select-none">
                {formatTime(sec)}
              </span>
              <div className="w-px h-2 bg-border mt-0.5" />
            </div>
          );
        })}
      </div>

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
        style={{ left: `${currentSec * pxPerSec}px` }}
      >
        <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full" />
      </div>
    </div>
  );
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioTimelineRuler;
