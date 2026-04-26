/**
 * Style Guide tab: Regeln & Export — Must-have, Avoid, Palette, Prompt, Cover-Toggle.
 * Location: src/components/style-guide/StyleGuideRulesExportTab.tsx
 */

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type {
  StyleGuideData,
  PatchStyleGuidePayload,
} from "../../lib/api/style-guide-api";
import * as StyleGuideApi from "../../lib/api/style-guide-api";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import { PaletteFieldCard } from "./PaletteFieldCard";
import { parseHexList } from "./palette-utils";

interface Props {
  projectId: string;
  data: StyleGuideData;
  saving: boolean;
  onSave: (patch: PatchStyleGuidePayload) => Promise<void>;
  onChange: (sg: StyleGuideData) => void;
  useForCover: boolean;
  onUseForCoverChange: (v: boolean) => void;
}

export function StyleGuideRulesExportTab({
  projectId,
  data,
  saving,
  onSave,
  onChange,
  useForCover,
  onUseForCoverChange,
}: Props) {
  const [copying, setCopying] = useState(false);

  const handleRulesSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const must = String(fd.get("must_have") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const avoid = String(fd.get("avoid_rules") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    void onSave({
      must_have: must,
      avoid,
      palette_primary: parseHexList(String(fd.get("pal_pri") || "")),
      palette_secondary: parseHexList(String(fd.get("pal_sec") || "")),
      palette_accent: parseHexList(String(fd.get("pal_acc") || "")),
      palette_background: parseHexList(String(fd.get("pal_bg") || "")),
      typography_notes: String(fd.get("typo") || ""),
    });
  };

  async function handleBuild() {
    try {
      const res = await StyleGuideApi.buildPrompt(projectId);
      onChange(res.styleGuide);
      toast.success("Kompakter Prompt aktualisiert");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function handleExport() {
    try {
      const res = await StyleGuideApi.exportStyleGuide(projectId);
      onChange(res.styleGuide);
      await navigator.clipboard.writeText(
        JSON.stringify(res.exportPayload, null, 2),
      );
      toast.success("Export in Zwischenablage kopiert");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function copyPrompt() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(data.compactPrompt || "");
      toast.success("Kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleRulesSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Must-have</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Eine Zeile pro Regel
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="sg-must"
                name="must_have"
                defaultValue={data.mustHave.join("\n")}
                rows={5}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avoid</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Eine Zeile pro Punkt
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="sg-avoid-r"
                name="avoid_rules"
                defaultValue={data.avoid.join("\n")}
                rows={5}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Farbpalette</Label>
          <p className="text-xs text-muted-foreground">
            Hex-Werte mit Komma; Vorschau und Abstufungen beziehen sich auf die
            erste gültige Farbe pro Gruppe.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PaletteFieldCard
              id="pal_pri"
              name="pal_pri"
              title="Primär"
              hint="Brand / Hauptfarbe"
              defaultValue={data.palettePrimary.join(", ")}
            />
            <PaletteFieldCard
              id="pal_sec"
              name="pal_sec"
              title="Sekundär"
              hint="Unterstützende Farben"
              defaultValue={data.paletteSecondary.join(", ")}
            />
            <PaletteFieldCard
              id="pal_acc"
              name="pal_acc"
              title="Akzent"
              hint="Highlights, CTAs"
              defaultValue={data.paletteAccent.join(", ")}
            />
            <PaletteFieldCard
              id="pal_bg"
              name="pal_bg"
              title="Hintergrund"
              hint="Flächen, Basiston"
              defaultValue={data.paletteBackground.join(", ")}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Typografie / Notizen</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Optional — Schriften, Größen, Stimmung
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              id="typo"
              name="typo"
              defaultValue={data.typographyNotes}
              rows={3}
            />
          </CardContent>
        </Card>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Regeln & Palette speichern
        </Button>
      </form>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Kompakter Stilkontext</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void handleBuild()}
            >
              Neu erzeugen
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyPrompt()}
              disabled={copying}
            >
              <Copy className="size-3.5 mr-1" />
              Kopieren
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleExport()}
            >
              Export JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            value={data.compactPrompt || ""}
            rows={12}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cover-Generierung</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground max-w-prose">
            Wenn aktiviert, wird der kompakte Stilkontext beim nächsten KI-Cover
            mit an den Prompt angehängt.
          </p>
          <Button
            type="button"
            variant={useForCover ? "default" : "outline"}
            className="shrink-0 gap-2"
            onClick={() => onUseForCoverChange(!useForCover)}
            aria-pressed={useForCover}
          >
            {useForCover ? <Check className="size-4" /> : null}
            Für Cover verwenden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
