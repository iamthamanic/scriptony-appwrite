import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Scissors, Play, Pause } from "lucide-react";
import WaveSurfer from "wavesurfer.js@7.8.10";
import RegionsPlugin from "wavesurfer.js@7.8.10/dist/plugins/regions.esm.js";

interface AudioEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioFile: {
    id: string;
    fileName: string;
    label?: string;
    startTime?: number;
    endTime?: number;
    url: string; // Audio URL for waveform
  } | null;
  onSave: (
    audioId: string,
    updates: {
      label?: string;
      startTime?: number;
      endTime?: number;
      fadeIn?: number;
      fadeOut?: number;
    },
  ) => void;
}

export function AudioEditDialog({
  open,
  onOpenChange,
  audioFile,
  onSave,
}: AudioEditDialogProps) {
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fadeInLength, setFadeInLength] = useState(0); // in seconds
  const [fadeOutLength, setFadeOutLength] = useState(0); // in seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isDraggingFadeIn, setIsDraggingFadeIn] = useState(false);
  const [isDraggingFadeOut, setIsDraggingFadeOut] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const isDestroyedRef = useRef(false);
  const fadeOverlayRef = useRef<HTMLDivElement>(null);

  // Helper functions - defined early for use in effects
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${String(mins).padStart(2, "0")}:${secs.padStart(5, "0")}`;
  };

  const parseTime = (timeStr: string): number | undefined => {
    if (!timeStr) return undefined;
    const parts = timeStr.split(":");
    if (parts.length !== 2) return undefined;
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return undefined;
    return mins * 60 + secs;
  };

  // Initialize state when audioFile changes
  useEffect(() => {
    if (audioFile) {
      setLabel(audioFile.label || audioFile.fileName);
      setStartTime(
        audioFile.startTime !== undefined
          ? formatTime(audioFile.startTime)
          : "00:00",
      );
      setEndTime(
        audioFile.endTime !== undefined ? formatTime(audioFile.endTime) : "",
      );
      setFadeInLength(0);
      setFadeOutLength(0);
    }
  }, [audioFile]);

  // Drag handlers for Fade In Handle
  const handleFadeInMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingFadeIn(true);
  };

  // Drag handlers for Fade Out Handle
  const handleFadeOutMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingFadeOut(true);
  };

  // Global mouse move handler
  useEffect(() => {
    if (!isDraggingFadeIn && !isDraggingFadeOut) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!waveformRef.current || !wavesurferRef.current) return;

      const rect = waveformRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const waveformWidth = rect.width;

      const parsedStart = parseTime(startTime) || 0;
      const parsedEnd = parseTime(endTime) || duration;
      const regionDuration = parsedEnd - parsedStart;

      // Calculate region position in waveform
      const regionStartX = (parsedStart / duration) * waveformWidth;
      const regionEndX = (parsedEnd / duration) * waveformWidth;
      const regionWidth = regionEndX - regionStartX;

      if (isDraggingFadeIn) {
        // Fade In: position relative to region START, max 50% of region
        const distanceFromRegionStart = Math.max(0, x - regionStartX);
        const fadeInPercentage = Math.min(
          distanceFromRegionStart / regionWidth,
          0.5,
        );
        const newFadeIn = fadeInPercentage * regionDuration;
        setFadeInLength(newFadeIn);
      } else if (isDraggingFadeOut) {
        // Fade Out: position relative to region END, max 50% of region
        const distanceFromRegionEnd = Math.max(0, regionEndX - x);
        const fadeOutPercentage = Math.min(
          distanceFromRegionEnd / regionWidth,
          0.5,
        );
        const newFadeOut = fadeOutPercentage * regionDuration;
        setFadeOutLength(newFadeOut);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingFadeIn(false);
      setIsDraggingFadeOut(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingFadeIn, isDraggingFadeOut, startTime, endTime, duration]);

  // Initialize WaveSurfer - ONLY when dialog opens with audio file
  useEffect(() => {
    console.log("[AudioEditDialog] useEffect triggered:", {
      open,
      hasAudioFile: !!audioFile,
      hasWaveformRef: !!waveformRef.current,
      audioFileUrl: audioFile?.url,
    });

    if (!open || !audioFile?.url) {
      console.log(
        "[AudioEditDialog] Early return - dialog not open or no audio file",
      );
      return;
    }

    // Reset destroyed flag
    isDestroyedRef.current = false;

    // Wait for DOM to be ready
    const initTimer = setTimeout(() => {
      if (!waveformRef.current || isDestroyedRef.current) {
        console.log(
          "[AudioEditDialog] Early return - waveformRef not ready or already destroyed",
        );
        return;
      }

      console.log("[AudioEditDialog] Initializing WaveSurfer:", {
        audioFile,
        url: audioFile.url,
      });

      let wavesurfer: WaveSurfer | null = null;
      let regionsPlugin: any = null;

      try {
        // Create regions plugin
        regionsPlugin = RegionsPlugin.create();
        regionsPluginRef.current = regionsPlugin;

        // Create WaveSurfer instance
        wavesurfer = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: "#9CA3AF", // Gray
          progressColor: "#6B7280", // Darker gray
          cursorColor: "#6E59A5", // Purple
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 120,
          normalize: true,
          backend: "WebAudio",
          plugins: [regionsPlugin],
        });

        wavesurferRef.current = wavesurfer;

        console.log("[AudioEditDialog] WaveSurfer instance created");

        // Load audio with error handling
        try {
          wavesurfer.load(audioFile.url);
          console.log(
            "[AudioEditDialog] Loading audio from URL:",
            audioFile.url,
          );
        } catch (loadError) {
          console.error("[AudioEditDialog] Error loading audio:", loadError);
          return;
        }

        // On ready, create region and set duration
        wavesurfer.on("ready", () => {
          if (isDestroyedRef.current) {
            console.log(
              "[AudioEditDialog] Instance already destroyed, skipping ready handler",
            );
            return;
          }

          console.log("[AudioEditDialog] WaveSurfer READY event fired");

          const audioDuration = wavesurfer!.getDuration();
          setDuration(audioDuration);
          console.log("[AudioEditDialog] Duration:", audioDuration);

          // Create initial region
          const start = audioFile.startTime || 0;
          const end = audioFile.endTime || audioDuration;

          console.log("[AudioEditDialog] Creating region:", { start, end });

          try {
            const region = regionsPlugin.addRegion({
              start,
              end,
              color: "rgba(110, 89, 165, 0.3)", // Purple with transparency
              drag: true,
              resize: true,
            });

            console.log(
              "[AudioEditDialog] Region created successfully:",
              region,
            );

            // Update time inputs and fade handles when region changes
            region.on("update", () => {
              // Sync fade handles with trim region in real-time
              const regionDuration = region.end - region.start;

              // Clamp fade in handle to not exceed 50% of region duration
              setFadeInLength((prev) => Math.min(prev, regionDuration * 0.5));

              // Clamp fade out handle to not exceed 50% of region duration
              setFadeOutLength((prev) => Math.min(prev, regionDuration * 0.5));
            });

            region.on("update-end", () => {
              console.log("[AudioEditDialog] Region updated:", {
                start: region.start,
                end: region.end,
              });
              setStartTime(formatTime(region.start));
              setEndTime(formatTime(region.end));
            });
          } catch (regionError) {
            console.error(
              "[AudioEditDialog] Error creating region:",
              regionError,
            );
          }
        });

        // Error handling - ignore AbortError during cleanup
        wavesurfer.on("error", (error) => {
          if (error.name === "AbortError") {
            console.log(
              "[AudioEditDialog] Audio load aborted (likely due to cleanup)",
            );
          } else {
            console.error("[AudioEditDialog] WaveSurfer error:", error);
          }
        });

        wavesurfer.on("loading", (percent) => {
          console.log("[AudioEditDialog] Loading:", percent + "%");
        });

        // Play/pause events
        wavesurfer.on("play", () => {
          console.log("[AudioEditDialog] Playing");
          setIsPlaying(true);
        });

        wavesurfer.on("pause", () => {
          console.log("[AudioEditDialog] Paused");
          setIsPlaying(false);
        });
      } catch (error) {
        console.error(
          "[AudioEditDialog] Error initializing WaveSurfer:",
          error,
        );
      }
    }, 100); // 100ms delay to ensure DOM is ready

    // Cleanup
    return () => {
      clearTimeout(initTimer);
      isDestroyedRef.current = true;
      console.log("[AudioEditDialog] Cleaning up WaveSurfer");
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        } catch (e) {
          console.error("[AudioEditDialog] Error destroying WaveSurfer:", e);
        }
      }
    };
  }, [open, audioFile?.url]); // ONLY depend on open and url!

  // Update region when time inputs change
  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    const parsedStart = parseTime(value);
    if (parsedStart !== undefined && regionsPluginRef.current) {
      const regions = regionsPluginRef.current.getRegions();
      if (regions.length > 0) {
        const region = regions[0];
        region.setOptions({ start: parsedStart });
      }
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    const parsedEnd = parseTime(value);
    if (parsedEnd !== undefined && regionsPluginRef.current) {
      const regions = regionsPluginRef.current.getRegions();
      if (regions.length > 0) {
        const region = regions[0];
        region.setOptions({ end: parsedEnd });
      }
    }
  };

  // Play/pause region
  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      // Play only the region
      const parsedStart = parseTime(startTime);
      const parsedEnd = parseTime(endTime);

      if (parsedStart !== undefined) {
        wavesurferRef.current.setTime(parsedStart);
      }

      wavesurferRef.current.play();

      // Stop at end time
      if (parsedEnd !== undefined) {
        const checkTime = setInterval(() => {
          if (
            wavesurferRef.current &&
            wavesurferRef.current.getCurrentTime() >= parsedEnd
          ) {
            wavesurferRef.current.pause();
            clearInterval(checkTime);
          }
        }, 100);
      }
    }
  };

  const handleSave = () => {
    if (!audioFile) return;

    const updates: {
      label?: string;
      startTime?: number;
      endTime?: number;
      fadeIn?: number;
      fadeOut?: number;
    } = {};

    if (label && label !== audioFile.fileName) {
      updates.label = label;
    }

    const parsedStart = parseTime(startTime);
    const parsedEnd = parseTime(endTime);

    if (parsedStart !== undefined) {
      updates.startTime = parsedStart;
    }

    if (parsedEnd !== undefined) {
      updates.endTime = parsedEnd;
    }

    // Add fade values (convert seconds to milliseconds for storage)
    if (fadeInLength > 0) {
      updates.fadeIn = fadeInLength;
    }

    if (fadeOutLength > 0) {
      updates.fadeOut = fadeOutLength;
    }

    onSave(audioFile.id, updates);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  // Calculate final output duration
  const finalOutputDuration = () => {
    const start = parseTime(startTime) || 0;
    const end = parseTime(endTime) || duration;
    return formatTime(Math.max(0, end - start));
  };

  if (!audioFile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-violet-600" />
            Audio bearbeiten
          </DialogTitle>
          <DialogDescription>
            Ändere den Namen der Audio-Datei oder schneide sie visuell zu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Label/Name */}
          <div className="space-y-2">
            <Label htmlFor="audio-label">Name</Label>
            <Input
              id="audio-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Audio-Name"
              className="focus:ring-violet-600 focus:border-violet-600"
              autoFocus
            />
          </div>

          {/* Waveform Visualizer */}
          <div className="border-t pt-4">
            <Label className="text-sm text-neutral-700 mb-3 block">
              Audio zuschneiden
            </Label>

            <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4 space-y-3">
              {/* Waveform Container with Fade Overlays */}
              <div className="relative">
                <div
                  ref={waveformRef}
                  className="w-full min-h-[120px] bg-white rounded relative"
                  style={{ minHeight: "120px" }}
                >
                  {/* Debug Info */}
                  <div className="absolute bottom-2 left-2 text-xs text-neutral-400 z-10">
                    Duration: {duration.toFixed(2)}s
                  </div>
                </div>

                {/* Fade Overlays */}
                <div
                  ref={fadeOverlayRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ height: "120px" }}
                >
                  {/* Fade In Overlay - positioned relative to TRIM REGION */}
                  {fadeInLength > 0 &&
                    (() => {
                      const parsedStart = parseTime(startTime) || 0;
                      const parsedEnd = parseTime(endTime) || duration;
                      const regionStartPercent = (parsedStart / duration) * 100;
                      const fadeWidthPercent = (fadeInLength / duration) * 100;

                      return (
                        <div
                          className="absolute top-0 bottom-0"
                          style={{
                            left: `${regionStartPercent}%`,
                            width: `${fadeWidthPercent}%`,
                            background:
                              "linear-gradient(to right, rgba(110, 89, 165, 0.15), transparent)",
                            pointerEvents: "none",
                          }}
                        >
                          {/* Fade In Curve */}
                          <svg
                            className="absolute inset-0 w-full h-full"
                            preserveAspectRatio="none"
                          >
                            <path
                              d={`M 0,${120} Q 0,0 ${100},0`}
                              fill="none"
                              stroke="#6E59A5"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </div>
                      );
                    })()}

                  {/* Fade Out Overlay - positioned relative to TRIM REGION */}
                  {fadeOutLength > 0 &&
                    (() => {
                      const parsedStart = parseTime(startTime) || 0;
                      const parsedEnd = parseTime(endTime) || duration;
                      const regionEndPercent = (parsedEnd / duration) * 100;
                      const fadeWidthPercent = (fadeOutLength / duration) * 100;

                      return (
                        <div
                          className="absolute top-0 bottom-0"
                          style={{
                            right: `${100 - regionEndPercent}%`,
                            width: `${fadeWidthPercent}%`,
                            background:
                              "linear-gradient(to left, rgba(110, 89, 165, 0.15), transparent)",
                            pointerEvents: "none",
                          }}
                        >
                          {/* Fade Out Curve */}
                          <svg
                            className="absolute inset-0 w-full h-full"
                            preserveAspectRatio="none"
                          >
                            <path
                              d={`M 0,0 Q ${100},0 ${100},${120}`}
                              fill="none"
                              stroke="#6E59A5"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </div>
                      );
                    })()}
                </div>

                {/* Fade In Handle - positioned at TRIM START + fade length */}
                <div
                  className={`absolute top-0 w-3 h-full cursor-ew-resize z-20 group ${
                    isDraggingFadeIn ? "bg-violet-200" : "hover:bg-violet-100"
                  }`}
                  onMouseDown={handleFadeInMouseDown}
                  style={{
                    left: `${((parseTime(startTime) || 0) / duration) * 100}%`,
                    transform: `translateX(${(fadeInLength / duration) * (waveformRef.current?.clientWidth || 0)}px)`,
                    transition: isDraggingFadeIn
                      ? "none"
                      : "background-color 0.2s",
                  }}
                >
                  {/* Handle Triangle */}
                  <div className="absolute top-0 left-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[20px] border-t-violet-600 group-hover:border-t-violet-700"></div>
                  <div className="absolute inset-0 bg-violet-600 group-hover:bg-violet-700 opacity-20"></div>
                </div>

                {/* Fade Out Handle - positioned at TRIM END - fade length */}
                <div
                  className={`absolute top-0 w-3 h-full cursor-ew-resize z-20 group ${
                    isDraggingFadeOut ? "bg-violet-200" : "hover:bg-violet-100"
                  }`}
                  onMouseDown={handleFadeOutMouseDown}
                  style={{
                    left: `${((parseTime(endTime) || duration) / duration) * 100}%`,
                    transform: `translateX(-${(fadeOutLength / duration) * (waveformRef.current?.clientWidth || 0)}px)`,
                    transition: isDraggingFadeOut
                      ? "none"
                      : "background-color 0.2s",
                  }}
                >
                  {/* Handle Triangle */}
                  <div className="absolute top-0 right-0 w-0 h-0 border-r-[12px] border-r-transparent border-t-[20px] border-t-violet-600 group-hover:border-t-violet-700"></div>
                  <div className="absolute inset-0 bg-violet-600 group-hover:bg-violet-700 opacity-20"></div>
                </div>
              </div>

              {/* Play Button Below Waveform */}
              <div className="flex items-center justify-center pt-2">
                <Button
                  type="button"
                  onClick={handlePlayPause}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Time Inputs */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-700">Cut from:</Label>

            <div className="grid grid-cols-2 gap-3">
              {/* Start Time */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="start-time"
                  className="text-xs text-neutral-600"
                >
                  Start (mm:ss.ms)
                </Label>
                <Input
                  id="start-time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="00:00.00"
                  className="text-sm focus:ring-violet-600 focus:border-violet-600"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <Label htmlFor="end-time" className="text-xs text-neutral-600">
                  to (mm:ss.ms)
                </Label>
                <Input
                  id="end-time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="01:30.00"
                  className="text-sm focus:ring-violet-600 focus:border-violet-600"
                />
              </div>
            </div>
          </div>

          {/* Fade Info */}
          {(fadeInLength > 0 || fadeOutLength > 0) && (
            <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
              <div className="text-xs text-violet-700 space-y-1">
                {fadeInLength > 0 && (
                  <div>
                    Fade In:{" "}
                    <span className="font-medium">
                      {fadeInLength.toFixed(2)}s
                    </span>
                  </div>
                )}
                {fadeOutLength > 0 && (
                  <div>
                    Fade Out:{" "}
                    <span className="font-medium">
                      {fadeOutLength.toFixed(2)}s
                    </span>
                  </div>
                )}
                <div className="text-violet-600 italic mt-1">
                  Ziehe die violetten Dreiecke innerhalb der Trim-Region
                </div>
              </div>
            </div>
          )}

          {/* Final Output Info */}
          <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-neutral-600">Final output: </span>
                <span className="font-medium text-violet-700">
                  {finalOutputDuration()}
                </span>
              </div>
              <div>
                <span className="text-neutral-600">Format: </span>
                <span className="font-medium text-violet-700">MP3</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
