/**
 * Creative Gym use cases (orchestration only; no React).
 * Location: src/modules/creative-gym/application/use-cases/index.ts
 */

import type { CreativeGymDeps } from "../creative-gym-deps";
import type {
  ChallengeFilter,
  ChallengeTemplate,
  CreativeArtifact,
  CreativeIntent,
  CreativeMedium,
  CreativeSession,
  Difficulty,
  SessionMode,
  SessionReview,
  SkillProfile,
  TransferTargetType,
} from "../../domain/types";
import { mergeCompletedSession } from "../../domain/services/progress-from-sessions";

function newId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  return c?.randomUUID ? c.randomUUID() : `cg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface StartSessionInput {
  mode: CreativeSession["mode"];
  intent: CreativeIntent;
  medium: CreativeMedium;
  sessionMode: SessionMode;
  difficulty: Difficulty;
  challengeTemplateId: string;
  timeBudgetMin?: number;
  intensityLabel?: string;
  sourceProjectId?: string;
  sourceLabel?: string;
}

export async function startCreativeSession(
  deps: CreativeGymDeps,
  input: StartSessionInput
): Promise<CreativeSession> {
  const tpl = await deps.challenges.getById(input.challengeTemplateId);
  if (!tpl) throw new Error("Challenge nicht gefunden");

  const session: CreativeSession = {
    id: newId(),
    userId: deps.userId,
    mode: input.mode,
    intent: input.intent,
    medium: input.medium,
    sessionMode: input.sessionMode,
    difficulty: input.difficulty,
    challengeTemplateId: tpl.id,
    sourceContext:
      input.sourceProjectId && input.sourceLabel
        ? {
            sourceType: "project",
            sourceId: input.sourceProjectId,
            sourceLabel: input.sourceLabel,
          }
        : { sourceType: "blank" },
    startedAt: new Date().toISOString(),
    status: "active",
    content: { body: "" },
    metrics: {
      durationSec: 0,
      rescuesUsed: 0,
      mutationsUsed: 0,
      retries: 0,
    },
    timeBudgetMin: input.timeBudgetMin,
    intensityLabel: input.intensityLabel,
  };

  return deps.sessions.create(session);
}

export async function resumeCreativeSession(
  deps: CreativeGymDeps,
  sessionId: string
): Promise<CreativeSession | null> {
  return deps.sessions.getById(sessionId);
}

export interface CompleteSessionInput {
  sessionId: string;
  body: string;
  title?: string;
  review: SessionReview;
  startedAtMs: number;
}

export async function completeCreativeSession(
  deps: CreativeGymDeps,
  input: CompleteSessionInput
): Promise<{ session: CreativeSession; profile: SkillProfile }> {
  const session = await deps.sessions.getById(input.sessionId);
  if (!session) throw new Error("Session nicht gefunden");

  const tpl = await deps.challenges.getById(session.challengeTemplateId);
  const ended = new Date().toISOString();
  const durationSec = Math.max(
    0,
    Math.round((Date.now() - input.startedAtMs) / 1000)
  );

  const updated: CreativeSession = {
    ...session,
    status: "completed",
    completedAt: ended,
    content: {
      ...session.content,
      body: input.body,
      title: input.title ?? session.content.title,
    },
    metrics: {
      ...session.metrics,
      durationSec,
    },
    review: input.review,
  };

  await deps.sessions.update(updated);

  let profile =
    (await deps.skills.getByUser(deps.userId)) ??
    (await deps.skills.save({
      userId: deps.userId,
      originality: 12,
      conflict: 12,
      perspective: 12,
      compression: 12,
      dialogueTension: 12,
      sceneFlow: 12,
      structure: 12,
      finishing: 12,
      mediaTranslation: 12,
      sessionsCompleted: 0,
      currentStreak: 0,
    }));

  if (tpl) {
    profile = mergeCompletedSession(
      profile,
      tpl.skillFocus,
      input.review.usefulness,
      input.review.transferReady
    );
    const today = new Date().toISOString().slice(0, 10);
    const last = profile.lastSessionDate?.slice(0, 10);
    if (last === today) {
      profile.currentStreak = profile.currentStreak || 1;
    } else if (last) {
      const d0 = new Date(last);
      const d1 = new Date(today);
      const diff = (d1.getTime() - d0.getTime()) / (86400 * 1000);
      profile.currentStreak = diff <= 1.5 ? profile.currentStreak + 1 : 1;
    } else {
      profile.currentStreak = 1;
    }
    profile.lastSessionDate = ended;
  }

  await deps.skills.save(profile);

  return { session: updated, profile };
}

export async function retrySessionWithMutation(
  deps: CreativeGymDeps,
  sessionId: string,
  mutationId: string
): Promise<{ session: CreativeSession; hint: string }> {
  const session = await deps.sessions.getById(sessionId);
  if (!session) throw new Error("Session nicht gefunden");

  const result = await deps.assist.generateChallengeMutation({
    sessionId,
    challengeTemplateId: session.challengeTemplateId,
    medium: session.medium,
    mutationId,
    currentBody: session.content.body,
  });

  const next: CreativeSession = {
    ...session,
    metrics: {
      ...session.metrics,
      mutationsUsed: session.metrics.mutationsUsed + 1,
      retries: session.metrics.retries + 1,
    },
    content: {
      ...session.content,
      body:
        session.content.body +
        (result.appendedInstruction ? `\n\n---\n${result.appendedInstruction}` : ""),
    },
  };

  await deps.sessions.update(next);
  return { session: next, hint: result.hint };
}

export async function runRescueAction(
  deps: CreativeGymDeps,
  sessionId: string,
  rescueVariantId: string
): Promise<{ session: CreativeSession; output: import("../../domain/types").RescueOutput }> {
  const session = await deps.sessions.getById(sessionId);
  if (!session) throw new Error("Session nicht gefunden");

  const out = await deps.assist.generateRescuePrompt({
    sessionId,
    rescueVariantId,
    challengeTemplateId: session.challengeTemplateId,
    medium: session.medium,
  });

  const next: CreativeSession = {
    ...session,
    metrics: {
      ...session.metrics,
      rescuesUsed: session.metrics.rescuesUsed + 1,
    },
  };
  await deps.sessions.update(next);
  return { session: next, output: out };
}

export async function listChallengesUseCase(
  deps: CreativeGymDeps,
  filters?: ChallengeFilter
): Promise<ChallengeTemplate[]> {
  return deps.challenges.list(filters);
}

export async function getDailyChallengeUseCase(
  deps: CreativeGymDeps
): Promise<ChallengeTemplate | null> {
  return deps.challenges.getDailyChallenge(deps.userId);
}

export async function getRecommendationsUseCase(deps: CreativeGymDeps) {
  const profile = await deps.skills.getByUser(deps.userId);
  const sessions = await deps.sessions.listByUser(deps.userId);
  const recent = sessions.slice(0, 8).map((s) => s.challengeTemplateId);
  return deps.recommendations.getRecommendations({
    userId: deps.userId,
    skillProfile: profile,
    recentChallengeIds: recent,
  });
}

export async function buildArtifactFromSessionUseCase(
  deps: CreativeGymDeps,
  sessionId: string
): Promise<CreativeArtifact> {
  const session = await deps.sessions.getById(sessionId);
  if (!session || session.status !== "completed") {
    throw new Error("Session nicht abgeschlossen");
  }
  const tpl = await deps.challenges.getById(session.challengeTemplateId);

  const artifact: CreativeArtifact = {
    id: newId(),
    userId: deps.userId,
    sessionId: session.id,
    outputType: tpl?.outputType ?? "fragment",
    title: session.content.title || tpl?.title || "Creative Gym Output",
    content: session.content.body,
    tags: tpl?.tags ?? [],
    sourceChallengeId: session.challengeTemplateId,
    medium: session.medium,
    transferStatus: "ready",
    createdInCreativeGym: true,
    createdAt: new Date().toISOString(),
  };

  return deps.artifacts.create(artifact);
}

export async function transferArtifactUseCase(
  deps: CreativeGymDeps,
  artifactId: string,
  projectId: string,
  target: TransferTargetType
): Promise<import("../../domain/types").TransferResult> {
  const art = await deps.artifacts.getById(artifactId);
  if (!art) return { ok: false, message: "Artifact fehlt" };

  const result = await deps.projectBridge.transferArtifact({
    artifactId: art.id,
    projectId,
    target,
    userId: deps.userId,
    title: art.title,
    content: art.content,
  });

  if (result.ok) {
    await deps.artifacts.update({
      ...art,
      transferStatus: "transferred",
    });
  }

  return result;
}

export async function transferArtifactToCapsuleUseCase(
  deps: CreativeGymDeps,
  artifactId: string,
  capsuleId: string
): Promise<void> {
  await deps.capsuleBridge.saveArtifactToCapsule({
    userId: deps.userId,
    capsuleId,
    artifactId,
  });
  const art = await deps.artifacts.getById(artifactId);
  if (art) {
    await deps.artifacts.update({ ...art, transferStatus: "transferred" });
  }
}

export async function getProgressOverviewUseCase(deps: CreativeGymDeps) {
  const profile = await deps.skills.getByUser(deps.userId);
  const sessions = await deps.sessions.listByUser(deps.userId);
  const completed = sessions.filter((s) => s.status === "completed");
  return {
    profile,
    sessionsCompleted: completed.length,
    recentSessions: sessions.slice(0, 12),
    weakSpots: profile ? computeWeakSpots(profile) : [],
  };
}

function computeWeakSpots(profile: SkillProfile): string[] {
  const dims: Array<[string, number]> = [
    ["Originalität", profile.originality],
    ["Konflikt", profile.conflict],
    ["Perspektive", profile.perspective],
    ["Kompression", profile.compression],
    ["Dialog-Spannung", profile.dialogueTension],
    ["Szenenfluss", profile.sceneFlow],
    ["Struktur", profile.structure],
    ["Abschluss", profile.finishing],
    ["Medien-Transfer", profile.mediaTranslation],
  ];
  dims.sort((a, b) => a[1] - b[1]);
  return dims.slice(0, 3).map(([name]) => name);
}
