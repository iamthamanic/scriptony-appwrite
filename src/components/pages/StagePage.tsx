import { Box } from "lucide-react";
import { StageCanvas } from "../stage/StageCanvas";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function StagePage() {
  return (
    <section className="h-full overflow-hidden bg-[#181629] px-2 py-1">
      <Tabs defaultValue="2d" className="flex h-full min-h-0 flex-col gap-1.5">
        <TabsList className="grid w-[180px] grid-cols-2 bg-[#221f35] border border-[#3b355a]">
          <TabsTrigger value="2d">2D</TabsTrigger>
          <TabsTrigger value="3d">3D</TabsTrigger>
        </TabsList>

        <TabsContent value="2d" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <StageCanvas />
        </TabsContent>

        <TabsContent value="3d" className="mt-0">
          <Card className="border-[#3b355a] bg-[#221f35] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="size-5 text-primary" />
                Stage 3D
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#b6aecf]">
              Der 3D-Bereich folgt als Nächstes. Hier können wir später Modelle, Räume oder Sketch-to-3D-Previews aufbauen.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
