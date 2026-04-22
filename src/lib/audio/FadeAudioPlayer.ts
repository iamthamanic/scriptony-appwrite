/**
 * Fade Audio Player
 * Web Audio API based player with real-time fade in/out support
 * Uses GainNode with linearRampToValueAtTime for smooth fading
 */

export interface FadeAudioPlayerOptions {
  fadeIn?: number;
  fadeOut?: number;
  startTime?: number;
  endTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

export class FadeAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private isPlaying = false;
  private animationFrameId: number | null = null;

  private options: Required<FadeAudioPlayerOptions> = {
    fadeIn: 0,
    fadeOut: 0,
    startTime: 0,
    endTime: 0,
    onTimeUpdate: () => {},
    onEnded: () => {},
  };

  constructor(options?: FadeAudioPlayerOptions) {
    this.updateOptions(options);
  }

  /**
   * Update player options (fade times, trim times)
   */
  updateOptions(options?: FadeAudioPlayerOptions) {
    if (options) {
      this.options = {
        ...this.options,
        ...options,
      };
    }
  }

  /**
   * Load audio from URL
   */
  async loadAudio(url: string): Promise<void> {
    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      console.log("[FadeAudioPlayer] Loading audio from:", url);

      // Fetch audio file
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch audio");

      const arrayBuffer = await response.arrayBuffer();

      // Decode audio data
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Set default endTime if not specified
      if (this.options.endTime === 0) {
        this.options.endTime = this.audioBuffer.duration;
      }

      console.log(
        "[FadeAudioPlayer] Audio loaded, duration:",
        this.audioBuffer.duration,
      );
    } catch (error) {
      console.error("[FadeAudioPlayer] Load error:", error);
      throw error;
    }
  }

  /**
   * Play audio with fade effects
   */
  play(): void {
    if (!this.audioContext || !this.audioBuffer) {
      console.error("[FadeAudioPlayer] Cannot play: audio not loaded");
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    // Stop any currently playing audio
    this.stop();

    // Create source node
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();

    // Connect nodes: source -> gain -> destination
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Calculate play parameters
    const { startTime, endTime, fadeIn, fadeOut } = this.options;
    const playDuration = endTime - startTime;
    const currentTime = this.audioContext.currentTime;

    // Set initial gain (start at 0 if fade-in, else 1)
    this.gainNode.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, currentTime);

    // Schedule fade-in
    if (fadeIn > 0) {
      const fadeInEnd = Math.min(fadeIn, playDuration);
      this.gainNode.gain.linearRampToValueAtTime(1, currentTime + fadeInEnd);
      console.log("[FadeAudioPlayer] Fade-in scheduled:", fadeIn, "seconds");
    }

    // Schedule fade-out
    if (fadeOut > 0) {
      const fadeOutStart = Math.max(0, playDuration - fadeOut);
      this.gainNode.gain.setValueAtTime(1, currentTime + fadeOutStart);
      this.gainNode.gain.linearRampToValueAtTime(0, currentTime + playDuration);
      console.log("[FadeAudioPlayer] Fade-out scheduled:", fadeOut, "seconds");
    }

    // Set up end callback
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.options.onEnded();
        this.stopTimeUpdates();
      }
    };

    // Start playback from trimmed start position
    this.sourceNode.start(0, startTime, playDuration);
    this.startedAt = currentTime - this.pausedAt;
    this.isPlaying = true;

    // Start time updates
    this.startTimeUpdates();

    console.log("[FadeAudioPlayer] Playing:", {
      startTime,
      endTime,
      duration: playDuration,
      fadeIn,
      fadeOut,
    });
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying || !this.audioContext) return;

    const elapsed = this.audioContext.currentTime - this.startedAt;
    this.pausedAt = elapsed;

    this.stop();
    console.log("[FadeAudioPlayer] Paused at:", this.pausedAt);
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Ignore errors from stopping already-stopped sources
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    this.isPlaying = false;
    this.pausedAt = 0;
    this.stopTimeUpdates();
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext) return 0;

    if (this.isPlaying) {
      const elapsed = this.audioContext.currentTime - this.startedAt;
      return this.options.startTime + elapsed;
    }

    return this.options.startTime + this.pausedAt;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get audio duration
   */
  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  /**
   * Start time update loop
   */
  private startTimeUpdates(): void {
    const update = () => {
      if (!this.isPlaying) return;

      const currentTime = this.getCurrentTime();
      this.options.onTimeUpdate(currentTime);

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * Stop time update loop
   */
  private stopTimeUpdates(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer = null;
  }
}
