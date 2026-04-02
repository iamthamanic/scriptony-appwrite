/**
 * Style Guide tab: Übersicht — Kurztexte, Palette-Vorschau, Keywords, Avoid, gepinnte Referenzen.
 * Location: src/components/style-guide/StyleGuideOverviewTab.tsx
 */

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { StyleGuideData, StyleGuideItem, PatchStyleGuidePayload } from "../../lib/api/style-guide-api";
import { Loader2, Pin } from "lucide-react";

interface Props {
  data: StyleGuideData;
  saving: boolean;
  onSave: (patch: PatchStyleGuidePayload) => Promise<void>;
  onAddReference: () => void;
  onExport: () => void;
}

function PaletteStrip({ label, colors }: { label: string; colors: string[] }) {
  if (!colors.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {colors.map((c) => (
          <span
            key={c}
            className="h-7 w-10 rounded border border-border shadow-sm"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

export function StyleGuideOverviewTab({ data, saving, onSave, onAddReference, onExport }: Props) {
  const pinned = data.items.filter((i) => i.pinned).slice(0, 3);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const keywords = String(fd.get("keywords") || "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const avoid = String(fd.get("avoid_lines") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    void onSave({
      style_summary: String(fd.get("style_summary") || ""),
      tone_summary: String(fd.get("tone_summary") || ""),
      keywords,
      negative_keywords: avoid,
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sg-style-summary">Stilbeschreibung</Label>
            <Textarea
              id="sg-style-summary"
              name="style_summary"
              defaultValue={data.styleSummary}
              rows={4}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-tone">Tonalität (optional)</Label>
            <Textarea id="sg-tone" name="tone_summary" defaultValue={data.toneSummary} rows={4} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sg-keywords">Keywords (Komma oder Zeile)</Label>
          <Textarea
            id="sg-keywords"
            name="keywords"
            defaultValue={data.keywords.join(", ")}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sg-avoid-o">Nicht gewünscht / Avoid (eine Zeile pro Punkt)</Label>
          <Textarea
            id="sg-avoid-o"
            name="avoid_lines"
            defaultValue={data.negativeKeywords.join("\n")}
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Speichern
          </Button>
          <Button type="button" variant="default" onClick={onAddReference}>
            Referenz hinzufügen
          </Button>
          <Button type="button" variant="outline" onClick={onExport}>
            Exportieren
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Farbpalette (Vorschau)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PaletteStrip label="Primär" colors={data.palettePrimary} />
          <PaletteStrip label="Sekundär" colors={data.paletteSecondary} />
          <PaletteStrip label="Akzent" colors={data.paletteAccent} />
          <PaletteStrip label="Hintergrund" colors={data.paletteBackground} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pin className="size-4" />
            Schlüsselreferenzen (max. 3 angeheftet)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pinned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine angehefteten Referenzen — Tab „Referenzen“.</p>
          ) : (
            <ul className="space-y-2">
              {pinned.map((i: StyleGuideItem) => (
                <li key={i.id} className="flex gap-3 text-sm">
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt="" className="h-14 w-10 rounded object-cover border" />
                  ) : (
                    <div className="h-14 w-10 rounded bg-muted" />
                  )}
                  <div>
                    <div className="font-medium">{i.title || "Ohne Titel"}</div>
                    <div className="text-muted-foreground line-clamp-2">{i.caption}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
