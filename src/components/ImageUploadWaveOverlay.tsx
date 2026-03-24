/**
 * Full-area loading overlay with shimmer “wave” and spinner for image uploads.
 * Use inside a `relative overflow-hidden rounded-*` container.
 * Location: src/components/ImageUploadWaveOverlay.tsx
 */

import { Loader2 } from "lucide-react";
import { cn } from "./ui/utils";

type ImageUploadWaveOverlayProps = {
  visible: boolean;
  /** Shown under the spinner */
  label?: string;
  /** Thumbnail-sized shot preview */
  compact?: boolean;
  className?: string;
};

export function ImageUploadWaveOverlay({
  visible,
  label = "Wird hochgeladen…",
  compact = false,
  className,
}: ImageUploadWaveOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[25] flex flex-col items-center justify-center gap-2 rounded-[inherit] overflow-hidden",
        "bg-background/75 backdrop-blur-[2px] pointer-events-auto cursor-wait",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
        <div
          className="absolute inset-y-0 w-[70%] -left-[35%] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-80"
          style={{
            animation: "image-upload-shimmer 1.6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-y-0 w-[55%] -left-[20%] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/15 opacity-70"
          style={{
            animation: "image-upload-shimmer 2.1s ease-in-out infinite",
            animationDelay: "0.35s",
          }}
        />
      </div>
      <Loader2
        className={cn(
          "text-primary animate-spin relative z-10 drop-shadow-sm",
          compact ? "size-5" : "size-9"
        )}
      />
      {!compact && (
        <span className="text-sm font-medium text-foreground relative z-10 text-center px-3 drop-shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}
