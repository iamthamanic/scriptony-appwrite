/**
 * Modal shortcut for AI settings (Creative Gym, Assistant). Same content as Settings → Integrationen.
 * Location: src/components/ChatSettingsDialog.tsx
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Sparkles } from "lucide-react";
import { AIIntegrationsSection } from "./AIIntegrationsSection";

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ChatSettingsDialog({
  open,
  onOpenChange,
}: ChatSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Chat Settings
          </DialogTitle>
          <DialogDescription>
            Dieselben Einstellungen wie{" "}
            <span className="font-medium text-foreground">
              Einstellungen → Integrationen
            </span>{" "}
            (KI &amp; LLM): Provider, API-Keys, Modellauswahl sowie die
            Assistant-Parameter.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <AIIntegrationsSection />
        </div>
      </DialogContent>
    </Dialog>
  );
}
