/**
 * Job Types - Frontend (mirrors backend types)
 * DRY: Keep in sync with functions/_shared/jobs/types.ts
 */

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobStatusResponse<T = unknown> {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: T;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStartResponse {
  jobId: string;
  status: JobStatus;
  message: string;
  createdAt: string;
}

export interface JobPollingOptions {
  intervalMs?: number; // Default: 1000ms
  maxPolls?: number; // Default: 300 (5 minutes at 1s interval)
  timeoutMs?: number; // Default: 300000 (5 minutes)
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: JobStatus) => void;
}
