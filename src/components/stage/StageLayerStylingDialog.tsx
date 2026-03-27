/**
 * Layer-Styling-Dialog (Fill / Outline / Strichverhalten) für die Stage-2D-Ansicht.
 * Eine Seite: je Zeile Bezeichnung, Checkbox, Farbe, Stärke-Slider; plus Strich-Block.
 * Ort: src/components/stage/StageLayerStylingDialog.tsx
 */

import { useEffect, useState } from "react";
import { Pipette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";

export type StageLayerStylingValues = {
  fillEnabled: boolean;
  fillColor: string;
  fillStrength: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineStrength: number;
  pressureSensitive: boolean;
};

type StageLayerStylingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerName: string;
  values: StageLayerStylingValues;
  onChange: (patch: Partial<StageLayerStylingValues>) => void;
};

/** Liefert #rrggbb oder null (unterstützt #RGB, #RRGGBB, RRGGBB ohne #). */
function normalizeHex(raw: string): string | null {
  let s = raw.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3 && /^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return `#${s.toLowerCase()}`;
  }
  return null;
}

function HexColorInput({
  id,
  value,
  onCommit,
  ariaLabel,
}: {
  id: string;
  value: string;
  onCommit: (hex: string) => void;
  ariaLabel: string;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const apply = () => {
    const next = normalizeHex(text);
    if (next) {
      onCommit(next);
      setText(next);
    } else {
      setText(value);
    }
  };

  return (
    <input
      id={id}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
        }
      }}
      spellCheck={false}
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder="#000000"
      className="h-9 w-[6.75rem] shrink-0 rounded-md border border-[#5a537f] bg-[#17152a] px-2 font-mono text-[11px] text-[#f4f1ff] outline-none placeholder:text-[#6b6588] focus-visible:ring-2 focus-visible:ring-primary/60"
    />
  );
}

function StyleStrengthSlider({
  color,
  value,
  onChange,
  idPrefix,
}: {
  color: string;
  value: number;
  onChange: (v: number) => void;
  idPrefix: string;
}) {
  return (
    <div className="relative min-h-[36px] min-w-0 flex-1">
      <Slider
        className="w-full min-w-0 [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-slate-300 dark:[&_[data-slot=slider-track]]:bg-[#3b355a] [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:bg-white"
        rangeStyle={{ backgroundColor: color }}
        thumbStyle={{ borderColor: color }}
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-semibold leading-none text-black dark:text-white/90"
        id={`${idPrefix}-pct`}
      >
        {value}%
      </span>
    </div>
  );
}

export function StageLayerStylingDialog({
  open,
  onOpenChange,
  layerName,
  values,
  onChange,
}: StageLayerStylingDialogProps) {
  const fillColorId = "stage-styling-fill-color";
  const outlineColorId = "stage-styling-outline-color";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[#3b355a] !bg-[#1c1a2d] text-slate-900 shadow-2xl dark:!bg-[#1c1a2d] dark:text-[#f4f1ff]">
        <DialogHeader>
          <DialogTitle>Styling</DialogTitle>
          <DialogDescription className="dark:text-[#b6aecf]">
            Fill, Outline und Strichverhalten für „{layerName}“.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(65vh,24rem)] space-y-4 overflow-y-auto pr-1">
          {/* Fill-Zeile */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-[#3b355a]/60 pb-4">
            <span className="w-full shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#b6aecf] sm:w-[4.25rem]">
              Fill
            </span>
            <input
              type="checkbox"
              id="styling-fill-on"
              aria-label="Fill aktivieren"
              checked={values.fillEnabled}
              onChange={(e) => onChange({ fillEnabled: e.target.checked })}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border border-[#5a537f] accent-violet-500"
            />
            <input
              id={fillColorId}
              type="color"
              value={values.fillColor}
              onChange={(e) => onChange({ fillColor: e.target.value })}
              className="sr-only"
            />
            <Label
              htmlFor={fillColorId}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#5a537f] bg-[#17152a]"
            >
              <Pipette className="size-4 text-[#b6aecf]" aria-hidden />
            </Label>
            <HexColorInput
              id="styling-fill-hex"
              value={values.fillColor}
              onCommit={(hex) => onChange({ fillColor: hex })}
              ariaLabel="Fill Hex-Farbe"
            />
            <StyleStrengthSlider
              color={values.fillColor}
              value={values.fillStrength}
              onChange={(v) => onChange({ fillStrength: v })}
              idPrefix="fill"
            />
          </div>

          {/* Outline-Zeile */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-[#3b355a]/60 pb-4">
            <span className="w-full shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#b6aecf] sm:w-[4.25rem]">
              Outline
            </span>
            <input
              type="checkbox"
              id="styling-outline-on"
              aria-label="Outline aktivieren"
              checked={values.outlineEnabled}
              onChange={(e) => onChange({ outlineEnabled: e.target.checked })}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border border-[#5a537f] accent-violet-500"
            />
            <input
              id={outlineColorId}
              type="color"
              value={values.outlineColor}
              onChange={(e) => onChange({ outlineColor: e.target.value })}
              className="sr-only"
            />
            <Label
              htmlFor={outlineColorId}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#5a537f] bg-[#17152a]"
            >
              <Pipette className="size-4 text-[#b6aecf]" aria-hidden />
            </Label>
            <HexColorInput
              id="styling-outline-hex"
              value={values.outlineColor}
              onCommit={(hex) => onChange({ outlineColor: hex })}
              ariaLabel="Outline Hex-Farbe"
            />
            <StyleStrengthSlider
              color={values.outlineColor}
              value={values.outlineStrength}
              onChange={(v) => onChange({ outlineStrength: v })}
              idPrefix="outline"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-[#3b35558a] bg-[#17152a]/50 p-3">
            <div className="text-xs font-medium text-slate-700 dark:text-[#e8e4ff]">Strich</div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="styling-pressure" className="text-xs font-normal dark:text-[#b6aecf]">
                Druckempfindlich (variable Breite)
              </Label>
              <Switch
                id="styling-pressure"
                checked={values.pressureSensitive}
                onCheckedChange={(checked) => onChange({ pressureSensitive: checked })}
              />
            </div>
            <p className="text-[11px] leading-snug text-slate-600 dark:text-[#8f88b0]">
              Aus = gleichmäßige Strichbreite wie ein harter Marker. Neu gezeichnete Striche folgen der Einstellung.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
