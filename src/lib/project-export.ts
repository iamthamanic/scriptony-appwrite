/**
 * Build JSON/PDF exports of project metadata (Scriptony branding in PDF).
 * Location: src/lib/project-export.ts
 */

import { jsPDF } from "jspdf";

export const PROJECT_EXPORT_SCHEMA_VERSION = 1;

const PDF_FIELD_KEYS = [
  "id",
  "title",
  "logline",
  "type",
  "genre",
  "duration",
  "linkedWorldId",
  "concept_blocks",
  "narrative_structure",
  "beat_template",
  "episode_layout",
  "season_engine",
  "target_pages",
  "words_per_page",
  "reading_speed_wpm",
  "cover_image_url",
  "current_words",
  "last_edited",
  "created_at",
  "updated_at",
] as const;

function typeLabelDe(t: string): string {
  const m: Record<string, string> = {
    film: "Film",
    series: "Serie",
    book: "Buch",
    audio: "Hörspiel",
  };
  return m[(t || "").toLowerCase()] || t || "(unbekannt)";
}

/** Like UI `parseStoredDurationMinutes`: API stores total minutes as number or text. */
function durationRawToTotalMinutes(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

/** Human-readable German duration for PDF (e.g. 90 → „1 Stunde 30 Min.“). */
function formatDurationDeFromStored(raw: unknown): string {
  const total = durationRawToTotalMinutes(raw);
  if (total <= 0) return "—";
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} Min`;
  if (hh === 1 && mm === 0) return "1 Stunde";
  if (hh === 1) return `1 Stunde ${mm} Min`;
  if (mm === 0) return `${hh} Stunden`;
  return `${hh} Stunden ${mm} Min`;
}

/** PDF labels for concept blocks (editor uses German titles like „Kernhaken“ for hook). */
function conceptBlockPdfTitle(row: Record<string, unknown>): string {
  const typ = String(row.type || "").trim().toLowerCase();
  const title = String(row.title || "").trim();
  if (typ === "hook" || title === "Kernhaken") return "Hook";
  if (title) return title;
  return typ || "Block";
}

function pickProjectFields(project: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PDF_FIELD_KEYS) {
    if (project[k] !== undefined) out[k] = project[k];
  }
  return out;
}

export function buildProjectExportEnvelope(
  project: Record<string, unknown>,
  meta?: { linkedWorldLabel?: string | null }
): Record<string, unknown> {
  const p = pickProjectFields(project);
  if (meta?.linkedWorldLabel) {
    p.linked_world_name = meta.linkedWorldLabel;
  }
  return {
    scriptonyExport: true,
    schemaVersion: PROJECT_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: p,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportFilenameBase(title: string, ext: "json" | "pdf"): string {
  const base =
    String(title || "projekt")
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 60)
      .replace(/^-+|-+$/g, "") || "projekt";
  const stamp = new Date().toISOString().slice(0, 10);
  return `scriptony-projekt-${base}-${stamp}.${ext}`;
}

export function jsonBlobFromEnvelope(envelope: Record<string, unknown>): Blob {
  return new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json;charset=utf-8" });
}

async function rasterLogoForPdf(logoSrc: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("project-export: logo load failed"));
    img.src = logoSrc;
  });
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("project-export: no 2d context");
  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  const scale = (Math.min(size / img.naturalWidth, size / img.naturalHeight) || 1) * 0.92;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

/** Loads project cover URL for embedding (CORS permitting). */
async function loadCoverImageForPdf(url: string | undefined): Promise<{ dataUrl: string; iw: number; ih: number } | null> {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("cover load failed"));
      img.src = url.trim();
    });
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw < 2 || ih < 2) return null;
    const maxPx = 960;
    const scale = Math.min(1, maxPx / Math.max(iw, ih));
    const cw = Math.round(iw * scale);
    const ch = Math.round(ih * scale);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), iw: cw, ih: ch };
  } catch {
    return null;
  }
}

/** Aligns with app light theme: Badge `bg-[#6E59A5]`, cards `bg-muted` / primary tint */
const PDF_THEME = {
  primary: [110, 89, 165] as const,
  primarySoft: [245, 242, 252] as const,
  border: [229, 221, 255] as const,
  cardBg: [252, 250, 255] as const,
  text: [28, 24, 35] as const,
  muted: [100, 96, 110] as const,
  white: [255, 255, 255] as const,
};

/**
 * A4 PDF styled like Scriptony UI: purple badges, soft cards, header band, logo top-right, optional cover centered below header.
 */
export async function generateProjectInfoPdfBlob(
  project: Record<string, unknown>,
  options: { logoSrc: string; linkedWorldLabel?: string | null }
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const headerBlockH = 34;
  const bottomSafe = 28;
  const maxW = pageW - margin * 2;
  const T = PDF_THEME;

  const logoMm = 18;
  /** Wrap width for left-aligned header title; keep text clear of top-right logo. */
  const headerTitleGapMm = 3;
  const titleMaxW = pageW - 2 * margin - logoMm - headerTitleGapMm;

  const coverUrl = typeof project.cover_image_url === "string" ? project.cover_image_url : undefined;
  const [logoUrl, coverLoaded] = await Promise.all([
    rasterLogoForPdf(options.logoSrc),
    loadCoverImageForPdf(coverUrl),
  ]);

  const coverMaxW = 52;
  const coverMaxH = 78;
  let coverDispW = 0;
  let coverDispH = 0;
  const coverY0 = headerBlockH + 5;
  if (coverLoaded) {
    const ar = coverLoaded.iw / coverLoaded.ih;
    coverDispW = coverMaxW;
    coverDispH = coverDispW / ar;
    if (coverDispH > coverMaxH) {
      coverDispH = coverMaxH;
      coverDispW = coverDispH * ar;
    }
  }

  const contentYAfterHeader = (): number => {
    if (coverLoaded) {
      return coverY0 + coverDispH + 8;
    }
    return headerBlockH + 10;
  };

  let y = contentYAfterHeader();

  const drawChrome = (opts: { includeCover: boolean }) => {
    doc.setFillColor(T.primarySoft[0], T.primarySoft[1], T.primarySoft[2]);
    doc.rect(0, 0, pageW, headerBlockH, "F");
    doc.setDrawColor(T.primary[0], T.primary[1], T.primary[2]);
    doc.setLineWidth(0.55);
    doc.line(0, headerBlockH, pageW, headerBlockH);

    const lx = pageW - margin - logoMm;
    const ly = 5.5;
    doc.addImage(logoUrl, "PNG", lx, ly, logoMm, logoMm);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(T.muted[0], T.muted[1], T.muted[2]);
    const tagline = "A Scriptony Project";
    const tagTw = doc.getTextWidth(tagline);
    doc.text(tagline, lx + (logoMm - tagTw) / 2, ly + logoMm + 2);

    const badgeH = 6;
    const badgePadX = 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const brandLabel = "Projekt";
    const bw = doc.getTextWidth(brandLabel) + badgePadX * 2;
    const headerBadgeX = margin;
    doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
    doc.roundedRect(headerBadgeX, 6, bw, badgeH, 1.4, 1.4, "F");
    doc.setTextColor(T.white[0], T.white[1], T.white[2]);
    doc.text(brandLabel, headerBadgeX + bw / 2, 6 + badgeH - 1.5, { align: "center" });

    doc.setTextColor(T.text[0], T.text[1], T.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const title = String(project.title || "Ohne Titel");
    const titleLines = doc.splitTextToSize(title, titleMaxW).slice(0, 2);
    let ty = 18;
    for (const line of titleLines) {
      doc.text(line, margin, ty);
      ty += 4.6;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(T.muted[0], T.muted[1], T.muted[2]);
    const stamp = `Export · ${new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}`;
    doc.text(stamp, margin, Math.min(ty + 2, 31));

    if (opts.includeCover && coverLoaded && coverDispW > 0 && coverDispH > 0) {
      const cx = (pageW - coverDispW) / 2;
      doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(cx - 0.7, coverY0 - 0.7, coverDispW + 1.4, coverDispH + 1.4, 2, 2, "S");
      doc.addImage(coverLoaded.dataUrl, "JPEG", cx, coverY0, coverDispW, coverDispH);
    }
  };

  drawChrome({ includeCover: true });

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - bottomSafe) {
      doc.addPage();
      drawChrome({ includeCover: false });
      y = headerBlockH + 10;
    }
  };

  const addSection = (heading: string, body: string) => {
    const bodyText = body.trim() || "—";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(bodyText, maxW - 6.4);
    const lineH = 4.85;
    const pad = 3.2;
    const badgeH = 5.5;
    const gap = 2.2;
    const cardH = lines.length * lineH + pad * 2;
    const blockH = badgeH + gap + cardH + 5;

    ensureSpace(blockH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const padX = 2.8;
    const tw = doc.getTextWidth(heading);
    const bw = Math.min(tw + padX * 2, maxW);
    const badgeX = margin;
    doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
    doc.roundedRect(badgeX, y, bw, badgeH, 1.3, 1.3, "F");
    doc.setTextColor(T.white[0], T.white[1], T.white[2]);
    doc.text(heading, badgeX + bw / 2, y + badgeH - 1.35, { align: "center" });
    let yy = y + badgeH + gap;

    const cardX = margin;
    doc.setFillColor(T.cardBg[0], T.cardBg[1], T.cardBg[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.22);
    doc.roundedRect(cardX, yy, maxW, cardH, 2, 2, "FD");

    doc.setTextColor(T.text[0], T.text[1], T.text[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    let ly = yy + pad + 3.75;
    for (const line of lines) {
      doc.text(line, margin + pad, ly);
      ly += lineH;
    }
    y = yy + cardH + 5;
  };

  const addConceptBlock = (blockTitle: string, content: string) => {
    const bodyText = content.trim() || "—";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    const lines = doc.splitTextToSize(bodyText, maxW - 6.4);
    const lineH = 4.75;
    const pad = 3;
    const subBadgeH = 5;
    const gap = 2;
    const cardH = lines.length * lineH + pad * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const padX = 2.5;
    const tw = doc.getTextWidth(blockTitle);
    const bw = Math.min(tw + padX * 2, maxW);
    const blockH = subBadgeH + gap + cardH + 4;
    ensureSpace(blockH);

    const conceptBadgeX = margin;
    doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
    doc.roundedRect(conceptBadgeX, y, bw, subBadgeH, 1.1, 1.1, "F");
    doc.setTextColor(T.white[0], T.white[1], T.white[2]);
    doc.text(blockTitle, conceptBadgeX + bw / 2, y + subBadgeH - 1.25, { align: "center" });
    let yy = y + subBadgeH + gap;

    doc.setFillColor(T.primarySoft[0], T.primarySoft[1], T.primarySoft[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.18);
    doc.roundedRect(margin, yy, maxW, cardH, 1.8, 1.8, "FD");
    doc.setTextColor(T.text[0], T.text[1], T.text[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    let ly = yy + pad + 3.6;
    for (const line of lines) {
      doc.text(line, margin + pad, ly);
      ly += lineH;
    }
    y = yy + cardH + 4;
  };

  const addSectionDividerBadge = (label: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const padX = 3;
    const tw = doc.getTextWidth(label);
    const bw = Math.min(tw + padX * 2, maxW);
    const bh = 6;
    const divBadgeX = margin;
    doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
    doc.roundedRect(divBadgeX, y, bw, bh, 1.4, 1.4, "F");
    doc.setTextColor(T.white[0], T.white[1], T.white[2]);
    doc.text(label, divBadgeX + bw / 2, y + bh - 1.45, { align: "center" });
    y += bh + 3.5;
  };

  const sections: Array<{ heading: string; body: string }> = [
    { heading: "Projekt-ID", body: String(project.id ?? "—") },
    { heading: "Logline", body: String(project.logline || "—") },
    { heading: "Typ", body: typeLabelDe(String(project.type || "")) },
    { heading: "Genre", body: String(project.genre || "—") },
    { heading: "Dauer", body: formatDurationDeFromStored(project.duration) },
  ];

  if (options.linkedWorldLabel) {
    sections.push({ heading: "Verknüpfte Welt", body: options.linkedWorldLabel });
  }

  sections.push(
    { heading: "Beat-Template", body: String(project.beat_template || "—") },
    {
      heading: "Erzählstruktur / Layout",
      body:
        project.type === "series"
          ? [
              project.episode_layout ? `Episoden-Layout: ${project.episode_layout}` : "",
              project.season_engine ? `Season-Engine: ${project.season_engine}` : "",
            ]
              .filter(Boolean)
              .join("\n") || "—"
          : String(project.narrative_structure || "—"),
    }
  );

  if (project.type === "book") {
    sections.push({
      heading: "Buch-Metriken",
      body: [
        project.target_pages != null ? `Ziel-Seiten: ${project.target_pages}` : "",
        project.words_per_page != null ? `Wörter/Seite: ${project.words_per_page}` : "",
        project.reading_speed_wpm != null ? `Lesegeschw. (WPM): ${project.reading_speed_wpm}` : "",
        project.current_words != null ? `Aktuelle Wörter (Stand): ${project.current_words}` : "",
      ]
        .filter(Boolean)
        .join("\n") || "—",
    });
  }

  if (project.cover_image_url) {
    sections.push({
      heading: "Cover (URL)",
      body: String(project.cover_image_url),
    });
  }

  for (const s of sections) {
    addSection(s.heading, s.body);
  }

  const rawBlocks = project.concept_blocks;
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    const withContent = rawBlocks.filter((row) => {
      if (!row || typeof row !== "object") return false;
      return String((row as Record<string, unknown>).content || "").trim().length > 0;
    });
    if (withContent.length > 0) {
      addSectionDividerBadge("Konzeptblöcke");
      for (const row of withContent) {
        const r = row as Record<string, unknown>;
        const title = conceptBlockPdfTitle(r);
        const content = String(r.content || "").trim();
        addConceptBlock(title, content);
      }
    }
  }

  const totalPages = (
    doc.internal as unknown as { getNumberOfPages: () => number }
  ).getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(T.muted[0], T.muted[1], T.muted[2]);
  const footerY = pageH - 9;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`Seite ${i}/${totalPages}`, pageW - margin, footerY, { align: "right" });
  }

  return doc.output("blob");
}

export async function shareFileIfPossible(file: File): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: file.name });
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return true;
    return false;
  }
}
