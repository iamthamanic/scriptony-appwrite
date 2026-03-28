/**
 * Stage 3D — Platzhalter bis eine eigene 3D-Engine (z. B. R3F) angebunden wird.
 * Pfad: src/engines/stage-3d/
 */
import { Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Stage3DPlaceholder() {
  return (
    <Card className="border-[#3b355a] bg-[#221f35] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="size-5 text-primary" />
          Stage 3D
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[#b6aecf]">
        Der 3D-Bereich folgt als Nächstes. Hier können wir später Modelle, Räume oder Sketch-to-3D-Previews
        aufbauen.
      </CardContent>
    </Card>
  );
}
