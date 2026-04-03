/**
 * Map Appwrite `clips` rows to GraphQL-shaped camelCase for the SPA.
 */

export function mapClip(row: Record<string, any>): Record<string, any> {
  return {
    id: row.id,
    projectId: row.project_id,
    shotId: row.shot_id,
    sceneId: row.scene_id,
    startSec: typeof row.start_sec === "number" ? row.start_sec : Number(row.start_sec ?? 0),
    endSec: typeof row.end_sec === "number" ? row.end_sec : Number(row.end_sec ?? 0),
    laneIndex: row.lane_index ?? 0,
    orderIndex: row.order_index ?? 0,
    sourceInSec:
      row.source_in_sec !== undefined && row.source_in_sec !== null
        ? Number(row.source_in_sec)
        : undefined,
    sourceOutSec:
      row.source_out_sec !== undefined && row.source_out_sec !== null
        ? Number(row.source_out_sec)
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
