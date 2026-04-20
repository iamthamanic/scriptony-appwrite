import { useEffect, useRef } from "react";
import { BeatBand } from "./BeatBand";
import type { ContainerData } from "./ContainerCard";

/**
 * 🎵 BEAT RAIL
 *
 * Lila Spalte links mit %-Skala und dynamischen Beat-Bands.
 * Beobachtet Container-Stack mit ResizeObserver und passt Band-Positionen an.
 */

export interface BeatDefinition {
  id: string;
  label: string;
  templateAbbr: string; // "STC", "HJ", "FLD"
  fromContainerId: string; // "A1S1SC1SH1"
  toContainerId: string; // "A1S1SC7SH5"
  pctFrom: number;
  pctTo: number;
  color?: string;
}

interface BeatRailProps {
  beats: BeatDefinition[];
  containers: ContainerData[];
  containerStackRef: React.RefObject<HTMLDivElement>;
  onUpdateBeat: (beatId: string, updates: Partial<BeatDefinition>) => void;
  className?: string;
}

export function BeatRail({
  beats,
  containers,
  containerStackRef,
  onUpdateBeat,
  className = "",
}: BeatRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  // Update Beat-Band positions when containers collapse/expand
  useEffect(() => {
    if (!containerStackRef.current || !railRef.current) return;

    const updateBeatBands = () => {
      beats.forEach((beat) => {
        const startEl = document.querySelector(
          `[data-container-id="${beat.fromContainerId}"]`,
        );
        const endEl = document.querySelector(
          `[data-container-id="${beat.toContainerId}"]`,
        );
        const bandEl = document.getElementById(`beat-band-${beat.id}`);

        if (startEl && endEl && bandEl && railRef.current) {
          const railRect = railRef.current.getBoundingClientRect();
          const startRect = startEl.getBoundingClientRect();
          const endRect = endEl.getBoundingClientRect();

          const top = startRect.top - railRect.top;
          const height = endRect.bottom - startRect.top;

          bandEl.style.top = `${top}px`;
          bandEl.style.height = `${Math.max(height, 40)}px`; // Minimum 40px
        }
      });
    };

    // Initial update
    updateBeatBands();

    // Observe resize of container stack
    const observer = new ResizeObserver(() => {
      updateBeatBands();
    });

    observer.observe(containerStackRef.current);

    // Also update on window resize
    window.addEventListener("resize", updateBeatBands);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBeatBands);
    };
  }, [beats, containerStackRef]);

  return (
    <div
      ref={railRef}
      className={`relative shrink-0 w-20 bg-primary/5 border-r border-primary/10 min-h-full overflow-visible ${className}`}
    >
      {/* Percentage Scale */}
      <div className="absolute inset-0 pointer-events-none">
        {[0, 25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0 border-t border-primary/10"
            style={{ top: `${pct}%` }}
          >
            <span className="absolute right-1 -top-2 text-xs text-muted-foreground">
              {pct}%
            </span>
          </div>
        ))}
      </div>

      {/* Beat Bands */}
      {beats.map((beat) => (
        <BeatBand
          key={beat.id}
          beat={beat}
          containers={containers}
          onUpdate={onUpdateBeat}
          style={{
            top: 0,
            height: 100,
          }}
        />
      ))}
    </div>
  );
}
