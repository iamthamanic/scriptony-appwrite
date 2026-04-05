/**
 * ScriptStructureImportButton — triggers file pick; logic lives in useScriptStructureImport + lib/script-import pipeline.
 * Location: src/components/ScriptStructureImportButton.tsx
 */

import { useRef, useState } from 'react';
import { Import as ImportIcon, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useAuth } from '../hooks/useAuth';
import { useScriptStructureImport } from '../hooks/useScriptStructureImport';
import {
  SCRIPT_IMPORT_ACCEPT,
  persistImportedSegments,
  importStructureConfirmMessage,
  type ImportedTimelineData,
} from '../lib/script-import';
import { toast } from 'sonner';
import type { TimelineData } from './FilmDropdown';
import type { BookTimelineData } from './BookDropdown';

export interface ScriptStructureImportButtonProps {
  projectId: string;
  projectType?: string;
  onImported: (data: TimelineData | BookTimelineData) => void;
  enabled?: boolean;
}

export function ScriptStructureImportButton({
  projectId,
  projectType = 'film',
  onImported,
  enabled = true,
}: ScriptStructureImportButtonProps) {
  const { getAccessToken } = useAuth();
  const { kind, parsed, analyzeFile, discardParsed } = useScriptStructureImport(projectType);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState('');

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const outcome = await analyzeFile(file);
      if (!outcome.ok) {
        toast.error(outcome.error);
        return;
      }
      setPendingLabel(importStructureConfirmMessage(kind, outcome.segments.length));
      setConfirmOpen(true);
    } catch (err) {
      console.error('[ScriptStructureImport]', err);
      toast.error(err instanceof Error ? err.message : 'Import fehlgeschlagen');
      discardParsed();
    } finally {
      setBusy(false);
    }
  };

  const runPersist = async () => {
    const snapshot = parsed;
    setConfirmOpen(false);
    if (!snapshot) {
      toast.error('Keine Daten — bitte Datei erneut wählen.');
      discardParsed();
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      toast.error('Nicht angemeldet');
      discardParsed();
      return;
    }

    setBusy(true);
    try {
      for (const w of snapshot.warnings) {
        toast.message(w);
      }
      const data: ImportedTimelineData = await persistImportedSegments(
        projectId,
        kind,
        snapshot.segments,
        token
      );
      onImported(data as TimelineData);
      toast.success('Struktur importiert');
    } catch (err) {
      console.error('[ScriptStructureImport] persist', err);
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setBusy(false);
      discardParsed();
    }
  };

  if (!enabled) return null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={SCRIPT_IMPORT_ACCEPT}
        className="hidden"
        onChange={(ev) => void handleFile(ev)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={openPicker}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImportIcon className="h-4 w-4 shrink-0" aria-hidden />}
        Import
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            discardParsed();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skript importieren?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{pendingLabel}</span>
              {parsed && parsed.warnings.length > 0 && (
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  {parsed.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runPersist()}>Import starten</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
