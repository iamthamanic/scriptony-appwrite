/**
 * Confirms GIF uploads when lossless WebP is enabled: converting drops animation.
 * User can convert to static WebP (first frame) or keep the animated GIF if it fits the upload limit.
 * Location: src/components/GifAnimationUploadDialog.tsx
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { STORAGE_CONFIG } from "../lib/config";

type GifAnimationUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  /** If false, "GIF behalten" is disabled (file exceeds server max). */
  allowKeepGif: boolean;
  onConvert: () => void;
  onKeepGif: () => void;
};

export function GifAnimationUploadDialog({
  open,
  onOpenChange,
  fileName,
  allowKeepGif,
  onConvert,
  onKeepGif,
}: GifAnimationUploadDialogProps) {
  const maxMb = (STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GIF erkannt</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Eine Konvertierung nach WebP verwendet nur das erste Bild —{" "}
                <strong className="text-foreground">
                  Animationen gehen dabei verloren
                </strong>
                .
              </p>
              {fileName ? (
                <p className="text-xs opacity-80 truncate" title={fileName}>
                  Datei: {fileName}
                </p>
              ) : null}
              {!allowKeepGif ? (
                <p className="text-amber-600 dark:text-amber-500 text-xs">
                  Dieses GIF ist größer als {maxMb} MB. Nur Konvertierung (oder
                  ein kleineres GIF) ist möglich.
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button type="button" className="w-full" onClick={onConvert}>
            Mit Konvertierung fortfahren (statisches WebP)
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!allowKeepGif}
            onClick={onKeepGif}
          >
            Ohne Konvertierung — GIF behalten
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
