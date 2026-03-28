/**
 * Creative Gym — kompaktes Hub-Menü (Popover) statt der breiten CgNav-Leiste.
 * Orientierung: HR Koordinator `HrKo_LearningAvatarWidget` + Platzierung wie `LearningScreen` (Header-Zeile).
 * Hash: Library unterstützt optional ein drittes Segment für den Intent-Filter:
 * `#gym/library` (alle) bzw. `#gym/library/unblock|explore|train|project_extend`.
 * Location: src/modules/creative-gym/presentation/gym-hub-menu.tsx
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, Dumbbell, Home, Layers, Library, LineChart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { cn } from "../../../components/ui/utils";
import { useCreativeGym } from "./creative-gym-context";

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NavigateFn = (page: "gym", id?: string, categoryId?: string) => void;

export type GymHubSegment = "home" | "library" | "progress" | "assets";

type GymHubMenuProps = {
  navigate: NavigateFn;
  current: GymHubSegment;
  className?: string;
};

export function GymHubMenu({ navigate, current, className }: GymHubMenuProps) {
  const [open, setOpen] = useState(false);
  const { gymUser, progressOverview } = useCreativeGym();
  const p = progressOverview?.profile;

  const go = (segment: GymHubSegment) => {
    setOpen(false);
    navigate("gym", segment === "home" ? undefined : segment, undefined);
  };

  const item = (
    id: GymHubSegment,
    label: string,
    icon: ReactNode,
    description?: string
  ) => {
    const active = current === id;
    return (
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "h-auto w-full justify-start gap-3 px-3 py-2.5 text-left",
          active && "bg-primary/15 ring-1 ring-primary/20"
        )}
        onClick={() => go(id)}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground [&_svg]:size-4">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          {description ? (
            <span className="block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </Button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-auto gap-2 rounded-xl border-border/80 bg-muted/20 px-2.5 py-2 shadow-sm hover:bg-muted/40",
            className
          )}
          aria-label="Creative Gym Bereiche öffnen"
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-muted/40 overflow-hidden">
            {gymUser ? (
              <Avatar className="size-full rounded-full border-0">
                {gymUser.avatar ? (
                  <AvatarImage src={gymUser.avatar} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-full text-xs font-semibold">
                  {initialsFromDisplayName(gymUser.name || gymUser.email)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Dumbbell className="size-[18px] text-primary" aria-hidden />
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-0" align="start" sideOffset={8}>
        <div className="border-b border-border/60 bg-muted/25 px-3 py-2.5 space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Creative Gym</p>
            <p className="text-[11px] text-muted-foreground/90">Bereiche &amp; Fortschritt</p>
          </div>
          {gymUser ? (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-9 shrink-0">
                {gymUser.avatar ? <AvatarImage src={gymUser.avatar} alt="" /> : null}
                <AvatarFallback className="text-[11px] font-medium">
                  {initialsFromDisplayName(gymUser.name || gymUser.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {gymUser.name || gymUser.email}
                </p>
                {gymUser.name ? (
                  <p className="truncate text-[11px] text-muted-foreground">{gymUser.email}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {p ? (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div className="rounded-md border border-border/50 bg-background/60 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Streak</p>
                <p className="text-xs font-semibold tabular-nums">{p.currentStreak} Tage</p>
              </div>
              <div className="rounded-md border border-border/50 bg-background/60 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sessions</p>
                <p className="text-xs font-semibold tabular-nums">
                  {String(progressOverview?.sessionsCompleted ?? 0)}
                </p>
              </div>
              <div className="col-span-2 rounded-md border border-border/50 bg-background/60 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fokus</p>
                <p className="truncate text-xs font-medium">{progressOverview?.weakSpots[0] ?? "—"}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5 p-1.5">
          {item("home", "Home", <Home className="size-4 opacity-80" />, "Start & Intents")}
          {item("library", "Library", <Library className="size-4 opacity-80" />, "Challenges")}
          {item("progress", "Progress", <LineChart className="size-4 opacity-80" />, "Skills & Statistik")}
          {item("assets", "Capsules", <Layers className="size-4 opacity-80" />, "Artefakte")}
        </div>
      </PopoverContent>
    </Popover>
  );
}
