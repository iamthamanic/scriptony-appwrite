import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit2,
} from "lucide-react";

export interface AudioFile {
  id: string;
  fileName: string;
  label?: string;
  url: string;
  type: "music" | "sfx";
  startTime?: number;
  endTime?: number;
}

interface AudioFileListProps {
  files: AudioFile[];
  type: "music" | "sfx";
  onDelete: (audioId: string) => void;
  onEdit: (audioId: string) => void;
  className?: string;
}

export function AudioFileList({
  files,
  type,
  onDelete,
  onEdit,
  className = "",
}: AudioFileListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));

  const handlePlayPause = (file: AudioFile) => {
    console.log("[AudioFileList] Play/Pause clicked:", {
      instanceId: instanceIdRef.current,
      type,
      fileId: file.id,
      fileName: file.fileName,
      url: file.url,
      urlLength: file.url?.length,
      urlPreview: file.url?.substring(0, 100) + "...",
      startTime: file.startTime,
      endTime: file.endTime,
      hasEndTime: file.endTime !== undefined,
      hasTrimming: file.startTime !== undefined || file.endTime !== undefined,
    });

    const audio = audioRefs.current[file.id];
    if (!audio) {
      console.error("[AudioFileList] Audio element not found for:", file.id);
      console.error(
        "[AudioFileList] Available audio refs:",
        Object.keys(audioRefs.current),
      );
      console.error(
        "[AudioFileList] This usually means useEffect did not run or files changed",
      );
      return;
    }

    console.log("[AudioFileList] Audio element found:", {
      fileId: file.id,
      audioElement: audio,
      constructor: audio.constructor.name,
      src: audio.src,
    });

    if (playingId === file.id) {
      audio.pause();
      setPlayingId(null);
      console.log("[AudioFileList] Audio paused");
    } else {
      // First, stop all other audios BEFORE starting this one
      Object.entries(audioRefs.current).forEach(([id, audioEl]) => {
        if (id !== file.id && !audioEl.paused) {
          console.log("[AudioFileList] Stopping other audio:", id);
          audioEl.pause();
          audioEl.currentTime = 0;
        }
      });

      // Apply trimming if startTime/endTime are set
      if (file.startTime !== undefined) {
        console.log("[AudioFileList] Setting currentTime to startTime:", {
          fileId: file.id,
          oldCurrentTime: audio.currentTime,
          newStartTime: file.startTime,
        });
        audio.currentTime = file.startTime;
      }

      console.log("[AudioFileList] Attempting to play audio...", {
        volume: audio.volume,
        muted: audio.muted,
        duration: audio.duration,
        readyState: audio.readyState,
        paused: audio.paused,
        src: audio.src,
        currentTime: audio.currentTime,
        startTime: file.startTime,
        endTime: file.endTime,
      });

      // Force unmute and volume
      audio.muted = false;
      audio.volume = 1.0;

      // CRITICAL: Call play() SYNCHRONOUSLY without await to maintain user interaction context
      const playPromise = audio.play();

      // Set state AFTER play() is called (not awaited!)
      setPlayingId(file.id);

      // Handle the promise asynchronously (doesn't block user interaction)
      playPromise
        .then(() => {
          console.log("[AudioFileList] Audio playing successfully ✅", {
            currentTime: audio.currentTime,
            paused: audio.paused,
            volume: audio.volume,
            muted: audio.muted,
          });

          // Verify it's still playing after a short delay
          setTimeout(() => {
            if (!audio.paused) {
              console.log("[AudioFileList] Audio still playing after 100ms ✅");
            } else {
              console.error(
                "[AudioFileList] Audio was paused unexpectedly! ❌",
              );
            }
          }, 100);
        })
        .catch((error) => {
          // Reset state on error
          setPlayingId(null);
          console.error("[AudioFileList] Error playing audio:", error);
          console.error("[AudioFileList] Error details:", {
            name: (error as Error).name,
            message: (error as Error).message,
            url: file.url,
            audioState: {
              volume: audio.volume,
              muted: audio.muted,
              src: audio.src,
              readyState: audio.readyState,
              paused: audio.paused,
            },
          });
        });
    }
  };

  const handleAudioEnded = useCallback((fileId: string) => {
    console.log("[AudioFileList] Audio ended:", fileId);
    setPlayingId(null);
  }, []);

  // Create audio elements programmatically to prevent re-creation on re-render
  useEffect(() => {
    console.log("[AudioFileList] useEffect running:", {
      instanceId: instanceIdRef.current,
      type,
      filesCount: files.length,
      files: files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        startTime: f.startTime,
        endTime: f.endTime,
        hasTrimming: f.startTime !== undefined || f.endTime !== undefined,
      })),
    });

    // CRITICAL: Clean up ALL existing audio elements first
    // This ensures trimming changes are applied correctly
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (!audio.paused) {
        audio.pause();
      }
    });
    audioRefs.current = {};
    console.log("[AudioFileList] Cleaned up all previous audio elements");

    // Create audio elements for all files
    files.forEach((file) => {
      const audio = new Audio(file.url);
      audio.preload = "metadata";
      audio.volume = 1.0;
      audio.muted = false;

      // CRITICAL: Set initial currentTime to startTime if trimming is enabled
      if (file.startTime !== undefined) {
        audio.currentTime = file.startTime;
        console.log("[AudioFileList] Initial currentTime set to startTime:", {
          fileId: file.id,
          startTime: file.startTime,
          currentTime: audio.currentTime,
        });
      }

      // Time update handler with file context
      const timeUpdateHandler = () => {
        // Only check endTime if it's actually set AND greater than startTime
        if (
          file.endTime !== undefined &&
          file.endTime > (file.startTime || 0) &&
          audio.currentTime >= file.endTime
        ) {
          console.log("[AudioFileList] Audio reached endTime, pausing:", {
            fileId: file.id,
            currentTime: audio.currentTime,
            endTime: file.endTime,
            startTime: file.startTime,
          });
          audio.pause();
          audio.currentTime = file.startTime || 0;
          setPlayingId(null);
        }
      };

      // Event listeners
      audio.addEventListener("ended", () => handleAudioEnded(file.id));
      audio.addEventListener("timeupdate", timeUpdateHandler);
      audio.addEventListener("error", (e) => {
        console.error("[AudioFileList] Audio load error:", {
          fileId: file.id,
          fileName: file.fileName,
          url: file.url,
          error: e,
          audioError: audio.error,
        });
      });
      audio.addEventListener("loadstart", () =>
        console.log("[AudioFileList] Audio load started:", file.fileName),
      );
      audio.addEventListener("loadeddata", () => {
        console.log("[AudioFileList] Audio loaded successfully:", {
          fileName: file.fileName,
          duration: audio.duration,
          volume: audio.volume,
          muted: audio.muted,
          readyState: audio.readyState,
        });
      });
      audio.addEventListener("play", () =>
        console.log("[AudioFileList] Audio PLAY event fired:", file.fileName),
      );
      audio.addEventListener("pause", () =>
        console.log("[AudioFileList] Audio PAUSE event fired:", file.fileName),
      );

      audioRefs.current[file.id] = audio;
      console.log("[AudioFileList] Audio element created programmatically:", {
        instanceId: instanceIdRef.current,
        type,
        fileId: file.id,
        volume: audio.volume,
        muted: audio.muted,
        src: audio.src,
        startTime: file.startTime,
        endTime: file.endTime,
      });
    });

    // Cleanup function
    return () => {
      // Stop all audios when component unmounts
      Object.values(audioRefs.current).forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
        }
        // Remove will not work on Audio objects, we just need to clean up refs
      });
      audioRefs.current = {};
      console.log("[AudioFileList] Component unmounted, cleaned up all audios");
    };
  }, [files, handleAudioEnded]);

  // handleTimeUpdate is now handled inline in useEffect

  if (files.length === 0) {
    return null;
  }

  const label = type === "music" ? "Music" : "SFX";
  const fileCountText = files.length === 1 ? "1 file" : `${files.length} files`;

  return (
    <div className={className}>
      {/* Header - Collapsible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
        )}
        <span className="text-[9px] text-neutral-600">{fileCountText}</span>
      </div>

      {/* File List - Expanded */}
      {isExpanded && (
        <div className="mt-1 space-y-1 pl-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-1 group">
              {/* Audio elements are created programmatically in useEffect */}

              {/* Play/Pause Button - AM ANFANG */}
              <button
                onClick={() => handlePlayPause(file)}
                className="w-4 h-4 flex items-center justify-center bg-violet-100 hover:bg-violet-200 rounded transition-colors flex-shrink-0"
                title={playingId === file.id ? "Pause" : "Play"}
              >
                {playingId === file.id ? (
                  <Pause className="w-2.5 h-2.5 text-violet-600" />
                ) : (
                  <Play className="w-2.5 h-2.5 text-violet-600" />
                )}
              </button>

              {/* Edit Button */}
              <button
                onClick={() => onEdit(file.id)}
                className="w-4 h-4 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
                title="Bearbeiten"
              >
                <Edit2 className="w-2.5 h-2.5 text-blue-600" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => onDelete(file.id)}
                className="w-4 h-4 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded transition-colors flex-shrink-0"
                title="Löschen"
              >
                <Trash2 className="w-2.5 h-2.5 text-red-600" />
              </button>

              {/* File Label/Name - AM ENDE */}
              <span className="text-[9px] text-neutral-700 flex-1 truncate">
                {file.label || file.fileName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
