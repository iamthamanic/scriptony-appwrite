/**
 * Style Guide: drei Tabs (Übersicht, Referenzen, Regeln & Export) für ein Projekt.
 * Location: src/components/style-guide/StyleGuideSection.tsx
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { StyleGuideOverviewTab } from "./StyleGuideOverviewTab";
import { StyleGuideReferencesTab } from "./StyleGuideReferencesTab";
import { StyleGuideRulesExportTab } from "./StyleGuideRulesExportTab";
import type {
  StyleGuideData,
  PatchStyleGuidePayload,
} from "../../lib/api/style-guide-api";
import * as StyleGuideApi from "../../lib/api/style-guide-api";
import { toast } from "sonner@2.0.3";
import { Loader2 } from "lucide-react";

export interface StyleGuideSectionProps {
  projectId: string;
  data: StyleGuideData | null;
  loading: boolean;
  /** Last load failure (HTTP, token, Appwrite) — shown when data is null */
  loadError?: string | null;
  onDataChange: (sg: StyleGuideData) => void;
  useForCover: boolean;
  onUseForCoverChange: (v: boolean) => void;
}

export function StyleGuideSection({
  projectId,
  data,
  loading,
  loadError,
  onDataChange,
  useForCover,
  onUseForCoverChange,
}: StyleGuideSectionProps) {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview");

  async function patch(patch: PatchStyleGuidePayload) {
    setSaving(true);
    try {
      const sg = await StyleGuideApi.patchStyleGuide(projectId, patch);
      onDataChange(sg);
      toast.success("Gespeichert");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function doExport() {
    setSaving(true);
    try {
      const res = await StyleGuideApi.exportStyleGuide(projectId);
      onDataChange(res.styleGuide);
      await navigator.clipboard.writeText(
        JSON.stringify(res.exportPayload, null, 2),
      );
      toast.success("Export in Zwischenablage kopiert");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-2 py-6">
        <p className="text-sm text-muted-foreground">
          Style Guide konnte nicht geladen werden.
        </p>
        {loadError ? (
          <p className="text-sm text-destructive/90 break-words rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs">
            {loadError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Prüfe Konsole / Netzwerk (GET{" "}
            <span className="font-mono">/style-guide/…</span>), Anmeldung und ob{" "}
            <code className="rounded bg-muted px-1">
              npm run appwrite:provision:schema
            </code>{" "}
            für die Collections gelaufen ist.
          </p>
        )}
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto flex-wrap gap-1 sm:flex sm:w-auto sm:inline-flex">
        <TabsTrigger value="overview" className="text-xs sm:text-sm">
          Übersicht
        </TabsTrigger>
        <TabsTrigger value="references" className="text-xs sm:text-sm">
          Referenzen
        </TabsTrigger>
        <TabsTrigger value="rules" className="text-xs sm:text-sm">
          Regeln &amp; Export
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4 focus-visible:outline-none">
        <StyleGuideOverviewTab
          data={data}
          saving={saving}
          onSave={(p) => patch(p)}
          onAddReference={() => setTab("references")}
          onExport={() => void doExport()}
        />
      </TabsContent>
      <TabsContent
        value="references"
        className="mt-4 focus-visible:outline-none"
      >
        <StyleGuideReferencesTab
          projectId={projectId}
          data={data}
          onChange={onDataChange}
        />
      </TabsContent>
      <TabsContent value="rules" className="mt-4 focus-visible:outline-none">
        <StyleGuideRulesExportTab
          projectId={projectId}
          data={data}
          saving={saving}
          onSave={(p) => patch(p)}
          onChange={onDataChange}
          useForCover={useForCover}
          onUseForCoverChange={onUseForCoverChange}
        />
      </TabsContent>
    </Tabs>
  );
}
