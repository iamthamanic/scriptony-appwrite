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
  } as Shot;
}
