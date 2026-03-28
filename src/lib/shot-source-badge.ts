/**
 * Quell-Typ für Shot-Bild / Stage-Dokument (UI-Badge auf der Stage).
 */
import type { Shot } from "@/lib/types";

export type ShotSourceBadgeLabel =
  | "PNG"
  | "JPG"
  | "WEBP"
  | "GIF"
  | "STAGE2D"
  | "STAGE3D"
  | "BILD";

export function deriveShotSourceLabel(shot: Shot | null | undefined): ShotSourceBadgeLabel {
  if (!shot) return "BILD";
  const s2 = shot.stage2dFileId ?? shot.stage2d_file_id;
  const s3 = shot.stage3dFileId ?? shot.stage3d_file_id;
  if (s2) return "STAGE2D";
  if (s3) return "STAGE3D";
  const mime = (shot.shotImageMime ?? shot.shot_image_mime ?? "").toLowerCase();
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/pjpeg") return "JPG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/gif") return "GIF";
  const u = shot.imageUrl || "";
  if (/\.png(\?|#|$)/i.test(u)) return "PNG";
  if (/\.jpe?g(\?|#|$)/i.test(u)) return "JPG";
  if (/\.webp(\?|#|$)/i.test(u)) return "WEBP";
  if (/\.gif(\?|#|$)/i.test(u)) return "GIF";
  return "BILD";
}
