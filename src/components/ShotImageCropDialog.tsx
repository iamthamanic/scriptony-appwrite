import { useState, useCallback, useMemo } from "react";
import Cropper from "react-easy-crop@5.0.8";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { ZoomIn, ZoomOut, Grid3x3, Info } from "lucide-react";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";

// =============================================================================
// ASPECT RATIO PRESETS
// =============================================================================

const ASPECT_RATIOS = [
  {
    id: "16:9",
    label: "16:9 Standard",
    description: "TV/Streaming (HD)",
    value: 16 / 9,
    width: 1920,
    height: 1080,
  },
  {
    id: "2.39:1",
    label: "2.39:1 Cinemascope",
    description: "Hollywood Widescreen",
    value: 2.39,
    width: 2048,
    height: 858,
  },
  {
    id: "1.85:1",
    label: "1.85:1 Theatrical",
    description: "Kino Standard",
    value: 1.85,
    width: 1920,
    height: 1038,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Freie Wahl",
    value: 16 / 9,
    width: 1920,
    height: 1080,
  },
] as const;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface ShotImageCropDialogProps {
  image: string;
  onComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export function ShotImageCropDialog({
  image,
  onComplete,
  onCancel,
}: ShotImageCropDialogProps) {
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Aspect ratio state (default: 16:9)
  const [selectedRatio, setSelectedRatio] = useState<string>("16:9");

  // Visual aids
  const [showGrid, setShowGrid] = useState(true);

  // JPEG quality (85-95%)
  const [quality, setQuality] = useState(90);

  // Get current aspect ratio config
  const currentRatio = useMemo(() => {
    return (
      ASPECT_RATIOS.find((r) => r.id === selectedRatio) || ASPECT_RATIOS[0]
    );
  }, [selectedRatio]);

  // Estimate file size (rough approximation)
  const estimatedSizeKB = useMemo(() => {
    if (!croppedAreaPixels) return 0;
    const pixels = croppedAreaPixels.width * croppedAreaPixels.height;
    // Rough estimate: 1 megapixel ≈ 300 KB at 90% quality
    const baseSizeKB = (pixels / 1_000_000) * 300;
    const qualityFactor = quality / 90;
    return Math.round(baseSizeKB * qualityFactor);
  }, [croppedAreaPixels, quality]);

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const createCroppedImage = async () => {
    try {
      console.log("[ShotImageCropDialog] 🎬 Starting crop...", {
        hasImage: !!image,
        hasCroppedArea: !!croppedAreaPixels,
        ratio: currentRatio.label,
        quality,
      });

      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        currentRatio.width,
        currentRatio.height,
        quality / 100,
      );

      console.log(
        "[ShotImageCropDialog] ✅ Crop successful, size:",
        croppedImage.length,
      );
      onComplete(croppedImage);
    } catch (e) {
      console.error("[ShotImageCropDialog] ❌ Crop failed:", e);
      alert("Fehler beim Zuschneiden des Bildes. Bitte versuche es erneut.");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[700px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎬 Shot Image bearbeiten</DialogTitle>
          <DialogDescription>
            Wähle ein Aspect Ratio und positioniere den Bildausschnitt für
            deinen Shot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aspect Ratio Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">📐 Aspect Ratio</Label>
            <RadioGroup
              value={selectedRatio}
              onValueChange={setSelectedRatio}
              className="grid grid-cols-2 gap-2"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <label
                  key={ratio.id}
                  className="flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-[#6E59A5]/50 data-[state=checked]:border-[#6E59A5] data-[state=checked]:bg-[#6E59A5]/5"
                  data-state={
                    selectedRatio === ratio.id ? "checked" : "unchecked"
                  }
                >
                  <RadioGroupItem value={ratio.id} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{ratio.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {ratio.description}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Crop Area */}
          <div
            className="relative w-full bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden"
            style={{ aspectRatio: currentRatio.value }}
          >
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={currentRatio.value}
              cropShape="rect"
              showGrid={showGrid}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: {
                  borderRadius: "0.5rem",
                },
              }}
            />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ZoomOut className="size-4" />
                Zoom
              </span>
              <ZoomIn className="size-4" />
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Quality Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>💾 Qualität ({quality}%)</Label>
              <span className="text-muted-foreground text-xs">
                {estimatedSizeKB > 0 && `~${estimatedSizeKB} KB`}
              </span>
            </div>
            <Slider
              value={[quality]}
              onValueChange={(value) => setQuality(value[0])}
              min={85}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Visual Aids */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-grid"
                checked={showGrid}
                onCheckedChange={(checked) => setShowGrid(checked === true)}
              />
              <Label
                htmlFor="show-grid"
                className="text-sm cursor-pointer flex items-center gap-1.5"
              >
                <Grid3x3 className="size-4" />
                Rule of Thirds Grid
              </Label>
            </div>
          </div>

          {/* Output Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <Info className="size-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="space-y-0.5">
              <div className="font-medium text-blue-900 dark:text-blue-100">
                Output: {currentRatio.width} × {currentRatio.height}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {currentRatio.label} — {currentRatio.description}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="h-11">
            Abbrechen
          </Button>
          <Button
            onClick={createCroppedImage}
            className="h-11 bg-[#6E59A5] hover:bg-[#5a4888]"
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  targetWidth: number,
  targetHeight: number,
  quality: number = 0.9,
): Promise<string> {
  console.log("[getCroppedImg] 🎬 Starting crop:", {
    targetWidth,
    targetHeight,
    quality,
    cropArea: pixelCrop,
  });

  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to target dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  console.log(
    "[getCroppedImg] 📐 Canvas created:",
    canvas.width,
    "x",
    canvas.height,
  );

  // Draw the cropped image, scaled to target size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  console.log("[getCroppedImg] 🎨 Image drawn to canvas");

  // Return as JPEG with quality control
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  console.log("[getCroppedImg] ✅ Data URL created, length:", dataUrl.length);

  return dataUrl;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      console.log(
        "[ShotImageCropDialog] 📸 Image loaded:",
        image.width,
        "x",
        image.height,
      );
      resolve(image);
    });
    image.addEventListener("error", (error) => {
      console.error("[ShotImageCropDialog] ❌ Image load failed:", error);
      reject(error);
    });
    // Allow cross-origin images
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}
