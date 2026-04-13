/**
 * Freshness Model (Ticket 11) — canonical stale-status helpers.
 *
 * These helpers deterministically compute whether a shot's data is stale
 * based on revision counters and timestamps stored on the `shots` collection.
 *
 * Rules (from the ticket):
 *   guides stale:  guideBundleRevision < blenderSyncRevision
 *   render stale:   renderRevision < guideBundleRevision
 *                  OR renderRevision < styleProfileRevision
 *   preview stale: !lastPreviewAt OR !lastBlenderSyncAt
 *                  OR lastPreviewAt < lastBlenderSyncAt
 *
 * This module is shared between backend functions and (eventually) the frontend.
 * The backend uses it in sync/stage endpoints; the frontend will import
 * the pure calculation functions to display UI indicators.
 *
 * IMPORTANT: All functions are pure — no DB access, no side effects.
 * The caller provides a ShotFreshnessInput (a flat subset of shot fields).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Flat subset of shot fields needed for freshness calculation.
 * Consumed from any DB row or API response that has these fields.
 */
export type ShotFreshnessInput = {
  blenderSyncRevision?: number | string | null;
  guideBundleRevision?: number | string | null;
  styleProfileRevision?: number | string | null;
  renderRevision?: number | string | null;
  lastBlenderSyncAt?: string | null;
  lastPreviewAt?: string | null;
};

export type FreshnessStatus = "fresh" | "stale" | "unknown";

export type ShotFreshnessResult = {
  /** guides are out of date relative to the latest Blender sync */
  guidesStale: FreshnessStatus;
  /** the accepted render is behind the guides or style */
  renderStale: FreshnessStatus;
  /** the 2D preview is older than the latest Blender sync */
  previewStale: FreshnessStatus;
  /** overall summary — "stale" if any dimension is stale */
  overall: FreshnessStatus;
  /** human-readable reasons for staleness (empty when fresh) */
  reasons: string[];
};

// ---------------------------------------------------------------------------
// Coercion helpers
// ---------------------------------------------------------------------------

function toInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallback;
}

function toTimestamp(value: unknown): number {
  if (typeof value === "string" && value.trim()) {
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return ts;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Pure calculation functions
// ---------------------------------------------------------------------------

/**
 * guides stale: guideBundleRevision < blenderSyncRevision
 * If either revision is missing/zero, status is "unknown".
 */
export function calcGuidesStale(shot: ShotFreshnessInput): FreshnessStatus {
  const guideRev = toInt(shot.guideBundleRevision);
  const blenderRev = toInt(shot.blenderSyncRevision);

  if (guideRev === 0 && blenderRev === 0) return "unknown";
  if (guideRev === 0 || blenderRev === 0) return "unknown";

  return guideRev < blenderRev ? "stale" : "fresh";
}

/**
 * render stale: renderRevision < guideBundleRevision
 *               OR renderRevision < styleProfileRevision
 * If renderRevision is zero, status is "unknown".
 */
export function calcRenderStale(shot: ShotFreshnessInput): FreshnessStatus {
  const renderRev = toInt(shot.renderRevision);
  const guideRev = toInt(shot.guideBundleRevision);
  const styleRev = toInt(shot.styleProfileRevision);

  if (renderRev === 0) return "unknown";

  const behindGuides = guideRev > 0 && renderRev < guideRev;
  const behindStyle = styleRev > 0 && renderRev < styleRev;

  if (behindGuides || behindStyle) return "stale";
  if (guideRev === 0 && styleRev === 0) return "unknown";

  return "fresh";
}

/**
 * preview stale: !lastPreviewAt OR !lastBlenderSyncAt
 *                OR lastPreviewAt < lastBlenderSyncAt
 * If timestamps are missing, status is "unknown" or "stale" accordingly.
 */
export function calcPreviewStale(shot: ShotFreshnessInput): FreshnessStatus {
  if (!shot.lastPreviewAt) return "unknown";
  if (!shot.lastBlenderSyncAt) return "unknown";

  const previewTs = toTimestamp(shot.lastPreviewAt);
  const syncTs = toTimestamp(shot.lastBlenderSyncAt);

  if (previewTs === 0 || syncTs === 0) return "unknown";

  return previewTs < syncTs ? "stale" : "fresh";
}

/**
 * Compute the full freshness result for a shot.
 * Pure function — no side effects, no DB access.
 */
export function computeFreshness(shot: ShotFreshnessInput): ShotFreshnessResult {
  const guidesStale = calcGuidesStale(shot);
  const renderStale = calcRenderStale(shot);
  const previewStale = calcPreviewStale(shot);

  const reasons: string[] = [];
  if (guidesStale === "stale") reasons.push("guides_stale");
  if (renderStale === "stale") reasons.push("render_stale");
  if (previewStale === "stale") reasons.push("preview_stale");

  const anyStale = guidesStale === "stale" || renderStale === "stale" || previewStale === "stale";
  const anyUnknown =
    (guidesStale === "unknown" && guidesStale !== "stale") ||
    (renderStale === "unknown" && renderStale !== "stale") ||
    (previewStale === "unknown" && previewStale !== "stale");

  let overall: FreshnessStatus;
  if (anyStale) {
    overall = "stale";
  } else if (
    guidesStale === "unknown" &&
    renderStale === "unknown" &&
    previewStale === "unknown"
  ) {
    overall = "unknown";
  } else if (anyUnknown) {
    // Some dimensions unknown, none stale → treat as unknown
    overall = "unknown";
  } else {
    overall = "fresh";
  }

  return {
    guidesStale,
    renderStale,
    previewStale,
    overall,
    reasons,
  };
}
