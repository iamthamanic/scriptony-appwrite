/**
 * Progressive Waveform Renderer
 * High-performance canvas-based waveform with progressive loading
 * Supports trimming, fading, and real-time updates
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface ProgressiveWaveformProps {
  audioUrl: string;
  width?: number;
  height?: number;
  peaks?: number[];
  duration?: number;
  startTime?: number;
  endTime?: number;
  fadeIn?: number;
  fadeOut?: number;
  onWaveformReady?: (peaks: number[], duration: number) => void;
  onStartTimeChange?: (time: number) => void;
  onEndTimeChange?: (time: number) => void;
  onFadeInChange?: (fade: number) => void;
  onFadeOutChange?: (fade: number) => void;
}

interface DragState {
  type: "start" | "end" | "fadeIn" | "fadeOut" | null;
  startX: number;
  startValue: number;
}

export function ProgressiveWaveform({
  audioUrl,
  width = 800,
  height = 120,
  peaks: initialPeaks,
  duration: initialDuration,
  startTime = 0,
  endTime,
  fadeIn = 0,
  fadeOut = 0,
  onWaveformReady,
  onStartTimeChange,
  onEndTimeChange,
  onFadeInChange,
  onFadeOutChange,
}: ProgressiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[]>(initialPeaks || []);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(!initialPeaks);
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    startX: 0,
    startValue: 0,
  });
  const workerRef = useRef<Worker | null>(null);

  const actualEndTime = endTime ?? duration;

  // Initialize Web Worker
  useEffect(() => {
    if (!initialPeaks) {
      workerRef.current = new Worker(
        new URL("/workers/audio-decoder.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );

      workerRef.current.onmessage = (e) => {
        if (e.data.type === "success") {
          setPeaks(e.data.peaks);
          setDuration(e.data.duration);
          setIsLoading(false);
          onWaveformReady?.(e.data.peaks, e.data.duration);
        } else if (e.data.type === "error") {
          console.error("[Waveform] Worker error:", e.data.error);
          setIsLoading(false);
        }
      };
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [initialPeaks, onWaveformReady]);

  // Load audio and decode
  useEffect(() => {
    if (initialPeaks || !audioUrl) return;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        console.log("[Waveform] Loading audio from:", audioUrl);

        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Failed to fetch audio");

        const arrayBuffer = await response.arrayBuffer();

        // Send to worker for decoding
        workerRef.current?.postMessage({
          type: "decode",
          audioBuffer: arrayBuffer,
          peaksPerSecond: 100, // 100 peaks per second for smooth rendering
        });
      } catch (error) {
        console.error("[Waveform] Load error:", error);
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [audioUrl, initialPeaks]);

  // Render waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || peaks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range
    const visibleStartTime = startTime;
    const visibleEndTime = actualEndTime;
    const visibleDuration = visibleEndTime - visibleStartTime;

    // Calculate which peaks to draw
    const peaksPerSecond = peaks.length / duration;
    const startPeakIndex = Math.floor(visibleStartTime * peaksPerSecond);
    const endPeakIndex = Math.ceil(visibleEndTime * peaksPerSecond);
    const visiblePeaks = peaks.slice(startPeakIndex, endPeakIndex);

    // Draw waveform
    const barWidth = width / visiblePeaks.length;
    const centerY = height / 2;
    const maxBarHeight = height * 0.8;

    visiblePeaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = peak * maxBarHeight;

      // Calculate opacity based on fade
      const timeInAudio =
        visibleStartTime + (index / visiblePeaks.length) * visibleDuration;
      let opacity = 1;

      if (fadeIn > 0 && timeInAudio < visibleStartTime + fadeIn) {
        opacity = (timeInAudio - visibleStartTime) / fadeIn;
      }
      if (fadeOut > 0 && timeInAudio > visibleEndTime - fadeOut) {
        opacity = (visibleEndTime - timeInAudio) / fadeOut;
      }

      opacity = Math.max(0, Math.min(1, opacity));

      // Draw bar
      ctx.fillStyle = `rgba(110, 89, 165, ${opacity})`;
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        Math.max(1, barWidth - 1),
        barHeight,
      );
    });

    // Draw trim handles
    drawHandle(ctx, 0, height, "#00ff00", "L"); // Start (left)
    drawHandle(ctx, width, height, "#ff0000", "R"); // End (right)

    // Draw fade handles if fades exist
    if (fadeIn > 0) {
      const fadeInX = (fadeIn / visibleDuration) * width;
      drawFadeHandle(ctx, fadeInX, height, "#ffaa00", "FI");
    }
    if (fadeOut > 0) {
      const fadeOutX = width - (fadeOut / visibleDuration) * width;
      drawFadeHandle(ctx, fadeOutX, height, "#ffaa00", "FO");
    }
  }, [
    peaks,
    duration,
    width,
    height,
    startTime,
    actualEndTime,
    fadeIn,
    fadeOut,
  ]);

  // Helper to draw handles
  const drawHandle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    color: string,
    label: string,
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, 0, 4, height);
    ctx.font = "10px monospace";
    ctx.fillText(label, x - 8, 12);
  };

  const drawFadeHandle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    color: string,
    label: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, height / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "9px monospace";
    ctx.fillText(label, x - 10, height / 2 - 10);
  };

  // Mouse event handlers for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || duration === 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timePerPixel = (actualEndTime - startTime) / width;

      // Check which handle was clicked
      const tolerance = 10;

      if (Math.abs(x) < tolerance) {
        setDragState({ type: "start", startX: x, startValue: startTime });
      } else if (Math.abs(x - width) < tolerance) {
        setDragState({ type: "end", startX: x, startValue: actualEndTime });
      } else if (fadeIn > 0) {
        const fadeInX = (fadeIn / (actualEndTime - startTime)) * width;
        if (Math.abs(x - fadeInX) < tolerance) {
          setDragState({ type: "fadeIn", startX: x, startValue: fadeIn });
        }
      } else if (fadeOut > 0) {
        const fadeOutX =
          width - (fadeOut / (actualEndTime - startTime)) * width;
        if (Math.abs(x - fadeOutX) < tolerance) {
          setDragState({ type: "fadeOut", startX: x, startValue: fadeOut });
        }
      }
    },
    [width, duration, startTime, actualEndTime, fadeIn, fadeOut],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.type || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const deltaX = x - dragState.startX;
      const deltaTime = deltaX * ((actualEndTime - startTime) / width);

      if (dragState.type === "start") {
        const newStart = Math.max(
          0,
          Math.min(actualEndTime - 0.1, dragState.startValue + deltaTime),
        );
        onStartTimeChange?.(newStart);
      } else if (dragState.type === "end") {
        const newEnd = Math.max(
          startTime + 0.1,
          Math.min(duration, dragState.startValue + deltaTime),
        );
        onEndTimeChange?.(newEnd);
      } else if (dragState.type === "fadeIn") {
        const newFade = Math.max(
          0,
          Math.min(actualEndTime - startTime, dragState.startValue + deltaTime),
        );
        onFadeInChange?.(newFade);
      } else if (dragState.type === "fadeOut") {
        const newFade = Math.max(
          0,
          Math.min(actualEndTime - startTime, dragState.startValue - deltaTime),
        );
        onFadeOutChange?.(newFade);
      }
    },
    [
      dragState,
      width,
      startTime,
      actualEndTime,
      duration,
      onStartTimeChange,
      onEndTimeChange,
      onFadeInChange,
      onFadeOutChange,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setDragState({ type: null, startX: 0, startValue: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ width, height, cursor: dragState.type ? "grabbing" : "grab" }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-6 h-6 animate-spin text-[#6E59A5]" />
          <span className="ml-2 text-sm">Decoding audio...</span>
        </div>
      )}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
