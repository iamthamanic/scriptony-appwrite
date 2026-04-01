/**
 * Second-step cover modal with editable prompt for generation.
 * Shows a particle-sphere loading overlay on the prompt area while the image API runs.
 * User picks illustration style (realistic / comic / anime); choice is merged into the prompt.
 * Location: src/components/ai/CoverGenerateModal.tsx
 */

import type { CoverVisualStyle } from "../../lib/cover-prompt";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "../ui/utils";
import { AssistantParticleLoader } from "./AssistantParticleLoader";

interface CoverGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  visualStyle: CoverVisualStyle;
  onVisualStyleChange: (style: CoverVisualStyle) => void;
  onGenerate: () => void;
  generating?: boolean;
}

export function CoverGenerateModal({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  visualStyle,
  onVisualStyleChange,
  onGenerate,
  generating,
}: CoverGenerateModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (generating && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        overlayClassName="!z-[130]"
        style={{ maxHeight: "min(85vh, 720px)" }}
        className="!z-[130] !flex min-h-0 !top-[4vh] !left-[50%] !right-auto !bottom-auto !translate-x-[-50%] !translate-y-0 w-[95vw] max-w-2xl !max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:w-auto"
      >
        <DialogHeader className="shrink-0 space-y-2 px-6 pt-6 pr-14 text-left">
          <DialogTitle>Cover generieren</DialogTitle>
          <DialogDescription>
            Prompt basiert auf Projektinformationen. Titel erscheint mittig auf dem Cover. Stil unten wählen — der
            Prompt wird angepasst.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 [-webkit-overflow-scrolling:touch]">
          <div className="space-y-3 pb-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Illustrations-Stil</Label>
              <RadioGroup
                value={visualStyle}
                onValueChange={(v) => onVisualStyleChange(v as CoverVisualStyle)}
                className="grid gap-2 sm:grid-cols-3"
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <RadioGroupItem value="realistic" id="cover-style-realistic" disabled={generating} />
                  <span>Realistisch</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <RadioGroupItem value="comic" id="cover-style-comic" disabled={generating} />
                  <span>Comic</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <RadioGroupItem value="anime" id="cover-style-anime" disabled={generating} />
                  <span>Anime</span>
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Stil wechseln erzeugt den Prompt aus den aktuellen Projektinfos neu (manuelle Bearbeitung geht
                verloren).
              </p>
            </div>
            {/* Native textarea: shared <Textarea> uses field-sizing-content which ignores max-height and breaks layout */}
            <div
              className="relative box-border h-[400px] max-h-[400px] w-full shrink-0 overflow-hidden rounded-md border-2 border-border bg-muted/50 text-foreground dark:bg-input/30"
              aria-busy={generating}
              data-generating={generating ? "true" : undefined}
            >
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                readOnly={generating}
                spellCheck={false}
                placeholder="Describe the cover image..."
                className={cn(
                  "field-sizing-fixed box-border h-full max-h-full min-h-0 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-60 read-only:opacity-100"
                )}
              />
              {generating ? (
                <div
                  className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-sm border border-transparent"
                  aria-live="polite"
                >
                  <AssistantParticleLoader
                    className="assistant-pl-root--fill assistant-pl-root--translucent"
                    ariaLabel="Bild wird generiert"
                  />
                </div>
              ) : null}
            </div>
            {!generating ? (
              <p className="text-xs text-muted-foreground">Ausgabe: 800x1200 px (2:3 Portrait).</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-card px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onGenerate} disabled={generating || !prompt.trim()}>
            Bild generieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
