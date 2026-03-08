/**
 * Scriptony Library - Minimal Export (Critical Only)
 * 
 * This is a minimal version that exports only critical functionality.
 * Use this if the full lib/index.ts has import errors.
 */

// =============================================================================
// API Client (CRITICAL - MUST WORK)
// =============================================================================

export {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
  isApiError,
  type ApiError,
  type ApiResponse,
  type ApiErrorResponse,
  type ApiResult,
} from './api-client';

// =============================================================================
// Environment & Configuration (CRITICAL)
// =============================================================================

export {
  appConfig,
  getAppConfig,
  type AppConfig,
} from './env';

export {
  API_CONFIG,
  STORAGE_CONFIG,
  STORAGE_KEYS,
  FEATURE_FLAGS,
  USER_ROLES,
  PAGINATION,
  APP_METADATA,
  TEST_USER,
  type UserRole,
} from './config';

// =============================================================================
// Type Definitions (CRITICAL)
// =============================================================================

export type {
  User,
  UserRole as UserRoleType,
  AuthSession,
  Organization,
  Project,
  Episode,
  Character,
  Scene,
  World,
  WorldCategory,
  WorldCategoryType,
  WorldItem,
  Challenge,
  ArtForm,
  Exercise,
  TrainingPlan,
  Achievement,
  ScriptUpload,
  ScriptAnalysis,
  ListResponse,
  SingleResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  ErrorResponse,
  Stats,
  Analytics,
} from './types';
