import { apiGet, apiPut, apiPost, unwrapApiResult } from "../api-client";
import type { RenderJob } from "../types";

export interface CreateRenderJobPayload {
  projectId: string;
  shotId: string;
  type: string;
  jobClass: string;
  guideBundleId?: string;
  styleProfileId?: string;
  repairConfig?: string;
}

export async function listRenderJobs(shotId: string): Promise<RenderJob[]> {
  const result = await apiGet<{ jobs: RenderJob[] }>(
    `/stage/render-jobs?shotId=${encodeURIComponent(shotId)}`,
  );
  const data = unwrapApiResult(result);
  return data?.jobs ?? [];
}

export async function getRenderJob(jobId: string): Promise<RenderJob> {
  const result = await apiGet<{ job: RenderJob }>(
    `/stage/render-jobs/${encodeURIComponent(jobId)}`,
  );
  const data = unwrapApiResult(result);
  return data.job;
}

export async function acceptRenderJob(jobId: string): Promise<RenderJob> {
  const result = await apiPut<{ job: RenderJob }>(
    `/stage/render-jobs/${encodeURIComponent(jobId)}/accept`,
    {},
  );
  const data = unwrapApiResult(result);
  return data.job;
}

export async function rejectRenderJob(jobId: string): Promise<RenderJob> {
  const result = await apiPut<{ job: RenderJob }>(
    `/stage/render-jobs/${encodeURIComponent(jobId)}/reject`,
    {},
  );
  const data = unwrapApiResult(result);
  return data.job;
}

export async function createRenderJob(
  payload: CreateRenderJobPayload,
): Promise<RenderJob> {
  const result = await apiPost<{ job: RenderJob }>(
    "/stage/render-jobs",
    payload,
  );
  const data = unwrapApiResult(result);
  return data.job;
}
