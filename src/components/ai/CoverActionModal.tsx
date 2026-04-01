/**
 * First-step cover modal to choose generate or upload.
 * Location: src/components/ai/CoverActionModal.tsx
 */

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface CoverActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: () => void;
  onGenerate: () => void;
}

export function CoverActionModal({ open, onOpenChange, onUpload, onGenerate }: CoverActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md md:w-auto">
        <DialogHeader>
          <DialogTitle>Cover auswählen</DialogTitle>
          <DialogDescription>Willst du ein Cover hochladen oder per KI generieren?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onUpload();
            }}
          >
            Upload
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onGenerate();
            }}
          >
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

