/**
 * Palette token editor: card layout with swatches, optional shade strip, comma-hex input (FormData-compatible).
 * Location: src/components/style-guide/PaletteFieldCard.tsx
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { parseHexList, shadeStripFromHex } from "./palette-utils";

interface PaletteFieldCardProps {
  id: string;
  name: string;
  title: string;
  hint?: string;
  defaultValue: string;
}

export function PaletteFieldCard({
  id,
  name,
  title,
  hint,
  defaultValue,
}: PaletteFieldCardProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const colors = useMemo(() => parseHexList(value), [value]);
  const first = colors[0] ?? "";
  const shades = useMemo(
    () => (first ? shadeStripFromHex(first, 11) : []),
    [first],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {hint ? (
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            ) : null}
          </div>
          {first ? (
            <code className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
              {first}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">—</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {first ? (
          <div
            className="h-14 w-full rounded-lg border border-border shadow-inner"
            style={{ backgroundColor: first }}
            title={first}
          />
        ) : (
          <div className="h-14 w-full rounded-lg border border-dashed border-border bg-muted/40" />
        )}

        {colors.length > 0 ? (
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label={`${title} Farben`}
          >
            {colors.map((c) => (
              <span
                key={c}
                role="listitem"
                className="h-8 min-w-[2rem] flex-1 rounded-md border border-border/80 shadow-sm sm:max-w-[4rem]"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        ) : null}

        {shades.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Abstufungen (Vorschau)
            </p>
            <div className="flex h-6 w-full overflow-hidden rounded-md border border-border">
              {shades.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className="min-w-0 flex-1"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs text-muted-foreground">
            Hex-Werte (Komma)
          </Label>
          <Input
            id={id}
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#3B82F6, #60A5FA"
            autoComplete="off"
            className="font-mono text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
