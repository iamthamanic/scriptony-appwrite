/**
 * Audio Decoder Web Worker
 * Decodes audio files off the main thread for non-blocking performance
 * Generates waveform peaks data for progressive rendering
 */

interface DecodeRequest {
  type: "decode";
  audioBuffer: ArrayBuffer;
  sampleRate?: number;
  peaksPerSecond?: number;
}

interface DecodeResponse {
  type: "success" | "error";
  peaks?: number[];
  duration?: number;
  sampleRate?: number;
  error?: string;
}

self.onmessage = async (e: MessageEvent<DecodeRequest>) => {
  const {
    type,
    audioBuffer,
    sampleRate = 44100,
    peaksPerSecond = 100,
  } = e.data;

  if (type !== "decode") {
    postMessage({
      type: "error",
      error: "Unknown message type",
    } as DecodeResponse);
    return;
  }

  try {
    // Create offline audio context for decoding
    const audioContext = new OfflineAudioContext(1, sampleRate, sampleRate);

    // Decode audio data
    const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

    const duration = decodedBuffer.duration;
    const channelData = decodedBuffer.getChannelData(0); // Use first channel (mono or left)
    const totalSamples = channelData.length;

    // Calculate number of peaks based on duration and peaksPerSecond
    const totalPeaks = Math.floor(duration * peaksPerSecond);
    const samplesPerPeak = Math.floor(totalSamples / totalPeaks);

    // Generate peaks
    const peaks: number[] = [];

    for (let i = 0; i < totalPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, totalSamples);

      // Find max absolute value in this segment
      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }

      peaks.push(max);
    }

    // Send success response
    postMessage({
      type: "success",
      peaks,
      duration,
      sampleRate: decodedBuffer.sampleRate,
    } as DecodeResponse);
  } catch (error) {
    console.error("[Audio Worker] Decode error:", error);
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown decode error",
    } as DecodeResponse);
  }
};

// Export for TypeScript
export {};
