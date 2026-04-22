/**
 * Samples dominant colors from an image URL (CORS-permitting) for Style Guide palette extraction.
 */

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export async function extractPaletteFromImageUrl(
  url: string,
  maxColors = 5,
): Promise<string[]> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error("Bild konnte nicht geladen werden");
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const w = 48;
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const data = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map<
    string,
    { r: number; g: number; b: number; n: number }
  >();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    const cur = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r;
    cur.g += g;
    cur.b += b;
    cur.n += 1;
    buckets.set(key, cur);
  }
  const sorted = [...buckets.values()]
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, maxColors)
    .map((x) =>
      rgbToHex(
        Math.round(x.r / x.n),
        Math.round(x.g / x.n),
        Math.round(x.b / x.n),
      ),
    );
  return sorted;
}
