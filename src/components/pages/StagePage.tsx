/**
 * StagePage — Tab-Navigation 2D/3D-Stage; Toolbar; optional Shot-Kontext aus Router (#stage/projectId/shotId).
 * Pfad: src/components/pages/StagePage.tsx
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpFromLine, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { StageCanvas, type StageCanvasHandle } from "@/engines/stage-2d";
import { createScriptonyStageExportAdapter } from "@/integrations/stage-export";
import { Stage3DPlaceholder } from "@/engines/stage-3d";
import { RenderJobPanel } from "../RenderJobPanel";
import { BridgeStatusBar } from "../BridgeStatusBar";
import { BridgeConnectionDropdown } from "../BridgeConnectionDropdown";
import { Button } from "../ui/button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { getAuthToken } from "@/lib/auth/getAuthToken";
import { getShot } from "@/lib/api/shots-api";
import type { Shot } from "@/lib/types";
import {
  isStage2DDocument,
  isStage3DDocument,
  parseStageDocumentJson,
  type Stage2DPayload,
  type StageDocumentStage3D,
} from "@/lib/stage-schema-info";
import {
  buildStorageFileViewUrl,
  getStageDocumentsBucketId,
} from "@/lib/stage-storage-url";
import {
  deriveShotSourceLabel,
  type ShotSourceBadgeLabel,
} from "@/lib/shot-source-badge";
import { useFreshnessLocal } from "@/hooks/useFreshness";
import { Badge } from "../ui/badge";
import { cn } from "@/components/ui/utils";

const FRESHNESS_LABELS: Record<string, { label: string; className: string }> = {
  fresh: { label: "Aktuell", className: "bg-green-100 text-green-700" },
  stale: { label: "Veraltet", className: "bg-orange-100 text-orange-700" },
  unknown: { label: "Unbekannt", className: "bg-gray-100 text-gray-500" },
};

function StagePuppetLayer({
  shot,
  shotId,
}: {
  shot: Shot | null;
  shotId: string;
}) {
  const freshness = useFreshnessLocal(shot ?? undefined);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#c7c0de]">Puppet-Layer</h3>

      {/* Freshness */}
      <div className="space-y-1.5">
        <h4 className="text-[11px] font-medium text-[#8a83a3] uppercase tracking-wide">
          Daten-Frische
        </h4>
        {freshness.overall === "unknown" ? (
          <p className="text-[11px] text-[#6b6480]">
            Keine Puppet-Layer-Daten (Blender-Sync ausstehend)
          </p>
        ) : (
          <div className="flex gap-2">
            {(
              [
                { key: "guidesStale", label: "Guides" },
                { key: "renderStale", label: "Render" },
                { key: "previewStale", label: "Preview" },
              ] as const
            ).map((r) => {
              const status = freshness[r.key];
              const cfg = FRESHNESS_LABELS[status];
              return (
                <Badge
                  key={r.key}
                  className={`text-[10px] px-1.5 py-0 ${cfg.className}`}
                >
                  {r.label}: {cfg.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Render Jobs */}
      <RenderJobPanel shotId={shotId} />
    </div>
  );
}

function readImageDimensionsForArtboard(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = url;
  });
}

/** Längere Kante auf 1080 px normalisieren — festes Seitenverhältnis für Stage-Artboard. */
function artboardFromImageDimensions(dims: { width: number; height: number }) {
  const longEdge = 1080;
  const scale = longEdge / Math.max(dims.width, dims.height);
  return {
    width: Math.max(64, Math.round(dims.width * scale)),
    height: Math.max(64, Math.round(dims.height * scale)),
  };
}

export interface StagePageProps {
  projectId?: string | null;
  shotId?: string | null;
}

export function StagePage({ projectId = null, shotId = null }: StagePageProps) {
  const queryClient = useQueryClient();
  const exportAdapter = useMemo(
    () => createScriptonyStageExportAdapter(queryClient),
    [queryClient],
  );
  const stageRef = useRef<StageCanvasHandle>(null);
  const [tab, setTab] = useState("2d");
  const [toolbar, setToolbar] = useState({
    canUndo: false,
    canRedo: false,
    canClear: false,
  });

  const [loadedShot, setLoadedShot] = useState<Shot | null>(null);
  const [initial2dPayload, setInitial2dPayload] =
    useState<Stage2DPayload | null>(null);
  const [rasterFallbackUrl, setRasterFallbackUrl] = useState<string | null>(
    null,
  );
  const [shotArtboardHint, setShotArtboardHint] = useState<{
    width: number;
    height: number;
  } | null>(null);
  /** Platzhalter für künftigen Vector-Workflow; steuert die Engine noch nicht. */
  const [stage2dRenderMode, setStage2dRenderMode] = useState<
    "pixel" | "vector"
  >("pixel");
  const [importedStage3D, setImportedStage3D] =
    useState<StageDocumentStage3D | null>(null);

  useEffect(() => {
    if (!shotId || !projectId) {
      setLoadedShot(null);
      setInitial2dPayload(null);
      setRasterFallbackUrl(null);
      setShotArtboardHint(null);
      setImportedStage3D(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token || cancelled) return;
        const shot = await getShot(shotId, token);
        if (cancelled) return;
        setLoadedShot(shot);

        const stage3Id = shot.stage3dFileId ?? shot.stage3d_file_id;
        if (stage3Id) {
          const url3 = buildStorageFileViewUrl(
            getStageDocumentsBucketId(),
            stage3Id,
          );
          if (url3) {
            try {
              const res3 = await fetch(url3);
              const text3 = await res3.text();
              const parsed3 = parseStageDocumentJson(text3);
              if (
                !cancelled &&
                parsed3.ok &&
                isStage3DDocument(parsed3.document)
              ) {
                setImportedStage3D(parsed3.document);
              } else if (!cancelled) {
                setImportedStage3D(null);
              }
            } catch {
              if (!cancelled) setImportedStage3D(null);
            }
          } else if (!cancelled) {
            setImportedStage3D(null);
          }
        } else if (!cancelled) {
          setImportedStage3D(null);
        }

        const stage2Id = shot.stage2dFileId ?? shot.stage2d_file_id;
        if (stage2Id) {
          const url = buildStorageFileViewUrl(
            getStageDocumentsBucketId(),
            stage2Id,
          );
          if (url) {
            const res = await fetch(url);
            const text = await res.text();
            const parsed = parseStageDocumentJson(text);
            if (!cancelled && parsed.ok && isStage2DDocument(parsed.document)) {
              setInitial2dPayload(parsed.document.payload);
              setRasterFallbackUrl(null);
              setShotArtboardHint(null);
              return;
            }
          }
        }
        setInitial2dPayload(null);
        const imgUrl = shot.imageUrl?.trim() ? shot.imageUrl : null;
        if (!imgUrl) {
          setRasterFallbackUrl(null);
          setShotArtboardHint(null);
          return;
        }
        try {
          const dims = await readImageDimensionsForArtboard(imgUrl);
          if (cancelled) return;
          setShotArtboardHint(artboardFromImageDimensions(dims));
          setRasterFallbackUrl(imgUrl);
        } catch {
          if (!cancelled) {
            setShotArtboardHint(null);
            setRasterFallbackUrl(imgUrl);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadedShot(null);
          setInitial2dPayload(null);
          setRasterFallbackUrl(null);
          setShotArtboardHint(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shotId, projectId]);

  const sourceBadge: ShotSourceBadgeLabel | null =
    shotId && projectId ? deriveShotSourceLabel(loadedShot) : null;

  const onToolbarCapabilitiesChange = useCallback(
    (c: { canUndo: boolean; canRedo: boolean; canClear: boolean }) => {
      setToolbar(c);
    },
    [],
  );

  const stageActive = tab === "2d";

  return (
    <section
      className="relative h-full overflow-hidden bg-[#181629] px-2 py-1"
      data-app-undo-priority="stage"
    >
      {sourceBadge ? (
        <div
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-[#3b355a] bg-[#221f35]/95 px-2.5 py-1",
            "text-[11px] font-medium uppercase tracking-wide text-[#c7c0de]",
          )}
          aria-live="polite"
        >
          Quelle: {sourceBadge}
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex h-full min-h-0 flex-col gap-1.5"
      >
        <div className="flex min-h-0 flex-wrap items-center gap-2">
          <TabsList className="grid w-[180px] shrink-0 grid-cols-2 bg-[#221f35] border border-[#3b355a]">
            <TabsTrigger value="2d">2D</TabsTrigger>
            <TabsTrigger value="3d">3D</TabsTrigger>
          </TabsList>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#3b355a] bg-[#221f35] text-xs"
                disabled={!stageActive || !toolbar.canUndo}
                onClick={() => stageRef.current?.undo()}
              >
                <Undo2 className="mr-1.5 size-4" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#3b355a] bg-[#221f35] text-xs"
                disabled={!stageActive || !toolbar.canRedo}
                onClick={() => stageRef.current?.redo()}
              >
                <Redo2 className="mr-1.5 size-4" />
                Redo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#3b355a] bg-[#221f35] text-xs"
                disabled={!stageActive}
                onClick={() => stageRef.current?.resetView()}
              >
                <RotateCcw className="mr-1.5 size-4" />
                Reset View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#3b355a] bg-[#221f35] text-xs"
                disabled={!stageActive || !toolbar.canClear}
                onClick={() => stageRef.current?.clearDrawLayer()}
              >
                Clear Draw Layer
              </Button>
              <BridgeConnectionDropdown />
            </div>
            <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                className="shrink-0 text-xs"
                disabled={!stageActive}
                onClick={() => stageRef.current?.openExport()}
              >
                <ArrowUpFromLine className="mr-1.5 size-4" />
                Export
              </Button>
              <ToggleGroup
                type="single"
                value={stage2dRenderMode}
                onValueChange={(v) => {
                  if (v === "pixel" || v === "vector") setStage2dRenderMode(v);
                }}
                variant="outline"
                size="sm"
                disabled={!stageActive}
                className="shrink-0 border-[#3b355a] bg-[#221f35]"
                aria-label="Darstellungsmodus (in Kürze)"
              >
                <ToggleGroupItem value="pixel" className="text-xs px-2.5">
                  Pixel
                </ToggleGroupItem>
                <ToggleGroupItem value="vector" className="text-xs px-2.5">
                  Vector
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        <TabsContent
          value="2d"
          forceMount
          className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <StageCanvas
            key={
              shotId && projectId ? `${projectId}-${shotId}` : "stage-no-shot"
            }
            ref={stageRef}
            exportAdapter={exportAdapter}
            initialStage2DPayload={initial2dPayload}
            initialRasterImageUrl={initial2dPayload ? null : rasterFallbackUrl}
            shotArtboardHint={initial2dPayload ? null : shotArtboardHint}
            shortcutsActive={stageActive}
            onImportedStage2DDocument={() => setTab("2d")}
            onImportedStage3DDocument={(doc) => {
              setImportedStage3D(doc);
              setTab("3d");
            }}
            onToolbarCapabilitiesChange={onToolbarCapabilitiesChange}
          />
        </TabsContent>

        <TabsContent value="3d" className="mt-0 flex-1 min-h-0 overflow-auto">
          <div className="space-y-4 p-3">
            {/* Bridge-Status — immer sichtbar im 3D-Tab */}
            <div className="rounded-md border border-[#3b355a] bg-[#221f35]/95 p-3">
              <BridgeStatusBar />
            </div>

            {shotId && <StagePuppetLayer shot={loadedShot} shotId={shotId} />}
            <Stage3DPlaceholder document={importedStage3D} />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
