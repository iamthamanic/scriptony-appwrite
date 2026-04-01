import { useState } from "react";
import { Upload as UploadIcon, FileText, File, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

interface UploadPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export function UploadPage({ onNavigate }: UploadPageProps) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "analyzing" | "complete">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = () => {
    setUploadState("uploading");
    setUploadProgress(0);
    
    // Simulate upload
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState("analyzing");
          
          // Simulate analysis
          setTimeout(() => {
            setUploadState("complete");
            setShowResultDialog(true);
          }, 2000);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload();
  };

  const analysisResult = {
    title: "Project X",
    type: "Movie",
    description: "Ein Science-Fiction-Thriller über eine Gruppe von Astronauten",
    scenes: [
      "Scene 1 – Wohnzimmer, Nacht",
      "Scene 2 – Raumschiff, Tag",
      "Scene 3 – Alien Planet, Abend",
    ],
    characters: [
      "Anna (Protagonistin)",
      "Marcus (Unterstützend)",
      "Dr. Chen (Antagonist)",
    ],
    duration: "90 Minuten",
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <p className="text-muted-foreground">
          Lade ein Drehbuch für automatische Analyse hoch
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="px-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all active:scale-[0.98] ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : uploadState === "idle"
                  ? "border-border active:border-primary/50"
                  : uploadState === "complete"
                  ? "border-green-500 bg-green-500/5"
                  : "border-border"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => uploadState === "idle" && handleUpload()}
            >
              {uploadState === "idle" && (
                <>
                  <UploadIcon className="size-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="text-base mb-1">Datei hochladen</h3>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT (max. 50 MB)
                  </p>
                </>
              )}
              
              {uploadState === "uploading" && (
                <>
                  <FileText className="size-10 mx-auto mb-3 text-primary" />
                  <h3 className="text-base mb-3">Hochladen {uploadProgress}%</h3>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto h-2" />
                </>
              )}
              
              {uploadState === "analyzing" && (
                <>
                  <FileText className="size-10 mx-auto mb-3 text-primary animate-pulse" />
                  <h3 className="text-base mb-1">Analysiere Skript...</h3>
                  <p className="text-xs text-muted-foreground">Einen Moment bitte</p>
                </>
              )}
              
              {uploadState === "complete" && (
                <>
                  <CheckCircle className="size-10 mx-auto mb-3 text-green-500" />
                  <h3 className="text-base mb-1">Upload erfolgreich!</h3>
                  <p className="text-xs text-muted-foreground">Analyse abgeschlossen</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="px-4">
        <h2 className="mb-4">Unterstützte Formate</h2>
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                  <File className="size-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">PDF Files</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Alle gängigen PDF-Skripte
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 shrink-0">
                  <FileText className="size-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">DOCX Files</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Word-Dokumente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 shrink-0">
                  <FileText className="size-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">TXT Files</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Einfache Textskripte
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Analysis Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="w-[95vw] max-w-3xl rounded-2xl max-h-[85vh] overflow-y-auto md:w-auto">
          <DialogHeader>
            <DialogTitle>Analyse-Ergebnisse</DialogTitle>
            <DialogDescription className="text-xs">
              Dein Skript wurde erfolgreich analysiert
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Project Info */}
            <div>
              <h3 className="text-base mb-2">{analysisResult.title}</h3>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">{analysisResult.type}</Badge>
                <Badge variant="outline" className="text-xs">{analysisResult.duration}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{analysisResult.description}</p>
            </div>

            {/* Scenes */}
            <div>
              <h4 className="text-sm mb-2">Szenen-Übersicht</h4>
              <div className="space-y-2">
                {analysisResult.scenes.map((scene, index) => (
                  <div key={index} className="p-2.5 bg-muted rounded-lg text-xs">
                    {scene}
                  </div>
                ))}
              </div>
            </div>

            {/* Characters */}
            <div>
              <h4 className="text-sm mb-2">Charakterliste</h4>
              <div className="space-y-2">
                {analysisResult.characters.map((character, index) => (
                  <div key={index} className="p-2.5 bg-muted rounded-lg text-xs">
                    {character}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowResultDialog(false);
              setUploadState("idle");
            }} className="h-11">
              Schließen
            </Button>
            <Button onClick={() => {
              setShowResultDialog(false);
              onNavigate("projekte", "new");
            }} className="h-11">
              Projekt erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}