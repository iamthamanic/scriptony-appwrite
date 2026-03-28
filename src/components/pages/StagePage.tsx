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
import { Button } from "../ui/button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { getAuthToken } from "@/lib/auth/getAuthToken";
import { getShot } from "@/lib/api/shots-api";
import type { Shot } from "@/lib/types";
import {
  isStage2DDocument,
  parseStageDocumentJson,
  type Stage2DPayload,
} from "@/lib/stage-schema-info";
import { buildStorageFileViewUrl, getStageDocumentsBucketId } from "@/lib/stage-storage-url";
import { deriveShotSourceLabel, type ShotSourceBadgeLabel } from "@/lib/shot-source-badge";
import { cn } from "@/components/ui/utils";

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
    [queryClient]
  );
  const stageRef = useRef<StageCanvasHandle>(null);
  const [tab, setTab] = useState("2d");
  const [toolbar, setToolbar] = useState({
    canUndo: false,
    canRedo: false,
    canClear: false,
  });

  const [loadedShot, setLoadedShot] = useState<Shot | null>(null);
  const [initial2dPayload, setInitial2dPayload] = useState<Stage2DPayload | null>(null);
  const [rasterFallbackUrl, setRasterFallbackUrl] = useState<string | null>(null);
  const [shotArtboardHint, setShotArtboardHint] = useState<{
    width: number;
    height: number;
  } | null>(null);
  /** Platzhalter für künftigen Vector-Workflow; steuert die Engine noch nicht. */
  const [stage2dRenderMode, setStage2dRenderMode] = useState<"pixel" | "vector">("pixel");

  useEffect(() => {
    if (!shotId || !projectId) {
      setLoadedShot(null);
      setInitial2dPayload(null);
      setRasterFallbackUrl(null);
      setShotArtboardHint(null);
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

        const stage2Id = shot.stage2dFileId ?? shot.stage2d_file_id;
        if (stage2Id) {
          const url = buildStorageFileViewUrl(getStageDocumentsBucketId(), stage2Id);
          if (url) {
            const res = await fetch(url);
            const text = await res.text();
            const parsed = parseStageDocumentJson(text);
            if (
              !cancelled &&
              parsed.ok &&
              isStage2DDocument(parsed.document)
            ) {
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
    []
  );

  const stageActive = tab === "2d";

  return (
    <section className="relative h-full overflow-hidden bg-[#181629] px-2 py-1">
      {sourceBadge ? (
        <div
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-[#3b355a] bg-[#221f35]/95 px-2.5 py-1",
            "text-[11px] font-medium uppercase tracking-wide text-[#c7c0de]"
          )}
          aria-live="polite"
        >
          Quelle: {sourceBadge}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col gap-1.5">
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
            key={shotId && projectId ? `${projectId}-${shotId}` : "stage-no-shot"}
            ref={stageRef}
            exportAdapter={exportAdapter}
            initialStage2DPayload={initial2dPayload}
            initialRasterImageUrl={initial2dPayload ? null : rasterFallbackUrl}
            shotArtboardHint={initial2dPayload ? null : shotArtboardHint}
            shortcutsActive={stageActive}
            onToolbarCapabilitiesChange={onToolbarCapabilitiesChange}
          />
        </TabsContent>

        <TabsContent value="3d" className="mt-0">
          <Stage3DPlaceholder />
        </TabsContent>
      </Tabs>
    </section>
  );
}
