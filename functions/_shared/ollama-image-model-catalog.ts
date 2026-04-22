/**
 * Image-generation model IDs for Ollama Cloud: /api/tags only lists pulled models;
 * we merge /v1/models plus this list so Flux and peers stay selectable before pull.
 * Location: functions/_shared/ollama-image-model-catalog.ts
 */

const CTX = 8192;

export type OllamaModelRow = {
  id: string;
  name: string;
  context_window: number;
};

/** Official / common Ollama image models (see ollama.com/blog/image-generation). */
export const OLLAMA_CLOUD_IMAGE_MODEL_SUGGESTIONS: OllamaModelRow[] = [
  {
    id: "x/flux2-klein",
    name: "x/flux2-klein (FLUX.2 Klein)",
    context_window: CTX,
  },
  {
    id: "x/z-image-turbo",
    name: "x/z-image-turbo (Z-Image Turbo)",
    context_window: CTX,
  },
];

/** Prefer rows from the first list; append unseen ids from later lists; sort by id. */
export function mergeOllamaModelRows(
  primary: OllamaModelRow[],
  ...secondary: OllamaModelRow[][]
): OllamaModelRow[] {
  const seen = new Set(primary.map((m) => m.id));
  const out = [...primary];
  for (const list of secondary) {
    for (const m of list) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function v1ModelsPayloadToRows(payload: {
  data?: Array<{ id?: string }>;
}): OllamaModelRow[] {
  const rows: OllamaModelRow[] = [];
  for (const m of payload.data ?? []) {
    const id = String(m.id || "").trim();
    if (!id) continue;
    rows.push({ id, name: id, context_window: CTX });
  }
  return rows;
}
