/**
 * Shared TypeScript Type Definitions
 *
 * Centralized type definitions used across the application.
 * Organized by domain.
 */

// =============================================================================
// User & Auth
// =============================================================================

export type UserRole = "user" | "admin" | "superadmin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  lastSignIn?: string | null;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// =============================================================================
// Organization (Multi-Tenancy)
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

// =============================================================================
// Projects & Scriptwriting
// =============================================================================

export interface Project {
  id: string;
  title: string;
  description: string;
  genre?: string;
  format?: "film" | "series" | "short" | "webseries" | "other";
  status?: "draft" | "in-progress" | "completed";
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  // Narrative Structure (Film/Book/Audio)
  narrative_structure?: string;
  // Episode/Season Structure (Series only)
  episode_layout?: string;
  season_engine?: string;
  // Story Beat Template (All types)
  beat_template?: string;
  // Relations
  episodeCount?: number;
  characterCount?: number;
  sceneCount?: number;
}

export interface Episode {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description?: string;
  duration?: number;
  status?: "outline" | "draft" | "revision" | "final";
  createdAt: string;
  updatedAt: string;
  // Relations
  sceneCount?: number;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role?: "protagonist" | "antagonist" | "supporting" | "minor";
  description?: string;
  age?: number;
  imageUrl?: string;
  /** Zusätzliche Referenzbilder (URLs oder data URLs), aus `reference_images_json` */
  referenceImageUrls?: string[];
  traits?: string[];
  backstory?: string;
  /** Extended profile fields (UI / imports). */
  gender?: string;
  species?: string;
  skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  personality?: string;
  createdAt: string;
  updatedAt: string;
  /** Legacy snake_case from some API payloads. */
  image_url?: string;
  updated_at?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  episodeId?: string;
  sequenceId?: string; // NEW: Zuordnung zu Sequence
  actId?: string; // Legacy/Optional
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  sceneNumber: number; // Konsistent mit API (Timeline API verwendet sceneNumber)
  number?: number; // Legacy field for backwards compatibility
  title: string;
  description?: string;
  location?: string;
  /** Scene heading / slug line (INT/EXT, location) from screenplay views. */
  setting?: string;
  timeOfDay?: "day" | "night" | "dawn" | "dusk";
  /** Plain string or TipTap JSON (stringified or parsed in the client). */
  content?: unknown;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  notes?: string;
  status?: "outline" | "draft" | "revision" | "final";
  duration?: number; // in minutes
  orderIndex?: number; // Sortierung innerhalb Sequence
  color?: string; // NEW: Farbe für Scene
  wordCount?: number; // 📖 For books (sections): Word count in this section
  createdAt: string;
  updatedAt: string;
  // Relations
  characterIds?: string[];
  characters?: Character[];
}

// =============================================================================
// Film Hierarchie: Acts → Sequences → Scenes → Shots
// =============================================================================

export interface Act {
  id: string;
  projectId: string;
  actNumber: number;
  title?: string;
  description?: string;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  color?: string; // Hex color for UI
  orderIndex: number;
  wordCount?: number; // 📖 For books: Total word count in this act
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  sequences?: Sequence[];
}

export interface Sequence {
  id: string;
  actId: string;
  /** Denormalized for client filters / optimistic rows (API may include). */
  projectId?: string;
  sequenceNumber: number;
  title?: string;
  description?: string;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  color?: string; // Hex color for UI
  orderIndex: number;
  wordCount?: number; // 📖 For books (chapters): Total word count in this chapter
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  scenes?: Scene[];
}

export interface ShotAudio {
  id: string;
  shotId: string;
  type: "music" | "sfx";
  fileUrl: string;
  fileName: string;
  label?: string;
  fileSize?: number;
  startTime?: number; // Trim start time in seconds
  endTime?: number; // Trim end time in seconds
  fadeIn?: number; // Fade in duration in seconds
  fadeOut?: number; // Fade out duration in seconds
  waveformData?: number[]; // Cached waveform peaks
  duration?: number; // Audio duration in seconds
  createdAt: string;
}

/**
 * Editorial timeline segment (NLE). Persisted in Appwrite `clips`.
 * Global times on the project timeline (0 .. project duration).
 * Phase 1: single lane (`laneIndex` always 0 in UI).
 */
export interface Clip {
  id: string;
  projectId: string;
  shotId: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  laneIndex: number;
  orderIndex: number;
  sourceInSec?: number;
  sourceOutSec?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shot {
  id: string;
  sceneId: string;
  /** Denormalized when API / UI needs project scope. */
  projectId?: string;
  shotNumber: string; // e.g. "1A", "2", "3B"
  description?: string;
  // Camera
  cameraAngle?: string; // 'Eye Level', 'High Angle', 'Low Angle', 'Bird\'s Eye View', etc.
  cameraMovement?: string; // 'Static', 'Pan', 'Tilt', 'Dolly In/Out', 'Handheld', etc.
  framing?: string; // 'ECU', 'CU', 'MCU', 'MS', 'WS', 'EWS', etc.
  lens?: string; // '14mm', '24mm', '35mm', '50mm', '85mm', '100mm', etc.
  // Timing — planning only (coverage / intent). Editorial duration lives on `Clip` rows.
  duration?: string; // Legacy '3s', '0:05'
  /** Planned shot length (minutes) — not the same as sum of clip durations. */
  shotlengthMinutes?: number;
  /** Planned shot length (seconds component) — not editorial geometry. */
  shotlengthSeconds?: number;
  /** Legacy snake_case from API responses. */
  shotlength_minutes?: number;
  shotlength_seconds?: number;
  scene_id?: string;
  // Visual
  composition?: string;
  lightingNotes?: string;
  imageUrl?: string; // Shot preview image
  /** Appwrite Storage file ID for Stage2D JSON (`stage-schema-info` document) */
  stage2dFileId?: string;
  stage2d_file_id?: string;
  /** Appwrite Storage file ID for Stage3D document */
  stage3dFileId?: string;
  stage3d_file_id?: string;
  /** Set when image was uploaded (e.g. image/png, image/jpeg) for UI badge */
  shotImageMime?: string;
  shot_image_mime?: string;
  // Audio
  soundNotes?: string;
  // Production
  storyboardUrl?: string;
  referenceImageUrl?: string;
  // Content
  dialog?: string; // Dialog text with @-mentions
  notes?: string; // Production notes
  // Ordering
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  /** Legacy snake_case from API. */
  updated_at?: string;
  updatedBy?: string; // User ID who last updated (TODO: Backend support needed)
  // Relations (populated by server)
  characters?: Character[];
  audioFiles?: ShotAudio[];
  /** TipTap JSON or extra shot payload from API / screenplay views. */
  metadata?: Record<string, unknown>;
  // Puppet-Layer revision counters (set by Bridge / Blender Addon)
  blenderSyncRevision?: number;
  guideBundleRevision?: number;
  styleProfileRevision?: number;
  renderRevision?: number;
  lastBlenderSyncAt?: string | null;
  lastPreviewAt?: string | null;
  /** ID of the accepted render job (set by accept) */
  acceptedRenderJobId?: string | null;
  /** ID of the most recent render job (set by create/reject) */
  latestRenderJobId?: string | null;
}

// =============================================================================
// Puppet-Layer: Render Jobs & Freshness
// =============================================================================

export type RenderJobStatus = "queued" | "executing" | "completed" | "failed";
export type ReviewStatus = "pending" | "accepted" | "rejected";

export interface RenderJob {
  id: string;
  userId: string;
  projectId: string;
  shotId: string;
  type: string;
  jobClass: string;
  status: RenderJobStatus;
  reviewStatus: ReviewStatus;
  acceptedAt: string | null;
  acceptedBy: string | null;
  guideBundleId: string;
  styleProfileId: string;
  repairConfig: string | null;
  outputImageIds: string[];
  createdAt: string;
  completedAt: string | null;
}

// Re-export freshness types from the shared module (single source of truth).
// Avoids duplicate definitions that could drift out of sync.
export type {
  FreshnessStatus,
  ShotFreshnessResult,
} from "../../../functions/_shared/freshness";

// =============================================================================
// Worldbuilding
// =============================================================================

export interface World {
  id: string;
  name: string;
  description: string;
  genre?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  // Relations
  categoryCount?: number;
  itemCount?: number;
}

export type WorldCategoryType =
  | "geography"
  | "politics"
  | "culture"
  | "history"
  | "technology"
  | "magic"
  | "religion"
  | "economy"
  | "custom";

export interface WorldCategory {
  id: string;
  worldId: string;
  name: string;
  type: WorldCategoryType;
  icon?: string;
  color?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  itemCount?: number;
}

export interface WorldItem {
  id: string;
  worldId: string;
  categoryId: string;
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Creative Gym
// =============================================================================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: string;
  timeLimit?: number; // in minutes
  points?: number;
  createdAt: string;
}

export interface ArtForm {
  id: string;
  name: string;
  description: string;
  category?: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  artFormId: string;
  title: string;
  description: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration?: number;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  exercises: Exercise[];
  startDate: string;
  endDate?: string;
  progress?: number;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon?: string;
  earnedAt: string;
}

// =============================================================================
// Script Analysis & Upload
// =============================================================================

export interface ScriptUpload {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "processing" | "completed" | "failed";
  uploadedAt: string;
  processedAt?: string;
  analysis?: ScriptAnalysis;
}

export interface ScriptAnalysis {
  characterCount: number;
  sceneCount: number;
  pageCount: number;
  wordCount: number;
  estimatedDuration: number;
  characters: Array<{
    name: string;
    dialogueCount: number;
    firstAppearance: number;
  }>;
  scenes: Array<{
    number: number;
    location: string;
    timeOfDay: string;
    pageCount: number;
  }>;
  insights?: {
    pacing?: string;
    structure?: string;
    suggestions?: string[];
  };
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SingleResponse<T> {
  item: T;
}

export interface CreateResponse<T> {
  item: T;
  message?: string;
}

export interface UpdateResponse<T> {
  item: T;
  message?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  details?: any;
  code?: string;
}

// =============================================================================
// Statistics & Analytics
// =============================================================================

export interface Stats {
  totalUsers?: number;
  totalOrganizations?: number;
  totalProjects?: number;
  totalWorlds?: number;
  totalScenes?: number;
  totalCharacters?: number;
}

export interface Analytics {
  userGrowth?: Array<{ date: string; count: number }>;
  projectsByGenre?: Array<{ genre: string; count: number }>;
  activeUsers?: number;
  popularFeatures?: Array<{ feature: string; usage: number }>;
}
