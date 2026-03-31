import type { Shot } from "@/lib/types";

/** API-Rohdaten → Shot-Shape für die Stage-Export-UI (host-neutral nutzbar). */
export function normalizeTimelineShot(raw: Record<string, unknown>): Shot {
  return {
    id: String(raw.id),
    sceneId: String(raw.scene_id ?? raw.sceneId ?? ""),
    shotNumber: String(raw.shot_number ?? raw.shotNumber ?? ""),
    description: typeof raw.description === "string" ? raw.description : undefined,
    orderIndex: Number(raw.order_index ?? raw.orderIndex ?? 0),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ""),
    imageUrl:
      typeof raw.image_url === "string"
        ? raw.image_url
        : typeof raw.imageUrl === "string"
          ? raw.imageUrl
          : undefined,
    stage2dFileId:
      typeof raw.stage2d_file_id === "string"
        ? raw.stage2d_file_id
        : typeof raw.stage2dFileId === "string"
          ? raw.stage2dFileId
          : undefined,
    stage3dFileId:
      typeof raw.stage3d_file_id === "string"
        ? raw.stage3d_file_id
        : typeof raw.stage3dFileId === "string"
          ? raw.stage3dFileId
          : undefined,
    shotImageMime:
      typeof raw.shot_image_mime === "string"
        ? raw.shot_image_mime
        : typeof raw.shotImageMime === "string"
          ? raw.shotImageMime
          : undefined,
  } as Shot;
}
