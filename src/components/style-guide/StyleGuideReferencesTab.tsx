/**
 * Style Guide tab: Referenzen — Grid, Filter, Pin, Reihenfolge, Hinzufügen.
 * Location: src/components/style-guide/StyleGuideReferencesTab.tsx
 */

import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import type {
  StyleGuideData,
  StyleGuideItemKind,
} from "../../lib/api/style-guide-api";
import { extractPaletteFromImageUrl } from "../../lib/extract-palette-client";
import { toast } from "sonner@2.0.3";
import { ChevronDown, ChevronUp, Loader2, Pin, Trash2 } from "lucide-react";
import { useStyleGuideJob } from "../../hooks/useStyleGuideJob";
import { createReferenceWithRetry } from "../../lib/api/style-guide-retry-api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface Props {
  projectId: string;
  data: StyleGuideData;
  onChange: (sg: StyleGuideData) => void;
}

export function StyleGuideReferencesTab({ projectId, data, onChange }: Props) {
  const [filterTag, setFilterTag] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kind, setKind] = useState<StyleGuideItemKind>("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const {
    createReference,
    updateReference,
    deleteReference,
    reorderReferences,
    extractPalette,
    isLoading,
    progress,
    reset,
  } = useStyleGuideJob({
    onSuccess: (result) => {
      if (result.styleGuide) {
        onChange(result.styleGuide);
        toast.success("Style Guide aktualisiert");
        // Reset form after success
        setTitle("");
        setCaption("");
        setSourceUrl("");
        setTagsStr("");
        setFile(null);
        setSheetOpen(false);
      }
    },
    onError: (error) => {
      toast.error(error || "Fehler beim Aktualisieren");
    },
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of data.items) {
      for (const t of it.tags) s.add(t);
    }
    return [...s].sort();
  }, [data.items]);

  const filtered = useMemo(() => {
    const list = [...data.items].sort((a, b) => a.orderIndex - b.orderIndex);
    const t = filterTag.trim().toLowerCase();
    if (!t) return list;
    return list.filter((i) => i.tags.some((x) => x.toLowerCase().includes(t)));
  }, [data.items, filterTag]);

  const pinned = filtered.filter((i) => i.pinned);
  const rest = filtered.filter((i) => !i.pinned);

  async function submitAdd() {
    const tags = tagsStr
      .split(/[,]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    let result: StyleGuideData;

    if (kind === "image") {
      if (file) {
        const b64 = await fileToBase64(file);
        result = await createReferenceWithRetry(
          projectId,
          {
            kind: "image",
            title,
            caption,
            tags,
            fileBase64: b64,
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
          },
          (status) => {
            if (status === "uploading") {
              toast.info("Bild wird hochgeladen...");
            } else if (status === "processing") {
              toast.info("Verarbeitung läuft, bitte warten...");
            } else if (status === "completed") {
              toast.success("Referenz hinzugefügt!");
            }
          },
        );
      } else {
        result = await createReferenceWithRetry(projectId, {
          kind: "image",
          title,
          caption,
          image_url: sourceUrl.trim(),
          tags,
        });
      }
    } else if (kind === "text") {
      result = await createReferenceWithRetry(projectId, {
        kind: "text",
        title,
        text_body: caption,
        tags,
      });
    } else {
      result = await createReferenceWithRetry(projectId, {
        kind: "link",
        title,
        caption,
        source_url: sourceUrl.trim(),
        source_name: title,
        tags,
      });
    }

    onChange(result);
    toast.success("Referenz gespeichert");
    setSheetOpen(false);
    setTitle("");
    setCaption("");
    setSourceUrl("");
    setTagsStr("");
    setFile(null);
  }

  async function togglePin(it: StyleGuideData["items"][0]) {
    await updateReference(it.id, {
      pinned: !it.pinned,
    });
  }

  async function remove(it: StyleGuideData["items"][0]) {
    if (!confirm("Referenz löschen?")) return;
    await deleteReference(it.id);
  }

  async function move(it: StyleGuideData["items"][0], dir: -1 | 1) {
    const sorted = [...data.items].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sorted.findIndex((x) => x.id === it.id);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const swapped = [...sorted];
    [swapped[idx], swapped[j]] = [swapped[j], swapped[idx]];
    const ids = swapped.map((x) => x.id);
    await reorderReferences(projectId, ids);
  }

  async function runExtractPalette(it: StyleGuideData["items"][0]) {
    if (!it.imageUrl) {
      toast.error("Nur für Bild-Referenzen mit URL");
      return;
    }
    try {
      const colors = await extractPaletteFromImageUrl(it.imageUrl);
      await extractPalette(it.id, colors);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Extraktion fehlgeschlagen");
    }
  }

  function renderCard(it: StyleGuideData["items"][0]) {
    return (
      <Card key={it.id} className="overflow-hidden">
        <CardContent className="p-3 space-y-2">
          {it.imageUrl ? (
            <img
              src={it.imageUrl}
              alt=""
              className="w-full h-36 object-cover rounded-md border"
            />
          ) : (
            <div className="h-36 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
              {it.kind === "text"
                ? it.caption.slice(0, 200)
                : it.sourceUrl || "—"}
            </div>
          )}
          <div className="font-medium text-sm line-clamp-1">
            {it.title || "Ohne Titel"}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {it.caption}
          </div>
          <div className="flex flex-wrap gap-1">
            {it.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              aria-label="Anheften"
              onClick={() => void togglePin(it)}
              disabled={isLoading}
            >
              <Pin className={`size-3.5 ${it.pinned ? "text-primary" : ""}`} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              aria-label="Nach oben"
              onClick={() => void move(it, -1)}
              disabled={isLoading}
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              aria-label="Nach unten"
              onClick={() => void move(it, 1)}
              disabled={isLoading}
            >
              <ChevronDown className="size-3.5" />
            </Button>
            {it.kind === "image" && it.imageUrl ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={() => void runExtractPalette(it)}
                disabled={isLoading}
              >
                Farben ableiten
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-destructive"
              aria-label="Löschen"
              onClick={() => void remove(it)}
              disabled={isLoading}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/*
        Sheet (Radix Dialog) renders Trigger + Content as siblings; without a wrapper they become
        extra flex items and break sm:justify-between. One wrapper = filter left, action right.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="w-full min-w-0 max-w-md space-y-1">
          <Label htmlFor="sg-tag-filter">Filter (Tag)</Label>
          <Input
            id="sg-tag-filter"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            placeholder="Tag eingeben…"
            list="sg-tag-suggestions"
          />
          <datalist id="sg-tag-suggestions">
            {allTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="flex w-full shrink-0 justify-end sm:w-auto sm:self-end">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button type="button">Referenz hinzufügen</Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-fit max-h-[min(20rem,50vh)] w-full max-w-[16rem] overflow-y-auto rounded-t-xl border-x text-sm sm:mx-auto sm:max-w-[18rem]"
            >
              <SheetHeader className="text-left pb-0">
                <SheetTitle className="text-base">
                  Referenz hinzufügen
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 py-3">
                <div className="space-y-2">
                  <Label>Art</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(v as StyleGuideItemKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Bild</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sg-ref-title">Titel</Label>
                  <Input
                    id="sg-ref-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                {kind === "image" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sg-ref-file">
                        Datei (oder URL unten)
                      </Label>
                      <Input
                        id="sg-ref-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-ref-url">Bild-URL (optional)</Label>
                      <Input
                        id="sg-ref-url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-ref-cap">Caption</Label>
                      <Textarea
                        id="sg-ref-cap"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                ) : null}
                {kind === "text" ? (
                  <div className="space-y-2">
                    <Label htmlFor="sg-ref-text">Text</Label>
                    <Textarea
                      id="sg-ref-text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={6}
                    />
                  </div>
                ) : null}
                {kind === "link" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sg-ref-link">URL</Label>
                      <Input
                        id="sg-ref-link"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-ref-cap2">Notiz</Label>
                      <Textarea
                        id="sg-ref-cap2"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="sg-ref-tags">Tags (Komma)</Label>
                  <Input
                    id="sg-ref-tags"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void submitAdd()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Speichern
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {pinned.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Angeheftet</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map(renderCard)}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Alle Referenzen</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
