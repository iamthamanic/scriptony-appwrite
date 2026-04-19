import { apiGet, unwrapApiResult } from "../api-client";
import type { ShotFreshnessResult } from "../types";

export async function fetchFreshness(
  shotId: string,
): Promise<ShotFreshnessResult> {
  const result = await apiGet<{
    shotId: string;
    freshness: ShotFreshnessResult;
  }>(`/sync/freshness/${encodeURIComponent(shotId)}`);
  const data = unwrapApiResult(result);
  return data.freshness;
}
