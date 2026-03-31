/**
 * Model picker with full-text search (cmdk) over id + display name; Popover + Command pattern.
 * Used in AISettingsForm when the model list is unlocked after a successful connection test.
 * Location: src/components/ai/SearchableModelSelect.tsx
 */

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "../ui/utils";

export type ModelOption = { id: string; name: string };

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
  const selected = options.find((o) => o.id === value);
  const label = selected ? `${selected.name}` : value ? value : "";

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
        className="w-[min(calc(100vw-2rem),24rem)] p-0 sm:min-w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Modell suchen (Volltext)…" />
          <CommandList>
            <CommandEmpty>Kein Treffer.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.id} ${o.name}`}
                  onSelect={() => {
                    onValueChange(o.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === o.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-xs">{o.id}</span>
                    {o.name !== o.id ? (
                      <span className="truncate text-[0.65rem] text-muted-foreground">{o.name}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
