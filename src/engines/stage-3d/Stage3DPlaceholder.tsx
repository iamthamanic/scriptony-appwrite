/**
 * Stage 3D — Platzhalter bis eine eigene 3D-Engine (z. B. R3F) angebunden wird.
 * Kann ein importiertes StageDocument (kind: stage3d) zur Ansicht/Vorbereitung anzeigen.
 * Pfad: src/engines/stage-3d/
 */
import { Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StageDocumentStage3D } from "@/lib/stage-schema-info";

export type Stage3DPlaceholderProps = {
  document?: StageDocumentStage3D | null;
};

export function Stage3DPlaceholder({ document = null }: Stage3DPlaceholderProps) {
  const payload = document?.payload;
  const nodes = payload?.nodes ?? [];

  if (document && payload) {
    return (
      <Card className="border-[#3b355a] bg-[#221f35] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="size-5 text-primary" />
            Stage 3D (importiert)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#b6aecf]">
          <p>
            <span className="text-[#f4f1ff]">{nodes.length}</span> Knoten
            {payload.meta?.title ? (
              <>
                {" "}
                · <span className="text-[#c7c0de]">{payload.meta.title}</span>
              </>
            ) : null}
          </p>
          <p className="text-xs text-[#8c85a8]">
            Die eigentliche 3D-Bearbeitung folgt mit der Engine. Der Stand liegt als JSON vor und kann
            exportiert oder erneut zugewiesen werden, sobald die Pipeline steht.
          </p>
          <pre className="max-h-[min(40vh,320px)] overflow-auto rounded-lg border border-[#3b355a] bg-[#181629] p-3 text-left text-[11px] leading-relaxed text-[#d4cee8]">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#3b355a] bg-[#221f35] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="size-5 text-primary" />
          Stage 3D
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[#b6aecf]">
        <p className="mb-3">
          Importiere eine <code className="rounded bg-[#181629] px-1 text-[#c7c0de]">stage3d</code>
          -JSON über den Tab <span className="text-[#f4f1ff]">2D → „Stage-JSON“</span> (wird erkannt und
          hier angezeigt) oder nutze später die direkte 3D-Engine.
        </p>
        <p>
          Der 3D-Bereich folgt als Nächstes mit Modellen, Räumen oder Sketch-to-3D-Previews.
        </p>
      </CardContent>
    </Card>
  );
}
