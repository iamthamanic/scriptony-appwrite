/**
 * Shared types for the Local Bridge.
 */

// ---------------------------------------------------------------------------
// Render Job
// ---------------------------------------------------------------------------

export type RenderJobStatus = "queued" | "executing" | "completed" | "failed";
export type ReviewStatus = "pending" | "accepted" | "rejected";
export type JobClass = "official" | "exploratory";

export interface RenderJobDocument {
  id: string;
  $id: string;
  userId: string;
  projectId: string;
  shotId: string;
  type: string;
  jobClass: JobClass;
  status: RenderJobStatus;
  reviewStatus: ReviewStatus;
  guideBundleId: string | null;
  styleProfileId: string | null;
  repairConfig: string | null;
  outputImageIds: string[];
  createdAt: string;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Appwrite Realtime Events
// ---------------------------------------------------------------------------

export interface RealtimeEvent {
  events: string[];
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ComfyUI
// ---------------------------------------------------------------------------

export interface ComfyUIPromptResult {
  promptId: string;
  number: number;
  nodeErrors?: Record<string, unknown>;
}

export interface ComfyUIHistoryEntry {
  status: {
    statusStr: string;
    completed: boolean;
    messages?: string[];
  };
  outputs: Record<string, ComfyUIOutputNode>;
}

export interface ComfyUIOutputNode {
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}

export interface ComfyUIExecutionProgress {
  nodeId: string;
  value: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Bridge Internal
// ---------------------------------------------------------------------------

export type BridgeJobState =
  | "pending"       // Event received, preparing workflow
  | "submitting"    // Submitting to ComfyUI
  | "executing"     // ComfyUI is running
  | "downloading"   // Downloading results from ComfyUI
  | "uploading"     // Uploading results to Appwrite Storage
  | "callback"      // Calling back to stage endpoint
  | "completed"     // Done
  | "failed";       // Error

export interface ActiveJob {
  jobId: string;
  promptId: string | null;
  state: BridgeJobState;
  startedAt: Date;
  error?: string;
}

/** Single context object per in-flight job — replaces 3 parallel Maps. */
export interface JobContext extends ActiveJob {
  /** Resolves when ComfyUI execution completes (WS or poll). */
  completion: PromiseWithResolvers<Record<string, unknown>>;
  /** AbortController to cancel polling when WS resolves. */
  pollAbort: AbortController;
  /** Whether the completion has been settled (resolved or rejected). */
  settled: boolean;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface ShotStatePayload {
  shotId: string;
  blenderSourceVersion?: string;
  blenderSyncRevision?: number;
}

export interface PreviewPayload {
  shotId: string;
  lastPreviewAt?: string;
}

export interface GlbPreviewPayload {
  shotId: string;
  glbPreviewFileId: string;
}