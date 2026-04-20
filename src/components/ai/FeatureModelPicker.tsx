/**
 * FeatureModelPicker — Searchable model selector for scriptony-ai feature routing.
 * Popover with cmdk search and tabular rows: name, context window, features.
 * Location: src/components/ai/FeatureModelPicker.tsx; used by AIIntegrationsSection.
 */

import { useMemo, useState } from "react";
import { useCommandState } from "cmdk@1.1.1";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  RefreshCw,
} from "lucide-react@0.487.0";

import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AI_NO_MODEL_SELECTED_LABEL } from "../../lib/ai-ui-copy";

export interface DiscoveredModelInfo {
  id: string;
  name: string;
  provider: string;
  features: string[];
  contextWindow?: number;
}

interface FeatureModelPickerProps {
  models: DiscoveredModelInfo[];
  value: string;
  onValueChange: (modelId: string) => void;
  onLoadModels: () => void | Promise<void>;
  loading: boolean;
  disabled?: boolean;
  /** When false, hide „Modelle prüfen“ (e.g. render it next to the API key field). Default: true. */
  showDiscoverButton?: boolean;
  /** Zeitstempel der letzten Model-Prüfung (Format: HH:MM:SS - DD.MM.YYYY) */
  lastDiscoveryTime?: string;
}

function formatFeatures(features: string[] | undefined): string {
  if (!features?.length) return "–";
  const s = features.join(", ");
  return s.length > 48 ? `${s.slice(0, 46)}…` : s;
}

/** Feste drei Spalten (inline, damit JIT/Purge die Klasse nicht „vergisst“). */
const MODEL_GRID_STYLE = {
  gridTemplateColumns: "minmax(0, 1fr) 6.5rem minmax(0, 1fr)",
} as const;

function filterModelsBySearch(
  models: DiscoveredModelInfo[],
  search: string,
): DiscoveredModelInfo[] {
  const q = search.trim().toLowerCase();
  if (!q) return models;
  return models.filter((m) => {
    const hay =
      `${m.name} ${m.id} ${(m.features ?? []).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

/** Inner list: muss innerhalb von Command gerendert werden (useCommandState + shouldFilter=false). */
function FeatureModelPickerList({
  models,
  value,
  onValueChange,
  setOpen,
}: {
  models: DiscoveredModelInfo[];
  value: string;
  onValueChange: (modelId: string) => void;
  setOpen: (open: boolean) => void;
}) {
  const search = useCommandState((s) => s.search) ?? "";
  const filteredModels = useMemo(
    () => filterModelsBySearch(models, search),
    [models, search],
  );

  return (
    <CommandList
      className="h-[200px] overflow-y-scroll"
      style={{ scrollbarWidth: "thin" }}
    >
      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
        Kein Treffer.
      </CommandEmpty>
      <div
        className="grid w-full min-w-0 gap-x-3 border-b bg-muted/40 px-2 py-1.5 sm:gap-x-4"
        style={MODEL_GRID_STYLE}
      >
        <span className="min-w-0 truncate text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          Modell
        </span>
        <span className="shrink-0 text-end text-[10px] font-semibold uppercase tabular-nums text-muted-foreground sm:text-[11px]">
          Kontext
        </span>
        <span className="min-w-0 truncate text-end text-[10px] font-semibold uppercase text-muted-foreground sm:text-[11px]">
          Funktionen
        </span>
      </div>
      {filteredModels.map((m) => (
        <CommandItem
          key={m.id}
          className={cn(
            "w-full min-w-0 cursor-pointer rounded-none border-b px-2 py-0",
            "focus:bg-muted focus:text-foreground hover:bg-muted hover:text-foreground",
            "data-[selected=true]:!bg-muted data-[selected=true]:!text-foreground",
            "dark:data-[selected=true]:!bg-muted/80",
          )}
          value={`${m.name} ${m.id} ${(m.features ?? []).join(" ")}`}
          onSelect={() => {
            onValueChange(m.id);
            setOpen(false);
          }}
        >
          <div
            className="grid w-full min-w-0 flex-1 gap-x-3 py-2 sm:gap-x-4"
            style={MODEL_GRID_STYLE}
          >
            <div className="flex min-w-0 gap-2">
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400",
                  value === m.id ? "opacity-100" : "opacity-0",
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {m.name}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">
                  {m.id}
                </p>
              </div>
            </div>
            <span className="text-end text-xs tabular-nums text-muted-foreground">
              {m.contextWindow != null ? m.contextWindow.toLocaleString() : "–"}
            </span>
            <span
              className="min-w-0 truncate text-end text-xs text-muted-foreground"
              title={formatFeatures(m.features)}
            >
              {formatFeatures(m.features)}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandList>
  );
}

export function FeatureModelPicker({
  models,
  value,
  onValueChange,
  onLoadModels,
  loading,
  disabled,
  showDiscoverButton = true,
  lastDiscoveryTime,
}: FeatureModelPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value);
  const fallbackSelected = value.trim()
    ? {
        id: value.trim(),
        name: value.trim(),
        provider: "",
        features: [],
        contextWindow: undefined,
      }
    : null;
  /** Only show a model name when this id exists in the current list (any provider / feature). */
  const resolvedSelected = selected ?? fallbackSelected;
  const hasResolvedModel = resolvedSelected != null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full min-w-0 flex-1 justify-between font-normal"
          >
            <span
              className={cn(
                "truncate text-left",
                !hasResolvedModel && "text-muted-foreground",
              )}
            >
              {hasResolvedModel
                ? resolvedSelected.name
                : models.length > 0
                  ? `${models.length} Modelle verfügbar - geprüft: ${lastDiscoveryTime || ""}`
                  : AI_NO_MODEL_SELECTED_LABEL}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 !max-w-none max-h-[220px] overflow-y-hidden"
          style={{
            width:
              "min(var(--radix-popover-trigger-width, 100%), min(calc(100vw - 2rem), 40rem))",
            maxWidth:
              "min(var(--radix-popover-trigger-width, 100%), min(calc(100vw - 2rem), 40rem))",
          }}
        >
          <Command shouldFilter={false} label="Modellauswahl">
            <CommandInput placeholder="Volltextsuche (Modell, ID, Funktionen)..." />
            <FeatureModelPickerList
              models={models}
              value={value}
              onValueChange={onValueChange}
              setOpen={setOpen}
            />
          </Command>
        </PopoverContent>
      </Popover>
      {showDiscoverButton && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={disabled || loading}
          onClick={() => void onLoadModels()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Modelle prüfen
        </Button>
      )}
    </div>
  );
}
