/**
 * Job API Client - DRY: Centralized job operations
 * All long-running operations go through this layer
 */

import type { JobStatusResponse, JobStartResponse } from "./types";
import { apiClient } from "../api-client";

const JOBS_BASE = "/v1";

/**
 * Start a new async job
 * Returns immediately with jobId
 */
export async function startJob<TPayload>(
  functionName: string,
  payload: TPayload,
): Promise<JobStartResponse> {
  const response = await apiClient.post<JobStartResponse>(
    `${JOBS_BASE}/jobs/${functionName}`,
    payload,
  );

  return response;
}

/**
 * Quick status check - always < 100ms
 */
export async function getJobStatus<TResult>(
  jobId: string,
): Promise<JobStatusResponse<TResult>> {
  const response = await apiClient.get<JobStatusResponse<TResult>>(
    `${JOBS_BASE}/jobs/${jobId}/status`,
  );

  return response;
}

/**
 * Get final result (only if completed)
 */
export async function getJobResult<TResult>(jobId: string): Promise<TResult> {
  const response = await apiClient.get<{ result: TResult }>(
    `${JOBS_BASE}/jobs/${jobId}/result`,
  );

  return response.result;
}

/**
 * Cancel a job (if supported)
 */
export async function cancelJob(jobId: string): Promise<void> {
  await apiClient.post(`${JOBS_BASE}/jobs/${jobId}/cancel`, {});
}
