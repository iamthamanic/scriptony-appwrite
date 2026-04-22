import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Scissors } from "lucide-react";

interface AudioLabelDialogProps {
  isOpen: boolean;
  fileName: string;
  type: "music" | "sfx";
  audioUrl?: string; // Audio URL for trimming preview
  onConfirm: (
    label: string,
    trimming?: { startTime?: number; endTime?: number },
  ) => void;
  onCancel: () => void;
  onEdit?: () => void; // Open trimming editor
}

export function AudioLabelDialog({
  isOpen,
  fileName,
  type,
  audioUrl,
  onConfirm,
  onCancel,
  onEdit,
}: AudioLabelDialogProps) {
  const [label, setLabel] = useState("");
  const [wantsTrimming, setWantsTrimming] = useState(false);

  // Reset label when dialog opens with new file
  useEffect(() => {
    if (isOpen) {
      // Default: use filename without extension
      const defaultLabel = fileName.replace(/\.[^/.]+$/, "");
      setLabel(defaultLabel);
    }
  }, [isOpen, fileName]);

  const handleConfirm = () => {
    if (wantsTrimming && onEdit) {
      // Open edit dialog instead
      onEdit();
    } else {
      onConfirm(label.trim() || fileName);
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === "music" ? "🎵 Music" : "🔊 SFX"} Label
          </DialogTitle>
          <DialogDescription>
            Give this audio file a name that will be displayed in the timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm">File: {fileName}</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter label..."
              autoFocus
              className="border-violet-300 focus:border-violet-500"
            />
          </div>

          {/* Trim Audio Option */}
          {onEdit && audioUrl && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditClick}
                className="w-full flex items-center justify-center gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                <Scissors className="w-4 h-4" />
                Trim Audio (Optional)
              </Button>
              <p className="text-xs text-neutral-500 mt-2 text-center">
                Click to trim audio before uploading
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
