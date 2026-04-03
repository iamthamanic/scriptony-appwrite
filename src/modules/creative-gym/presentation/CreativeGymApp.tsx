/**
 * Creative Gym shell: hash sub-routes + main product screens.
 * Location: src/modules/creative-gym/presentation/CreativeGymApp.tsx
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Dumbbell,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../components/ui/utils";
import { toast } from "sonner@2.0.3";
import type { ChallengeTemplate, CreativeIntent, CreativeMedium, CreativeSession, Difficulty, RescueActionId, SessionMode, TransferTargetType } from "../domain/types";
import * as UC from "../application/use-cases";
import { CreativeGymProvider, useCreativeGym } from "./creative-gym-context";
import type { GymUserDisplay } from "./creative-gym-context";
import {
  clearSetupChallengeId,
  clearSetupIntent,
  readSetupChallengeId,
  readSetupIntent,
  writeSetupChallengeId,
  writeSetupIntent,
} from "./setup-intent-storage";
import { CHALLENGE_SEEDS } from "../infrastructure/seeds/challenge-seeds";
import { GymHubMenu } from "./gym-hub-menu";
import { requestGymStarter } from "../../scriptony-ai";

type NavigateFn = (page: "gym", id?: string, categoryId?: string) => void;

const RESCUE_IDS: RescueActionId[] = [
  "give_nudge",
  "simplify",
  "change_perspective",
  "add_constraint",
  "reduce_scope",
  "generate_variant",
  "switch_output_shape",
];

const RESCUE_LABELS: Record<RescueActionId, string> = {
  give_nudge: "Nudge",
  simplify: "Vereinfachen",
  change_perspective: "Perspektive",
  add_constraint: "Constraint",
  reduce_scope: "Scope",
  generate_variant: "Variante",
  switch_output_shape: "Form wechseln",
};

interface CreativeGymAppProps {
  userId: string;
  gymUser?: GymUserDisplay;
  segment?: string;
  subSegment?: string;
  navigate: NavigateFn;
  /** Optional: open shared AI / Chat settings (same dialog as Settings → Integrationen). */
  onOpenAiSettings?: () => void;
}

export function CreativeGymAppWithProvider(props: CreativeGymAppProps) {
  return (
    <CreativeGymProvider userId={props.userId} gymUser={props.gymUser}>
      <CreativeGymRouter {...props} />
    </CreativeGymProvider>
  );
}

function CreativeGymRouter({ segment, subSegment, navigate, onOpenAiSettings }: CreativeGymAppProps) {
  if (!segment) {
    return <HomeScreen navigate={navigate} onOpenAiSettings={onOpenAiSettings} />;
  }
  if (segment === "library") {
    return <LibraryScreen navigate={navigate} librarySubSegment={subSegment} />;
  }
  if (segment === "progress") {
    return <ProgressScreen navigate={navigate} />;
  }
  if (segment === "assets") {
    return <AssetsScreen navigate={navigate} />;
  }
  if (segment === "session" && subSegment === "new") {
    return <SessionSetupScreen navigate={navigate} onOpenAiSettings={onOpenAiSettings} />;
  }
  if (segment === "session" && subSegment && subSegment !== "new") {
    return (
      <SessionFlowScreen sessionId={subSegment} navigate={navigate} onOpenAiSettings={onOpenAiSettings} />
    );
  }
  return <HomeScreen navigate={navigate} onOpenAiSettings={onOpenAiSettings} />;
}

function HomeScreen({
  navigate,
  onOpenAiSettings,
}: {
  navigate: NavigateFn;
  onOpenAiSettings?: () => void;
}) {
  const { progressOverview: overview } = useCreativeGym();

  const startIntent = (intent: CreativeIntent) => {
    writeSetupIntent(intent);
    navigate("gym", "session", "new");
  };

  return (
    <section className="min-h-screen pb-20 text-foreground">
      {/* Kein doppeltes px: main hat bereits px-6 */}
      <div className="border-b border-border/60 bg-gradient-to-b from-muted/25 to-transparent pb-3 pt-2 md:pb-4 md:pt-3">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <GymHubMenu navigate={navigate} current="home" className="shrink-0" />
            {onOpenAiSettings ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => onOpenAiSettings()}
              >
                KI-Einstellungen
              </Button>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h1 className="text-balance text-xl font-semibold tracking-tight md:text-xl">
              Was brauchst du gerade?
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 pt-3 md:gap-12 md:pt-4">
        <div className="grid min-w-0 grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 [&>*]:min-w-0">
          <IntentCard
            title="Block lösen"
            desc="Schnell wieder in Fluss kommen."
            icon={<Sparkles className="size-5" />}
            onClick={() => startIntent("unblock")}
            footerAction={{
              label: "Challenges anzeigen",
              onClick: () => navigate("gym", "library", "unblock"),
            }}
          />
          <IntentCard
            title="Ideen erzeugen"
            desc="Exploration ohne Druck."
            icon={<BookOpen className="size-5" />}
            onClick={() => startIntent("explore")}
            footerAction={{
              label: "Challenges anzeigen",
              onClick: () => navigate("gym", "library", "explore"),
            }}
          />
          <IntentCard
            title="Craft trainieren"
            desc="Technik schärfen."
            icon={<Dumbbell className="size-5" />}
            onClick={() => startIntent("train")}
            footerAction={{
              label: "Challenges anzeigen",
              onClick: () => navigate("gym", "library", "train"),
            }}
          />
          <IntentCard
            title="Aus Projekt weiterarbeiten"
            desc="Bestehendes Material ausbauen."
            icon={<Wrench className="size-5" />}
            onClick={() => startIntent("project_extend")}
            footerAction={{
              label: "Capsules verwalten",
              onClick: () => navigate("gym", "assets"),
            }}
          />
        </div>

        {overview?.profile && (
          <div className="mt-8 border-t border-border/60 pt-12 md:mt-10 md:pt-14">
            <h2 className="mb-5 text-sm font-medium text-muted-foreground">Kurzüberblick</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              <StatPill label="Sessions" value={String(overview.sessionsCompleted)} />
              <StatPill label="Streak" value={`${overview.profile.currentStreak} Tage`} />
              <StatPill label="Fokus" value={overview.weakSpots[0] ?? "—"} />
              <StatPill label="Transfer" value={overview.profile.mediaTranslation.toFixed(0)} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-border/70 bg-muted/20 px-4 py-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function IntentCard({
  title,
  desc,
  icon,
  onClick,
  footerAction,
}: {
  title: string;
  desc: string;
  icon: ReactNode;
  onClick: () => void;
  footerAction?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={cn(
        "group flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border/80 bg-card p-2.5 text-left shadow-sm transition-all sm:p-4 md:p-5",
        "hover:border-primary/35 hover:bg-accent/30 hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-h-0 flex-1 flex-col text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg -m-0.5 p-0.5"
        )}
      >
        <div className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 sm:mb-3 sm:size-10 [&_svg]:size-4 sm:[&_svg]:size-5">
          {icon}
        </div>
        <h3 className="text-[11px] font-semibold leading-tight text-foreground sm:text-sm md:text-[0.9375rem]">
          {title}
        </h3>
        <p className="mt-1.5 flex-1 text-[10px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs md:text-sm">
          {desc}
        </p>
      </button>
      {footerAction ? (
        <button
          type="button"
          className="mt-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 sm:text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            footerAction.onClick();
          }}
        >
          {footerAction.label}
        </button>
      ) : null}
    </div>
  );
}

function parseLibraryIntent(sub?: string): CreativeIntent | "all" {
  if (
    sub === "unblock" ||
    sub === "explore" ||
    sub === "train" ||
    sub === "project_extend"
  ) {
    return sub;
  }
  return "all";
}

function LibraryScreen({
  navigate,
  librarySubSegment,
}: {
  navigate: NavigateFn;
  librarySubSegment?: string;
}) {
  const { deps } = useCreativeGym();
  const initialFilter = parseLibraryIntent(librarySubSegment);
  const [filter, setFilter] = useState<CreativeIntent | "all">(initialFilter);
  const [list, setList] = useState<ChallengeTemplate[]>(CHALLENGE_SEEDS);

  useEffect(() => {
    setFilter(parseLibraryIntent(librarySubSegment));
  }, [librarySubSegment]);

  useEffect(() => {
    void UC.listChallengesUseCase(deps, filter === "all" ? undefined : { intent: filter }).then(
      setList
    );
  }, [deps, filter]);

  const setFilterAndNavigate = (k: CreativeIntent | "all") => {
    setFilter(k);
    if (k === "all") {
      navigate("gym", "library");
    } else {
      navigate("gym", "library", k);
    }
  };

  return (
    <section className="min-h-screen pb-16 text-foreground px-4 py-8 mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GymHubMenu navigate={navigate} current="library" />
        <h1 className="text-lg font-semibold text-foreground">Library</h1>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "unblock", "explore", "train", "project_extend"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "secondary" : "ghost"}
            className="text-xs"
            onClick={() => setFilterAndNavigate(k)}
          >
            {k === "all" ? "Alle" : k}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c) => (
          <Card key={c.id} className="border-border bg-card">
            <CardHeader>
              <div className="flex justify-between gap-2">
                <CardTitle className="text-base">{c.title}</CardTitle>
                <Badge variant="outline" className="text-[10px] border-border">
                  {c.difficulty}
                </Badge>
              </div>
              <CardDescription className="text-xs line-clamp-2">{c.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={() => {
                  writeSetupIntent(c.defaultIntent);
                  writeSetupChallengeId(c.id);
                  navigate("gym", "session", "new");
                }}
              >
                Im Setup wählen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ProgressScreen({ navigate }: { navigate: NavigateFn }) {
  const { progressOverview: data } = useCreativeGym();
  const p = data?.profile;

  return (
    <section className="min-h-screen pb-16 text-foreground px-4 py-8 mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GymHubMenu navigate={navigate} current="progress" />
        <h1 className="text-lg font-semibold text-foreground">Progress</h1>
      </div>
      {!p ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Skill-Raster</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Originalität", p.originality],
                ["Konflikt", p.conflict],
                ["Perspektive", p.perspective],
                ["Kompression", p.compression],
                ["Dialog", p.dialogueTension],
                ["Fluss", p.sceneFlow],
                ["Struktur", p.structure],
                ["Abschluss", p.finishing],
                ["Transfer", p.mediaTranslation],
              ].map(([name, val]) => {
                const n = Number(val);
                return (
                <div key={String(name)} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{name}</span>
                    <span className="text-primary">{n.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, n)}%` }}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Schwächen</h2>
            <p className="text-sm">{data?.weakSpots.join(" · ") || "—"}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function AssetsScreen({ navigate }: { navigate: NavigateFn }) {
  const { deps, mode } = useCreativeGym();
  const [capsules, setCapsules] = useState<Awaited<ReturnType<typeof deps.capsuleBridge.listCapsules>>>(
    []
  );
  const [artifacts, setArtifacts] = useState<Awaited<ReturnType<typeof deps.artifacts.listByUser>>>(
    []
  );
  const [title, setTitle] = useState("");

  const reload = useCallback(async () => {
    setCapsules(await deps.capsuleBridge.listCapsules(deps.userId));
    setArtifacts(await deps.artifacts.listByUser(deps.userId));
  }, [deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <section className="min-h-screen pb-16 text-foreground px-4 py-8 mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GymHubMenu navigate={navigate} current="assets" />
        <h1 className="text-lg font-semibold text-foreground">Capsules</h1>
      </div>
      <div className="mb-8">
        <h2 className="text-sm font-medium mb-2">Neue Capsule</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            onClick={async () => {
              if (!title.trim()) return;
              await deps.capsuleBridge.createCapsule({
                userId: deps.userId,
                title: title.trim(),
              });
              setTitle("");
              await reload();
              toast.success("Capsule angelegt");
            }}
          >
            Anlegen
          </Button>
        </div>
        {mode === "integrated" && (
          <p className="text-xs text-muted-foreground mt-2">
            Scriptony-Projekte: Transfer aus Session-Abschluss (integrierter Modus).
          </p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Capsules</h3>
          <ul className="space-y-2">
            {capsules.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border px-3 py-2 text-sm flex justify-between"
              >
                <span>{c.title}</span>
                <span className="text-muted-foreground">{c.artifactIds.length} Artefakte</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Artefakte</h3>
          <ul className="space-y-2">
            {artifacts.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{a.title}</span>
                <span className="text-muted-foreground text-xs block">{a.transferStatus}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SessionSetupScreen({
  navigate,
  onOpenAiSettings,
}: {
  navigate: NavigateFn;
  onOpenAiSettings?: () => void;
}) {
  const { deps } = useCreativeGym();
  const intent = readSetupIntent() ?? "unblock";
  const [medium, setMedium] = useState<CreativeMedium>("prose");
  const [difficulty, setDifficulty] = useState<Difficulty>("focused");
  const [sessionMode, setSessionMode] = useState<SessionMode>("exploration");
  const [timeBudget, setTimeBudget] = useState(15);
  const [challengeId, setChallengeId] = useState(CHALLENGE_SEEDS[0]?.id ?? "");

  const filtered = useMemo(
    () => CHALLENGE_SEEDS.filter((c) => c.defaultIntent === intent || c.tags.includes(`intent:${intent}`)),
    [intent]
  );

  useEffect(() => {
    const preset = readSetupChallengeId();
    if (preset && CHALLENGE_SEEDS.some((c) => c.id === preset)) {
      setChallengeId(preset);
      return;
    }
    if (filtered.length) {
      setChallengeId((prev) =>
        filtered.some((c) => c.id === prev) ? prev : filtered[0].id
      );
    }
  }, [intent, filtered]);

  const start = async () => {
    clearSetupIntent();
    clearSetupChallengeId();
    const mode = await import("../application/wiring").then((m) => m.resolveCreativeGymMode());
    const session = await UC.startCreativeSession(deps, {
      mode,
      intent,
      medium,
      sessionMode,
      difficulty,
      challengeTemplateId: challengeId,
      timeBudgetMin: timeBudget,
      intensityLabel: difficulty,
    });
    navigate("gym", "session", session.id);
  };

  return (
    <section className="min-h-screen pb-16 text-foreground px-4 py-8 mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate("gym")}>
        <ArrowLeft className="size-4" />
        Zurück
      </Button>
      <h1 className="text-xl font-semibold mb-6">Session Setup</h1>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Intent</Label>
          <p className="text-sm capitalize">{intent}</p>
        </div>
        {intent === "project_extend" ? (
          <div className="rounded-lg border border-border bg-muted/25 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-2">
              Capsules und Artefakte vor der Session anlegen oder auswählen.
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => navigate("gym", "assets")}
            >
              Capsules verwalten
            </Button>
          </div>
        ) : null}
        <div>
          <Label className="text-xs text-muted-foreground">Medium</Label>
          <Select value={medium} onValueChange={(v) => setMedium(v as CreativeMedium)}>
            <SelectTrigger className="border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prose">Prosa</SelectItem>
              <SelectItem value="screenplay">Drehbuch</SelectItem>
              <SelectItem value="audio_drama">Hörspiel</SelectItem>
              <SelectItem value="film_visual">Film / Visual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Challenge</Label>
          <Select value={challengeId} onValueChange={setChallengeId}>
            <SelectTrigger className="border-border bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(filtered.length ? filtered : CHALLENGE_SEEDS).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Session-Modus</Label>
            <Select value={sessionMode} onValueChange={(v) => setSessionMode(v as SessionMode)}>
              <SelectTrigger className="border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warmup">Warmup</SelectItem>
                <SelectItem value="exploration">Exploration</SelectItem>
                <SelectItem value="breakthrough">Breakthrough</SelectItem>
                <SelectItem value="craft">Craft</SelectItem>
                <SelectItem value="finisher">Finisher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Intensität</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Leicht</SelectItem>
                <SelectItem value="focused">Fokus</SelectItem>
                <SelectItem value="brutal">Hart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Zeitbudget (Min)</Label>
          <input
            type="number"
            min={5}
            max={120}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={timeBudget}
            onChange={(e) => setTimeBudget(Number(e.target.value))}
          />
        </div>
        {onOpenAiSettings ? (
          <p className="text-xs text-muted-foreground">
            <button type="button" className="underline underline-offset-2" onClick={() => onOpenAiSettings()}>
              KI &amp; API-Keys konfigurieren
            </button>
          </p>
        ) : null}
        <Button className="w-full" onClick={() => void start()}>
          Session starten
        </Button>
      </div>
    </section>
  );
}

function SessionFlowScreen({
  sessionId,
  navigate,
  onOpenAiSettings,
}: {
  sessionId: string;
  navigate: NavigateFn;
  onOpenAiSettings?: () => void;
}) {
  const { deps, mode } = useCreativeGym();
  const [session, setSession] = useState<CreativeSession | null>(null);
  const [tpl, setTpl] = useState<ChallengeTemplate | null>(null);
  const [body, setBody] = useState("");
  const [rescueText, setRescueText] = useState<string | null>(null);
  const [phase, setPhase] = useState<"active" | "done">("active");
  const [reviewUsefulness, setReviewUsefulness] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [transferReady, setTransferReady] = useState(false);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [target, setTarget] = useState<TransferTargetType>("scene_list");
  const [capsules, setCapsules] = useState<Awaited<ReturnType<typeof deps.capsuleBridge.listCapsules>>>(
    []
  );
  const [capsuleId, setCapsuleId] = useState("");
  const startedAt = useRef(Date.now());
  const starterRequestedRef = useRef(false);
  const [starterLoading, setStarterLoading] = useState(false);

  const load = useCallback(async () => {
    const s = await deps.sessions.getById(sessionId);
    setSession(s);
    if (s) {
      setBody(s.content.body);
      startedAt.current = new Date(s.startedAt).getTime();
      if (s.status === "completed") {
        setPhase("done");
      }
      const t = await deps.challenges.getById(s.challengeTemplateId);
      setTpl(t);
    }
  }, [deps, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || !tpl || phase !== "active") return;
    if (starterRequestedRef.current) return;
    if (session.content.body.trim() !== "") {
      starterRequestedRef.current = true;
      return;
    }
    starterRequestedRef.current = true;
    setStarterLoading(true);
    const projectId =
      session.sourceContext?.sourceType === "project" ? session.sourceContext.sourceId : undefined;
    const uiLang = typeof document !== "undefined" && document.documentElement.lang?.startsWith("en") ? "en" : "de";
    void (async () => {
      try {
        const res = await requestGymStarter({
          challenge_template_id: session.challengeTemplateId,
          medium: session.medium,
          source_project_id: projectId,
          regenerate: false,
          ui_language: uiLang,
        });
        const latest = await deps.sessions.getById(sessionId);
        if (!latest) return;
        await deps.sessions.update({
          ...latest,
          content: {
            ...latest.content,
            body: res.text,
            metadata: {
              ...latest.content.metadata,
              gymAi: {
                generatedAt: new Date().toISOString(),
                challengeTemplateId: session.challengeTemplateId,
              },
            },
          },
        });
        setBody(res.text);
        await load();
      } catch (e) {
        starterRequestedRef.current = false;
        const msg = e instanceof Error ? e.message : "Starter-Text konnte nicht geladen werden.";
        toast.error(
          onOpenAiSettings && /API|Key|Hosted|konfiguriert/i.test(msg)
            ? `${msg} — Button „KI-Einstellungen“ oben.`
            : msg
        );
      } finally {
        setStarterLoading(false);
      }
    })();
  }, [session, tpl, phase, deps, sessionId, load, onOpenAiSettings]);

  useEffect(() => {
    void deps.projectBridge.listProjects(deps.userId).then((p) => {
      setProjects(p);
      if (p[0]) setProjectId(p[0].id);
    });
    void deps.capsuleBridge.listCapsules(deps.userId).then((c) => {
      setCapsules(c);
      if (c[0]) setCapsuleId(c[0].id);
    });
  }, [deps]);

  useEffect(() => {
    if (phase !== "done" || artifactId) return;
    void deps.artifacts.listByUser(deps.userId).then((list) => {
      const a = list.find((x) => x.sessionId === sessionId);
      if (a) setArtifactId(a.id);
    });
  }, [phase, artifactId, deps, sessionId]);

  const renderer = tpl?.renderers?.[session?.medium ?? "prose"];

  const shuffleStarter = async () => {
    if (!session) return;
    setStarterLoading(true);
    const projectId =
      session.sourceContext?.sourceType === "project" ? session.sourceContext.sourceId : undefined;
    const uiLang = typeof document !== "undefined" && document.documentElement.lang?.startsWith("en") ? "en" : "de";
    try {
      const res = await requestGymStarter({
        challenge_template_id: session.challengeTemplateId,
        medium: session.medium,
        source_project_id: projectId,
        regenerate: true,
        ui_language: uiLang,
      });
      const latest = await deps.sessions.getById(sessionId);
      if (!latest) return;
      await deps.sessions.update({
        ...latest,
        content: {
          ...latest.content,
          body: res.text,
          metadata: {
            ...latest.content.metadata,
            gymAi: {
              generatedAt: new Date().toISOString(),
              challengeTemplateId: session.challengeTemplateId,
            },
          },
        },
      });
      setBody(res.text);
      await load();
      toast.success("Neuer Starter-Text");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neu würfeln fehlgeschlagen.";
      toast.error(
        onOpenAiSettings && /API|Key|Hosted|konfiguriert/i.test(msg)
          ? `${msg} — Button „KI-Einstellungen“ oben.`
          : msg
      );
    } finally {
      setStarterLoading(false);
    }
  };

  const runRescue = async (action: RescueActionId) => {
    try {
      const { output } = await UC.runRescueAction(deps, sessionId, action);
      setRescueText(output.nudgeText ?? output.message);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rescue fehlgeschlagen");
    }
  };

  const complete = async () => {
    try {
      const { session: s } = await UC.completeCreativeSession(deps, {
        sessionId,
        body,
        review: {
          usefulness: reviewUsefulness,
          transferReady,
        },
        startedAtMs: startedAt.current,
      });
      setSession(s);
      setPhase("done");
      const art = await UC.buildArtifactFromSessionUseCase(deps, sessionId);
      setArtifactId(art.id);
      toast.success("Session abgeschlossen");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const transfer = async () => {
    if (!artifactId) return;
    const r = await UC.transferArtifactUseCase(deps, artifactId, projectId, target);
    if (r.ok) toast.success(r.message ?? "Transfer ok");
    else toast.error(r.message ?? "Transfer fehlgeschlagen");
  };

  const toCapsule = async () => {
    if (!artifactId || !capsuleId) return;
    await UC.transferArtifactToCapsuleUseCase(deps, artifactId, capsuleId);
    toast.success("In Capsule gespeichert");
  };

  if (!session || !tpl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8c85a8]">
        Session wird geladen…
      </div>
    );
  }

  if (phase === "done") {
    return (
      <section className="min-h-screen pb-16 text-[#e8e4f4] px-4 py-8 mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold mb-4">Output & Transfer</h1>
        <Textarea
          className="min-h-[200px] border-[#2b2740] bg-[#14121c] mb-4"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {mode === "integrated" && projects.length > 0 && (
          <div className="rounded-xl border border-[#2b2740] p-4 space-y-3 mb-4">
            <h3 className="text-sm font-medium">Nach Scriptony</h3>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Projekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={target} onValueChange={(v) => setTarget(v as TransferTargetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scene_list">Szenenliste</SelectItem>
                <SelectItem value="idea_bank">Ideen / Notizen</SelectItem>
                <SelectItem value="outline_area">Outline</SelectItem>
                <SelectItem value="character_area">Charakter</SelectItem>
                <SelectItem value="worldbuilding_area">Worldbuilding</SelectItem>
                <SelectItem value="production_board">Production</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => void transfer()}>
              Transferieren
            </Button>
          </div>
        )}
        <div className="rounded-xl border border-[#2b2740] p-4 space-y-3">
          <h3 className="text-sm font-medium">Capsule</h3>
          <Select value={capsuleId} onValueChange={setCapsuleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {capsules.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" className="w-full" onClick={() => void toCapsule()}>
            In Capsule speichern
          </Button>
        </div>
        <Button variant="ghost" className="mt-6" onClick={() => navigate("gym")}>
          Zur Startseite
        </Button>
      </section>
    );
  }

  return (
    <section className="min-h-screen text-[#e8e4f4] flex flex-col lg:flex-row">
      <aside className="lg:w-[320px] border-b lg:border-b-0 lg:border-r border-[#2b2740] p-4 space-y-3 bg-[#181629]">
        <Button variant="ghost" size="sm" className="gap-1 mb-2" onClick={() => navigate("gym")}>
          <ArrowLeft className="size-4" />
          Home
        </Button>
        <h2 className="font-semibold text-sm">{tpl.title}</h2>
        <p className="text-xs text-[#8c85a8]">{tpl.description}</p>
        <div className="text-xs space-y-2">
          <p className="text-[#a89fd4] font-medium">Anweisung ({session.medium})</p>
          <p>{renderer?.instruction}</p>
          <ul className="list-disc pl-4 text-[#c7c0de]">
            {renderer?.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-[50vh]">
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-[#8c85a8]">Arbeitsfläche</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[10px] border-[#3b355a]"
              disabled={starterLoading}
              onClick={() => void shuffleStarter()}
            >
              <RefreshCw className={starterLoading ? "size-3 animate-spin" : "size-3"} />
              <span className="ml-1">Neu würfeln</span>
            </Button>
          </div>
          {starterLoading && (
            <p className="text-[10px] text-[#8c85a8]">KI erzeugt Starter-Text…</p>
          )}
          <Textarea
            className="min-h-[240px] mt-1 border-[#2b2740] bg-[#14121c] font-mono text-sm"
            placeholder={renderer?.suggestedOutputFormat}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs">Nützlichkeit (1–5)</Label>
              <Select
                value={String(reviewUsefulness)}
                onValueChange={(v) => setReviewUsefulness(Number(v) as 1 | 2 | 3 | 4 | 5)}
              >
                <SelectTrigger className="border-[#2b2740] bg-[#14121c]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={transferReady}
                onChange={(e) => setTransferReady(e.target.checked)}
              />
              <span className="text-xs">Transfer-bereit</span>
            </label>
          </div>
        </div>
        {rescueText && (
          <div className="px-4 pb-2 text-xs text-[#c7c0de] border-t border-[#2b2740] pt-2">
            Assist: {rescueText}
          </div>
        )}
        <div className="border-t border-[#2b2740] p-3 flex flex-wrap gap-1 bg-[#14121c]">
          {RESCUE_IDS.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="outline"
              className="text-[10px] h-7 border-[#3b355a]"
              onClick={() => void runRescue(id)}
            >
              {RESCUE_LABELS[id]}
            </Button>
          ))}
        </div>
      </main>
      <aside className="lg:w-[260px] border-t lg:border-t-0 lg:border-l border-[#2b2740] p-4 space-y-3 bg-[#181629]">
        <p className="text-xs text-[#8c85a8]">Session</p>
        <Button className="w-full" onClick={() => void complete()}>
          Abschließen
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            const t = tpl.mutations[0];
            if (!t) return;
            try {
              await UC.retrySessionWithMutation(deps, sessionId, t.id);
              await load();
              toast.info("Mutation angewendet");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Fehler");
            }
          }}
        >
          Mutation
        </Button>
      </aside>
    </section>
  );
}
