import { useState } from "react";
import { GripVertical } from "lucide-react";

/**
 * 🎯 HOOK BAR - Scrollbar-style Beat Marker
 *
 * Schmaler horizontaler Balken der wie eine Scrollbar aussieht:
 * - Kompakt und schmal (wie ein Slider)
 * - Zeigt Prozent-Position an
 * - Kann gedragged werden (zukünftig)
 * - Input-Felder links & rechts für pctFrom/pctTo
 */

export interface HookBarData {
  id: string;
  label: string;
  pctFrom: number;
  pctTo: number;
  color?: string;
}

interface HookBarProps {
  hook: HookBarData;
  onUpdate?: (hookId: string, updates: Partial<HookBarData>) => void;
  className?: string;
}

export function HookBar({ hook, onUpdate, className = "" }: HookBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const bgColor = hook.color || "#FFD700"; // Gold color for Hook
  const midPct = (hook.pctFrom + hook.pctTo) / 2;

  const handlePctChange = (field: "pctFrom" | "pctTo", value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && onUpdate) {
      onUpdate(hook.id, { [field]: Math.max(0, Math.min(100, numValue)) });
    }
  };

  return (
    <div
      className={`relative flex items-center gap-1 h-full ${className}`}
      onDoubleClick={() => setIsEditing(true)}
    >
      {/* Left Input - pctFrom */}
      <input
        type="number"
        value={hook.pctFrom.toFixed(0)}
        onChange={(e) => handlePctChange("pctFrom", e.target.value)}
        className="w-8 h-6 text-[9px] text-center bg-white/90 border border-gray-300 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
        step="0.1"
        min="0"
        max="100"
      />

      {/* Hook Bar - Scrollbar Style */}
      <div
        className="flex-1 relative rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: bgColor,
          height: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {/* Grip Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <GripVertical className="size-3 text-black/40" />
        </div>

        {/* Percentage Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-black/70">
            {midPct.toFixed(0)}%
          </span>
        </div>

        {/* Shine effect */}
        <div
          className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* Right Input - pctTo */}
      <input
        type="number"
        value={hook.pctTo.toFixed(0)}
        onChange={(e) => handlePctChange("pctTo", e.target.value)}
        className="w-8 h-6 text-[9px] text-center bg-white/90 border border-gray-300 rounded px-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
        step="0.1"
        min="0"
        max="100"
      />
    </div>
  );
}
