/**
 * Professional Audio Edit Dialog
 * Features:
 * - Server-side waveform caching
 * - Web Worker audio decoding (non-blocking)
 * - Progressive waveform rendering
 * - Real-time Web Audio API fade preview
 */

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
import { Scissors, Play, Pause, Loader2 } from "lucide-react";
import { ProgressiveWaveform } from "./ProgressiveWaveform";
import { FadeAudioPlayer } from "../lib/audio/FadeAudioPlayer";

interface AudioEditDialogProProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioFile: {
    id: string;
    fileName: string;
    label?: string;
    startTime?: number;
    endTime?: number;
    fadeIn?: number;
    fadeOut?: number;
    url: string;
    peaks?: number[];
    duration?: number;
  } | null;
  onSave: (
    audioId: string,
    updates: {
      label?: string;
      startTime?: number;
      endTime?: number;
      fadeIn?: number;
      fadeOut?: number;
      peaks?: number[];
      duration?: number;
    },
  ) => void;
}

export function AudioEditDialogPro({
  open,
  onOpenChange,
  audioFile,
  onSave,
}: AudioEditDialogProProps) {
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const audioPlayerRef = useRef<FadeAudioPlayer | null>(null);

  // Initialize state when audioFile changes
  useEffect(() => {
    if (audioFile) {
      setLabel(audioFile.label || audioFile.fileName);
      setStartTime(audioFile.startTime || 0);
      setEndTime(audioFile.endTime || audioFile.duration || 0);
      setFadeIn(audioFile.fadeIn || 0);
      setFadeOut(audioFile.fadeOut || 0);
      setDuration(audioFile.duration || 0);
      setPeaks(audioFile.peaks || []);

      console.log("[AudioEditDialogPro] Initialized:", {
        label,
        startTime: audioFile.startTime,
        endTime: audioFile.endTime,
        fadeIn: audioFile.fadeIn,
        fadeOut: audioFile.fadeOut,
      });
    }
  }, [audioFile]);

  // Initialize audio player when dialog opens
  useEffect(() => {
    if (!open || !audioFile?.url) {
      // Cleanup when closing
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
        audioPlayerRef.current = null;
      }
      return;
    }

    // Create audio player
    const player = new FadeAudioPlayer({
      fadeIn,
      fadeOut,
      startTime,
      endTime: endTime || duration,
      onTimeUpdate: (time) => setCurrentTime(time),
      onEnded: () => setIsPlaying(false),
    });

    audioPlayerRef.current = player;

    // Load audio
    player
      .loadAudio(audioFile.url)
      .then(() => {
        console.log("[AudioEditDialogPro] Audio loaded for playback");
      })
      .catch((error) => {
        console.error("[AudioEditDialogPro] Failed to load audio:", error);
      });

    return () => {
      player.destroy();
    };
  }, [open, audioFile?.url]);

  // Update player options when fade/trim changes
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.updateOptions({
        fadeIn,
        fadeOut,
        startTime,
        endTime: endTime || duration,
      });
    }
  }, [fadeIn, fadeOut, startTime, endTime, duration]);

  // Helper functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${String(mins).padStart(2, "0")}:${secs.padStart(5, "0")}`;
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(":");
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return mins * 60 + secs;
  };

  // Handle waveform ready (from Web Worker)
  const handleWaveformReady = (newPeaks: number[], newDuration: number) => {
    console.log("[AudioEditDialogPro] Waveform ready:", {
      peaks: newPeaks.length,
      duration: newDuration,
    });
    setPeaks(newPeaks);
    setDuration(newDuration);

    // Set initial end time if not set
    if (endTime === 0) {
      setEndTime(newDuration);
    }
  };

  // Play/Pause with fade preview
  const handlePlayPause = () => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Save changes
  const handleSave = () => {
    if (!audioFile) return;

    const updates: {
      label?: string;
      startTime?: number;
      endTime?: number;
      fadeIn?: number;
      fadeOut?: number;
      peaks?: number[];
      duration?: number;
    } = {};

    if (label !== audioFile.fileName) {
      updates.label = label;
    }

    updates.startTime = startTime;
    updates.endTime = endTime;
    updates.fadeIn = fadeIn;
    updates.fadeOut = fadeOut;

    // Save waveform cache if generated
    if (peaks.length > 0 && !audioFile.peaks) {
      updates.peaks = peaks;
      updates.duration = duration;
    }

    console.log("[AudioEditDialogPro] Saving:", updates);
    onSave(audioFile.id, updates);
    onOpenChange(false);
  };

  // Calculate output duration
  const outputDuration = endTime - startTime;

  if (!audioFile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#6E59A5]" />
            Professional Audio Editor
          </DialogTitle>
          <DialogDescription>
            Trim, fade, and preview audio with real-time Web Audio API playback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="audio-label">Label</Label>
            <Input
              id="audio-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Audio label"
              className="focus:ring-[#6E59A5] focus:border-[#6E59A5]"
            />
          </div>

          {/* Progressive Waveform */}
          <div className="space-y-3">
            <Label>Waveform (Web Worker Decoding)</Label>
            <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4">
              <ProgressiveWaveform
                audioUrl={audioFile.url}
                width={800}
                height={120}
                peaks={peaks.length > 0 ? peaks : undefined}
                duration={duration > 0 ? duration : undefined}
                startTime={startTime}
                endTime={endTime}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
                onWaveformReady={handleWaveformReady}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                onFadeInChange={setFadeIn}
                onFadeOutChange={setFadeOut}
              />
            </div>
          </div>

          {/* Play Button with Fade Preview */}
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              onClick={handlePlayPause}
              className="bg-[#6E59A5] hover:bg-[#5A4A8A] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>
            <div className="text-sm text-neutral-600">
              {isPlaying ? (
                <span className="text-[#6E59A5]">
                  ▶ Playing with fade preview: {formatTime(currentTime)}
                </span>
              ) : (
                <span>▶ Click to preview with real-time fade</span>
              )}
            </div>
          </div>

          {/* Time Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time (mm:ss.ms)</Label>
              <Input
                id="start-time"
                value={formatTime(startTime)}
                onChange={(e) => setStartTime(parseTime(e.target.value))}
                placeholder="00:00.00"
                className="focus:ring-[#6E59A5] focus:border-[#6E59A5]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time (mm:ss.ms)</Label>
              <Input
                id="end-time"
                value={formatTime(endTime)}
                onChange={(e) => setEndTime(parseTime(e.target.value))}
                placeholder="01:30.00"
                className="focus:ring-[#6E59A5] focus:border-[#6E59A5]"
              />
            </div>
          </div>

          {/* Fade Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fade-in">Fade In (seconds)</Label>
              <Input
                id="fade-in"
                type="number"
                step="0.1"
                min="0"
                max={outputDuration * 0.5}
                value={fadeIn}
                onChange={(e) => setFadeIn(parseFloat(e.target.value) || 0)}
                className="focus:ring-[#6E59A5] focus:border-[#6E59A5]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fade-out">Fade Out (seconds)</Label>
              <Input
                id="fade-out"
                type="number"
                step="0.1"
                min="0"
                max={outputDuration * 0.5}
                value={fadeOut}
                onChange={(e) => setFadeOut(parseFloat(e.target.value) || 0)}
                className="focus:ring-[#6E59A5] focus:border-[#6E59A5]"
              />
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-[#6E59A5]/10 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-neutral-600">Output Duration:</span>
                <span className="ml-2 font-medium text-[#6E59A5]">
                  {formatTime(outputDuration)}
                </span>
              </div>
              <div>
                <span className="text-neutral-600">Fade In:</span>
                <span className="ml-2 font-medium text-[#6E59A5]">
                  {fadeIn.toFixed(2)}s
                </span>
              </div>
              <div>
                <span className="text-neutral-600">Fade Out:</span>
                <span className="ml-2 font-medium text-[#6E59A5]">
                  {fadeOut.toFixed(2)}s
                </span>
              </div>
            </div>
            <div className="text-xs text-neutral-500 italic">
              ✨ Professional Features: Web Worker decoding, Web Audio API fade
              preview, cached waveforms
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#6E59A5] hover:bg-[#5A4A8A] text-white"
          >
            Save & Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
