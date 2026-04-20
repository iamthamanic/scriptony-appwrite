import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * 🚀 VIRTUALIZED TIMELINE TRACKS
 *
 * Only renders visible tracks for massive performance gains
 * Activates automatically when >50 tracks
 */

interface Track {
  id: string;
  type: "act" | "sequence" | "scene" | "shot" | "audio" | "beat";
  title: string;
  height: number;
  [key: string]: any;
}

interface VirtualizedTimelineProps {
  tracks: Track[];
  renderTrack: (track: Track, index: number) => React.ReactNode;
  containerHeight: number;
}

const VIRTUALIZATION_THRESHOLD = 50;

export function VirtualizedTimeline({
  tracks,
  renderTrack,
  containerHeight,
}: VirtualizedTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => tracks[index]?.height || 80,
    overscan: 5, // Render 5 extra rows above/below viewport for smooth scrolling
  });

  return (
    <div
      ref={parentRef}
      className="timeline-tracks-virtualized"
      style={{
        height: `${containerHeight}px`,
        overflow: "auto",
        position: "relative",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const track = tracks[virtualRow.index];
          if (!track) return null;

          return (
            <div
              key={track.id}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderTrack(track, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to determine if virtualization should be enabled
 */
export function useVirtualization(trackCount: number) {
  return useMemo(() => {
    const shouldVirtualize = trackCount > VIRTUALIZATION_THRESHOLD;

    if (shouldVirtualize) {
      console.log(
        `[Virtualization] ✅ ENABLED for ${trackCount} tracks (threshold: ${VIRTUALIZATION_THRESHOLD})`,
      );
    }

    return {
      shouldVirtualize,
      trackCount,
      threshold: VIRTUALIZATION_THRESHOLD,
    };
  }, [trackCount]);
}
