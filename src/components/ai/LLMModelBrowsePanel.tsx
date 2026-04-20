/**
 * Searchable, sortable model list after a successful /ai/validate-key test; optional hints (use case, rough pricing).
 * Used inside AISettingsForm provider cards.
 * Location: src/components/ai/LLMModelBrowsePanel.tsx
 */

import { useMemo, useState } from "react";
import {
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getLlmModelHint } from "../../lib/llm-model-hints";

export type CapabilityState = "true" | "false" | "unknown";
export type ModelWithContextRow = {
  id: string;
  name: string;
  context_window: number;
  provider?: string;
  image_gen?: CapabilityState;
  vision?: CapabilityState;
  tools?: CapabilityState;
  thinking?: CapabilityState;
  video_gen?: CapabilityState;
};

type SortKey = "id" | "context";

interface LLMModelBrowsePanelProps {
  models: ModelWithContextRow[];
  /** Called when user picks a row as the active draft model */
  onSelectModel?: (modelId: string) => void;
  selectedModelId?: string;
  /** Start with the browse table expanded (default: collapsed) */
  defaultOpen?: boolean;
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function capBadgeMeta(v?: CapabilityState): {
  label: string;
  className: string;
} {
  if (v === "true") {
    return {
      label: "yes",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (v === "false") {
    return {
      label: "no",
      className: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    };
  }
  return {
    label: "unknown",
    className: "border-border/70 bg-muted/30 text-muted-foreground",
  };
}

export function LLMModelBrowsePanel({
  models,
  onSelectModel,
  selectedModelId,
  defaultOpen = false,
}: LLMModelBrowsePanelProps) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("context");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    let list = models.map((m) => ({ ...m, hint: getLlmModelHint(m.id) }));
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(qq) ||
          m.name.toLowerCase().includes(qq) ||
          m.hint?.bestFor.some((t) => t.toLowerCase().includes(qq)),
      );
    }
    list.sort((a, b) => {
      const mul = sortDesc ? -1 : 1;
      if (sortKey === "context")
        return (a.context_window - b.context_window) * mul;
      return a.id.localeCompare(b.id) * mul;
    });
    return list;
  }, [models, q, sortKey, sortDesc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc((d) => !d);
    else {
      setSortKey(k);
      setSortDesc(k === "context");
    }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey !== k ? (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      ) : sortDesc ? (
        <ArrowDown className="h-3 w-3 text-primary" />
      ) : (
        <ArrowUp className="h-3 w-3 text-primary" />
      )}
    </button>
  );

  if (!models.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Keine Modelle in der Antwort.
      </p>
    );
  }

  return (
    <details
      className="group rounded-md border border-border bg-muted/20 open:bg-muted/30"
      {...(defaultOpen ? { defaultOpen: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-2 text-xs font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span>
          Modellliste{" "}
          <span className="font-normal text-muted-foreground">
            ({models.length} {models.length === 1 ? "Modell" : "Modelle"})
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="space-y-2 border-t border-border/60 px-2 pb-2 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Modell suchen…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span className="text-[0.65rem] text-muted-foreground">
            {rows.length} / {models.length}
          </span>
        </div>

        <div className="max-h-[min(22rem,50vh)] overflow-auto rounded border border-border/60 bg-card/40">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-[1] border-b border-border bg-card/95 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-1.5">
                  <SortBtn k="id" label="Modell" />
                </th>
                <th className="px-2 py-1.5">
                  <SortBtn k="context" label="Kontext" />
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Provider
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Image
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Vision
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Tools
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Thinking
                </th>
                <th className="px-2 py-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Video
                </th>
                {onSelectModel ? <th className="w-20 px-2 py-1.5" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-border/40 last:border-0 hover:bg-muted/30 ${
                    selectedModelId === m.id ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 font-mono text-[0.7rem] leading-tight">
                    {m.id}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {m.context_window > 0
                      ? formatContext(m.context_window)
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {m.provider || m.hint?.bestFor?.[0] || "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] ${capBadgeMeta(m.image_gen).className}`}
                    >
                      {capBadgeMeta(m.image_gen).label}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] ${capBadgeMeta(m.vision).className}`}
                    >
                      {capBadgeMeta(m.vision).label}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] ${capBadgeMeta(m.tools).className}`}
                    >
                      {capBadgeMeta(m.tools).label}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] ${capBadgeMeta(m.thinking).className}`}
                    >
                      {capBadgeMeta(m.thinking).label}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] ${capBadgeMeta(m.video_gen).className}`}
                    >
                      {capBadgeMeta(m.video_gen).label}
                    </Badge>
                  </td>
                  {onSelectModel ? (
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[0.65rem]"
                        onClick={() => onSelectModel(m.id)}
                      >
                        Wählen
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[0.6rem] leading-snug text-muted-foreground">
          Capabilities: yes / no / unknown (provider metadata + probes).
        </p>
      </div>
    </details>
  );
}
