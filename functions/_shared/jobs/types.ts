/**
 * Job Queue Types - Shared between all functions
 * SOLID: Interface Segregation for long-running operations
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Job<T = unknown> {
  $id: string;
  functionName: string;
  status: JobStatus;
  payload: unknown;
  result?: T;
  error?: string;
  progress?: number; // 0-100 for progress bars
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCreateRequest {
  functionName: string;
  payload: unknown;
}

export interface JobStatusResponse<T = unknown> {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: T;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for functions that support async execution
export interface IAsyncJobHandler<TPayload, TResult> {
  execute(payload: TPayload): Promise<TResult>;
  getJobId(payload: TPayload): string;
}
