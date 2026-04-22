/**
 * Export project metadata as PDF (Scriptony-styled) or JSON (full wrapper).
 * Offers download and native share when the browser supports it.
 * Location: src/components/ProjectExportDialog.tsx
 */

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { cn } from "./ui/utils";
import scriptonyLogo from "../assets/scriptony-logo.png";
import {
  buildProjectExportEnvelope,
  downloadBlob,
  exportFilenameBase,
  generateProjectInfoPdfBlob,
  jsonBlobFromEnvelope,
  shareFileIfPossible,
} from "../lib/project-export";

export interface ProjectExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSnapshot: Record<string, unknown> | null;
  linkedWorldLabel?: string | null;
}

export function ProjectExportDialog({
  open,
  onOpenChange,
  projectSnapshot,
  linkedWorldLabel = null,
}: ProjectExportDialogProps) {
  const [format, setFormat] = useState<"json" | "pdf">("pdf");
  const [busy, setBusy] = useState(false);

  const title = String(projectSnapshot?.title || "projekt");

  const runDownload = async () => {
    if (!projectSnapshot) {
      toast.error("Keine Projektdaten zum Exportieren.");
      return;
    }
    setBusy(true);
    try {
      if (format === "json") {
        const envelope = buildProjectExportEnvelope(projectSnapshot, {
          linkedWorldLabel,
        });
        const blob = jsonBlobFromEnvelope(envelope);
        downloadBlob(blob, exportFilenameBase(title, "json"));
        toast.success("JSON heruntergeladen.");
        return;
      }
      const blob = await generateProjectInfoPdfBlob(projectSnapshot, {
        logoSrc: scriptonyLogo,
        linkedWorldLabel,
      });
      downloadBlob(blob, exportFilenameBase(title, "pdf"));
      toast.success("PDF heruntergeladen.");
    } catch (e) {
      console.error(e);
      toast.error("Export fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const runShare = async () => {
    if (!projectSnapshot) {
      toast.error("Keine Projektdaten zum Teilen.");
      return;
    }
    setBusy(true);
    try {
      let blob: Blob;
      let ext: "json" | "pdf";
      let mime: string;
      if (format === "json") {
        const envelope = buildProjectExportEnvelope(projectSnapshot, {
          linkedWorldLabel,
        });
        blob = jsonBlobFromEnvelope(envelope);
        ext = "json";
        mime = "application/json";
      } else {
        blob = await generateProjectInfoPdfBlob(projectSnapshot, {
          logoSrc: scriptonyLogo,
          linkedWorldLabel,
        });
        ext = "pdf";
        mime = "application/pdf";
      }
      const name = exportFilenameBase(title, ext);
      const file = new File([blob], name, { type: mime });
      const shared = await shareFileIfPossible(file);
      if (!shared) {
        downloadBlob(blob, name);
        toast.message("Teilen nicht verfügbar — Datei wurde heruntergeladen.");
      } else {
        toast.success("Geteilt.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Teilen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt teilen / exportieren</DialogTitle>
          <DialogDescription>
            Wähle das Format. PDF: Scriptony-Kopfzeile und Logo auf jeder Seite.
            JSON: vollständiger Export mit Metadaten-Wrapper.
          </DialogDescription>
        </DialogHeader>

        {!projectSnapshot ? (
          <p className="text-sm text-muted-foreground">Keine Daten geladen.</p>
        ) : (
          <div className="space-y-3 py-1">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "json" | "pdf")}
              className="grid gap-2"
            >
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                )}
              >
                <RadioGroupItem value="pdf" id="export-pdf" disabled={busy} />
                <span>PDF</span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                )}
              >
                <RadioGroupItem value="json" id="export-json" disabled={busy} />
                <span>JSON (maschinenlesbar)</span>
              </label>
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="gap-3 sm:gap-3 sm:flex-wrap sm:items-center sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Schließen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void runShare()}
            disabled={busy || !projectSnapshot}
          >
            <Share2 className="size-4 mr-2" />
            Teilen…
          </Button>
          <Button
            type="button"
            onClick={() => void runDownload()}
            disabled={busy || !projectSnapshot}
          >
            <Download className="size-4 mr-2" />
            Herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
