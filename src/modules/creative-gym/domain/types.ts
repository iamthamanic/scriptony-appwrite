/**
 * Creative Gym — shared domain types (no Scriptony imports).
 * Location: src/modules/creative-gym/domain/types.ts
 */

export type CreativeGymMode = "integrated" | "standalone";

export type CreativeIntent =
  | "unblock"
  | "explore"
  | "train"
  | "project_extend";

export type CreativeMedium =
  | "prose"
  | "screenplay"
  | "audio_drama"
  | "film_visual";

export type SessionMode =
  | "warmup"
  | "exploration"
  | "breakthrough"
  | "craft"
  | "finisher";

export type Difficulty = "easy" | "focused" | "brutal";

export type ProblemType =
  | "starting_block"
  | "flat_idea"
  | "dead_scene"
  | "weak_conflict"
  | "no_voice"
  | "structure_gap"
  | "too_many_options"
  | "ending_problem"
  | "generic_output"
  | "finishing_problem";

export type SkillFocus =
  | "originality"
  | "conflict"
  | "perspective"
  | "compression"
  | "dialogue_tension"
  | "scene_flow"
  | "structure"
  | "finishing"
  | "media_translation";

export type OutputType =
  | "fragment"
  | "scene"
  | "beat"
  | "outline_node"
  | "character_note"
  | "world_note"
  | "dialogue_piece"
  | "shot_sequence"
  | "audio_scene"
  | "idea_seed";

export type TransferTargetType =
  | "project"
  | "capsule"
  | "idea_bank"
  | "character_area"
  | "outline_area"
  | "scene_list"
  | "worldbuilding_area"
  | "production_board";

export type RescueActionId =
  | "give_nudge"
  | "simplify"
  | "change_perspective"
  | "add_constraint"
  | "reduce_scope"
  | "generate_variant"
  | "switch_output_shape";

export interface ChallengeInputPolicy {
  allowBlank: boolean;
  allowProjectContext: boolean;
  allowImportedText: boolean;
  allowPriorSessionOutput: boolean;
}

export interface MediumChallengeRenderer {
  medium: CreativeMedium;
  instruction: string;
  rules: string[];
  successCriteria: string[];
  suggestedOutputFormat: string;
}

export interface ChallengeMutation {
  id: string;
  label: string;
  description: string;
}

export interface RescueVariant {
  id: string;
  label: string;
  promptHint: string;
}

export interface ChallengeTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  problemTypes: ProblemType[];
  skillFocus: SkillFocus[];
  supportedMedia: CreativeMedium[];
  defaultIntent: CreativeIntent;
  defaultSessionMode: SessionMode;
  recommendedDurationMin: number;
  difficulty: Difficulty;
  inputPolicy: ChallengeInputPolicy;
  outputType: OutputType;
  tags: string[];
  tiers: string[];
  /** Per-medium copy; engine picks by selected medium */
  renderers: Partial<Record<CreativeMedium, MediumChallengeRenderer>>;
  mutations: ChallengeMutation[];
  rescueVariants: RescueVariant[];
  /** Category for seed / library grouping */
  challengeCategory: "unblocker" | "explorer" | "craft" | "finisher";
}

export interface SessionSourceContext {
  sourceType: "blank" | "project" | "import" | "prior_output";
  sourceId?: string;
  sourceLabel?: string;
  excerpt?: string;
}

export interface SessionContent {
  title?: string;
  body: string;
  blocks?: unknown[];
  metadata?: Record<string, unknown> & {
    gymAi?: {
      generatedAt?: string;
      challengeTemplateId?: string;
    };
  };
}

export interface SessionMetrics {
  durationSec: number;
  rescuesUsed: number;
  mutationsUsed: number;
  retries: number;
}

export interface SessionReview {
  usefulness: 1 | 2 | 3 | 4 | 5;
  transferReady: boolean;
  notes?: string;
  selectedOutputType?: OutputType;
}

export type SessionStatus = "draft" | "active" | "completed" | "abandoned";

export interface CreativeSession {
  id: string;
  userId: string;
  mode: CreativeGymMode;
  intent: CreativeIntent;
  medium: CreativeMedium;
  sessionMode: SessionMode;
  difficulty: Difficulty;
  challengeTemplateId: string;
  sourceContext?: SessionSourceContext;
  startedAt: string;
  completedAt?: string;
  status: SessionStatus;
  content: SessionContent;
  metrics: SessionMetrics;
  review?: SessionReview;
  /** Setup phase: time budget & intensity label */
  timeBudgetMin?: number;
  intensityLabel?: string;
}

export interface CreativeArtifact {
  id: string;
  userId: string;
  sessionId: string;
  outputType: OutputType;
  title: string;
  content: string;
  tags: string[];
  sourceChallengeId: string;
  medium: CreativeMedium;
  transferStatus: "none" | "ready" | "transferred";
  createdInCreativeGym: boolean;
  createdAt: string;
}

export interface Capsule {
  id: string;
  userId: string;
  title: string;
  description?: string;
  artifactIds: string[];
  updatedAt: string;
}

export interface SkillProfile {
  userId: string;
  originality: number;
  conflict: number;
  perspective: number;
  compression: number;
  dialogueTension: number;
  sceneFlow: number;
  structure: number;
  finishing: number;
  mediaTranslation: number;
  sessionsCompleted: number;
  currentStreak: number;
  lastSessionDate?: string;
}

export interface TrainingRecommendation {
  id: string;
  reason: string;
  challengeTemplateId: string;
  intent: CreativeIntent;
  medium?: CreativeMedium;
}

export interface ChallengeFilter {
  intent?: CreativeIntent;
  medium?: CreativeMedium;
  maxDurationMin?: number;
  minDurationMin?: number;
  difficulty?: Difficulty;
  sessionMode?: SessionMode;
  skillFocus?: SkillFocus;
  problemType?: ProblemType;
  query?: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  type?: string;
}

export interface ProjectContext {
  projectId: string;
  title: string;
  type?: string;
}

export interface TransferArtifactToProjectInput {
  artifactId: string;
  projectId: string;
  target: TransferTargetType;
  userId: string;
  /** Passed by application layer so the bridge needs no extra fetch */
  title: string;
  content: string;
}

export interface TransferResult {
  ok: boolean;
  message?: string;
  externalId?: string;
}

export interface CreateCapsuleInput {
  userId: string;
  title: string;
  description?: string;
}

export interface SaveArtifactToCapsuleInput {
  userId: string;
  capsuleId: string;
  artifactId: string;
}

export interface RecommendationInput {
  userId: string;
  skillProfile: SkillProfile | null;
  recentChallengeIds: string[];
}

export interface MutationInput {
  sessionId: string;
  challengeTemplateId: string;
  medium: CreativeMedium;
  mutationId: string;
  currentBody: string;
}

export interface ChallengeMutationResult {
  hint: string;
  appendedInstruction?: string;
}

export interface RescueInput {
  sessionId: string;
  rescueVariantId: string;
  challengeTemplateId: string;
  medium: CreativeMedium;
}

export interface RescueOutput {
  message: string;
  nudgeText?: string;
}
