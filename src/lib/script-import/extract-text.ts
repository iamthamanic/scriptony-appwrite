/**
 * Plain-text extraction for script import (.txt, .docx, legacy .doc, .pdf).
 * Binary formats are isolated here so parsers stay text-only.
 */

import mammoth from 'mammoth';
import { Buffer } from 'buffer';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { readFileAsUtf8 } from './file';

let pdfWorkerConfigured = false;

function ensurePdfWorker(): void {
  if (!pdfWorkerConfigured) {
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    pdfWorkerConfigured = true;
  }
}

function fileExtensionLower(file: File): string {
  const n = file.name.toLowerCase();
  const dot = n.lastIndexOf('.');
  return dot >= 0 ? n.slice(dot) : '';
}

async function extractDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/** One text run from pdf.js getTextContent (user space: x grows right, y grows up). */
type PdfTextPiece = { str: string; x: number; y: number; w: number };

const PDF_Y_LINE_TOL = 6;
const PDF_SPACE_GAP_PT = 2.5;

function collectPdfTextPieces(items: ReadonlyArray<unknown>): PdfTextPiece[] {
  const out: PdfTextPiece[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as {
      str?: string;
      transform?: number[];
      width?: number;
    };
    const str = typeof item.str === 'string' ? item.str : '';
    const tr = item.transform;
    if (!str || !Array.isArray(tr) || tr.length < 6) continue;
    const x = Number(tr[4]);
    const y = Number(tr[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const w =
      typeof item.width === 'number' && Number.isFinite(item.width)
        ? item.width
        : Math.max(str.length * 3, 1);
    out.push({ str, x, y, w });
  }
  return out;
}

/**
 * Rebuild reading-order lines from PDF glyph runs so patterns like ^Kapitel|^Prolog
 * match at line start (raw join() drops newlines between runs).
 */
function pdfTextPiecesToLines(pieces: PdfTextPiece[]): string[] {
  if (pieces.length === 0) return [];
  const sorted = [...pieces].sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 0.25) return dy;
    return a.x - b.x;
  });

  const lines: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    const y0 = sorted[i].y;
    const linePieces: PdfTextPiece[] = [];
    while (
      i < sorted.length &&
      Math.abs(sorted[i].y - y0) <= PDF_Y_LINE_TOL
    ) {
      linePieces.push(sorted[i]);
      i++;
    }
    linePieces.sort((a, b) => a.x - b.x);
    let line = '';
    let prevEnd = -Infinity;
    for (const p of linePieces) {
      const gap = p.x - prevEnd;
      if (prevEnd >= 0 && gap > PDF_SPACE_GAP_PT) {
        line += /\s$/.test(line) || /^\s/.test(p.str) ? '' : ' ';
      }
      line += p.str;
      prevEnd = p.x + p.w;
    }
    const trimmed = line.replace(/\u00a0/g, ' ').trimEnd();
    if (trimmed.length > 0) lines.push(trimmed);
  }
  return lines;
}

async function extractPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  ensurePdfWorker();
  const data = new Uint8Array(arrayBuffer);
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  try {
    const pageBlocks: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pieces = collectPdfTextPieces(content.items);
      const lines = pdfTextPiecesToLines(pieces);
      if (lines.length > 0) pageBlocks.push(lines.join('\n'));
    }
    return pageBlocks.join('\n\n').replace(/\u00a0/g, ' ').trim();
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}

async function extractLegacyDoc(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const [cfbMod, docCodec, txtCodec] = await Promise.all([
      import('cfb'),
      import('word/dist/cjs/codecs/DOC/index.js'),
      import('word/dist/cjs/codecs/TXT/index.js'),
    ]);
    const buf = Buffer.from(arrayBuffer);
    const file = cfbMod.read(buf, { type: 'buffer' });
    const doc = docCodec.parse_cfb(file);
    return txtCodec.write_str(doc).trim();
  } catch (err) {
    console.warn('[script-import] .doc extract failed', err);
    throw new Error(
      'Word-.doc konnte nicht gelesen werden (Format beschädigt oder nicht unterstützt). Bitte als .docx speichern und erneut importieren.'
    );
  }
}

const TEXT_EXTENSIONS = new Set(['.txt', '.fountain', '.md']);

/**
 * Read file and return UTF-8 plain text for downstream Fountain/book parsers.
 */
export async function extractPlainTextForImport(file: File): Promise<string> {
  const ext = fileExtensionLower(file);

  if (TEXT_EXTENSIONS.has(ext)) {
    return readFileAsUtf8(file);
  }

  if (ext === '.docx') {
    return extractDocx(await file.arrayBuffer());
  }

  if (ext === '.doc') {
    return extractLegacyDoc(await file.arrayBuffer());
  }

  if (ext === '.pdf' || file.type === 'application/pdf') {
    return extractPdf(await file.arrayBuffer());
  }

  throw new Error(
    `Nicht unterstütztes Format (${ext || 'ohne Endung'}). Erlaubt: .txt, .fountain, .md, .doc, .docx, .pdf`
  );
}
