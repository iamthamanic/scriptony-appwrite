/**
 * Model picker with full-text search (cmdk) over id + display name; Popover + Command pattern.
 * Used in AISettingsForm when the model list is unlocked after a successful connection test.
 * Location: src/components/ai/SearchableModelSelect.tsx
 */

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, CircleHelp, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";

export type ModelOption = {
  id: string;
  name: string;
  image_gen?: "true" | "false" | "unknown";
  vision?: "true" | "false" | "unknown";
  tools?: "true" | "false" | "unknown";
  thinking?: "true" | "false" | "unknown";
  video_gen?: "true" | "false" | "unknown";
};

interface SearchableModelSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  options: ModelOption[];
  /** No list until connection test; shows value as text only */
  locked: boolean;
  disabled?: boolean;
  placeholder?: string;
  lockedHint?: string;
  id?: string;
}

function capClass(v?: "true" | "false" | "unknown"): string {
  if (v === "true") return "text-emerald-400";
  if (v === "false") return "text-rose-400";
  return "text-muted-foreground";
}

function hasCaps(o: ModelOption): boolean {
  return Boolean(o.image_gen || o.vision || o.tools || o.thinking || o.video_gen);
}

function CapIcon({ value }: { value?: "true" | "false" | "unknown" }) {
  const icon = "h-3 w-3 shrink-0 block";
  if (value === "true") return <Check className={icon} aria-hidden />;
  if (value === "false") return <X className={icon} aria-hidden />;
  return <CircleHelp className={icon} aria-hidden />;
}

function CapabilityCell({ cap }: { cap?: "true" | "false" | "unknown" }) {
  return (
    <td
      className={cn(
        "p-0 align-middle transition-colors",
        capClass(cap),
        "group-hover:text-primary-foreground [&_svg]:group-hover:text-primary-foreground"
      )}
    >
      <span className="flex min-h-[1.125rem] w-full items-center justify-center py-0.5">
        <CapIcon value={cap} />
      </span>
    </td>
  );
}

export function SearchableModelSelect({
  value,
  onValueChange,
  options,
  locked,
  disabled = false,
  placeholder = "Modell wählen…",
  lockedHint = "Zuerst Zugangsdaten speichern und „Verbindung testen“.",
  id,
}: SearchableModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.id === value);
  const label = selected ? `${selected.name}` : value ? value : "";
  const showCapabilityTable = options.some((o) => hasCaps(o));
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.id} ${o.name}`.toLowerCase().includes(q));
  }, [options, query]);

  if (locked) {
    return (
      <div className="space-y-1">
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled || locked}
          className="h-9 w-full justify-between font-normal text-muted-foreground"
        >
          <span className="truncate text-left text-xs sm:text-sm">
            {value ? <span className="font-mono text-foreground">{value}</span> : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
        <p className="text-[0.65rem] leading-snug text-muted-foreground">{lockedHint}</p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="min-w-0 truncate text-left text-xs sm:text-sm">
            {label ? (
              <>
                <span className="font-mono text-[0.7rem] text-muted-foreground sm:text-xs">{value}</span>
                {selected && selected.name !== value ? (
                  <span className="ml-1.5 text-foreground">· {selected.name}</span>
                ) : null}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[20.5rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
        align="start"
      >
        <div className="shrink-0 border-b border-border/60 p-2">
          <Input
            placeholder="Modell suchen (Volltext)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-7 text-[11px]"
          />
        </div>
        <div
          className="model-select-list-scroll flex-none px-2.5 pb-1.5"
          style={{ height: "12.25rem", maxHeight: "12.25rem" }}
        >
          <div className="min-w-[25.5rem] pb-1">
              {filteredOptions.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">Kein Treffer.</p>
              ) : (
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "168px" }} />
                    <col style={{ width: "38px" }} />
                    <col style={{ width: "38px" }} />
                    <col style={{ width: "38px" }} />
                    <col style={{ width: "44px" }} />
                    <col style={{ width: "38px" }} />
                  </colgroup>
                  {showCapabilityTable ? (
                    <thead className="sticky top-0 z-20 bg-popover shadow-[0_1px_0_0_hsl(var(--border)/0.45)]">
                      <tr className="border-b border-border/60">
                        <th className="py-1 pl-0.5 pr-1 text-left text-[9px] font-normal uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">
                          Model
                        </th>
                        {(["Img", "Vis", "Tools", "Think", "Vid"] as const).map((label) => (
                          <th key={label} className="p-0 align-middle">
                            <span className="flex w-full items-center justify-center px-0 py-1 text-[9px] font-normal uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">
                              {label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {filteredOptions.map((o) => (
                      <tr
                        key={o.id}
                        className={cn(
                          "group cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/90",
                          value === o.id ? "bg-primary/40" : ""
                        )}
                        onClick={() => {
                          onValueChange(o.id);
                          setOpen(false);
                        }}
                      >
                        <td className="snap-start py-0.5 pl-0.5 pr-1 align-middle">
                          <span className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[10px] leading-tight text-foreground transition-colors group-hover:text-primary-foreground">
                            {value === o.id ? (
                              <Check className="h-3 w-3 shrink-0 text-emerald-400 group-hover:text-primary-foreground" />
                            ) : null}
                            {o.id}
                          </span>
                        </td>
                        {showCapabilityTable ? (
                          <>
                            <CapabilityCell cap={o.image_gen} />
                            <CapabilityCell cap={o.vision} />
                            <CapabilityCell cap={o.tools} />
                            <CapabilityCell cap={o.thinking} />
                            <CapabilityCell cap={o.video_gen} />
                          </>
                        ) : (
                          <td
                            colSpan={5}
                            className="py-0.5 text-[10px] text-muted-foreground transition-colors group-hover:text-primary-foreground"
                          >
                            {o.name}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
