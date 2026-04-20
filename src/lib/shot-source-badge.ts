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

/**
 * Alle erkennbaren Medien am Shot für Auswahl-Listen (Import/Export).
 * Kombinationen möglich (z. B. STAGE2D + PNG-Vorschau).
 */
export function getShotStageSourceTags(
  shot: Shot | null | undefined,
): string[] {
  if (!shot) return ["—"];
  const tags: string[] = [];
  if (shot.stage2dFileId ?? shot.stage2d_file_id) tags.push("STAGE2D");
  if (shot.stage3dFileId ?? shot.stage3d_file_id) tags.push("STAGE3D");
  const url = shot.imageUrl?.trim();
  if (url) {
    const mime = (
      shot.shotImageMime ??
      shot.shot_image_mime ??
      ""
    ).toLowerCase();
    if (mime === "image/png" || /\.png(\?|#|$)/i.test(url)) tags.push("PNG");
    else if (
      mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime.includes("jpeg") ||
      /\.jpe?g(\?|#|$)/i.test(url)
    )
      tags.push("JPG");
    else if (mime.includes("webp") || /\.webp(\?|#|$)/i.test(url))
      tags.push("WEBP");
    else if (mime.includes("gif") || /\.gif(\?|#|$)/i.test(url))
      tags.push("GIF");
    else tags.push("BILD");
  }
  return tags.length ? tags : ["—"];
}

export function deriveShotSourceLabel(
  shot: Shot | null | undefined,
): ShotSourceBadgeLabel {
  if (!shot) return "BILD";
  const s2 = shot.stage2dFileId ?? shot.stage2d_file_id;
  const s3 = shot.stage3dFileId ?? shot.stage3d_file_id;
  if (s2) return "STAGE2D";
  if (s3) return "STAGE3D";
  const mime = (shot.shotImageMime ?? shot.shot_image_mime ?? "").toLowerCase();
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/pjpeg")
    return "JPG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/gif") return "GIF";
  const u = shot.imageUrl || "";
  if (/\.png(\?|#|$)/i.test(u)) return "PNG";
  if (/\.jpe?g(\?|#|$)/i.test(u)) return "JPG";
  if (/\.webp(\?|#|$)/i.test(u)) return "WEBP";
  if (/\.gif(\?|#|$)/i.test(u)) return "GIF";
  return "BILD";
}
