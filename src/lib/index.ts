/**
 * Scriptony Library - Central Export File
 *
 * Re-exports all library modules for convenient importing.
 *
 * Usage:
 * ```
 * import { formatDate, validateEmail, apiGet } from './lib';
 * ```
 */

// =============================================================================
// API Client
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
} from "./api-client";

// =============================================================================
// Environment & Configuration
// =============================================================================

export { appConfig, getAppConfig, type AppConfig } from "./env";

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
} from "./config";

// =============================================================================
// Type Definitions
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
} from "./types";

// =============================================================================
// Formatters
// =============================================================================

export {
  formatDate,
  parseDate,
  isToday,
  isPast,
  isFuture,
  getDaysDifference,
  type DateFormat,
  type Locale as DateLocale,
} from "./formatters/date";

export {
  formatNumber,
  formatDecimal,
  formatPercent,
  formatCurrency,
  formatFileSize,
  formatCompact,
  formatDuration,
  formatTimecode,
  formatRange,
  clamp,
  roundTo,
  isBetween,
  calculatePercentage,
  type Locale as NumberLocale,
} from "./formatters/number";

export {
  truncate,
  truncateWords,
  toTitleCase,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  slugify,
  capitalize,
  cleanWhitespace,
  stripHtml,
  escapeHtml,
  pluralize,
  getInitials,
  highlightText,
  formatList,
  extractMentions,
  extractHashtags,
  calculateReadingTime,
  wrapLongWords,
} from "./formatters/text";

// =============================================================================
// Validators
// =============================================================================

export {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  validatePasswordMatch,
  validateRequired,
  validateLength,
  validateAlphanumeric,
  validateUsername,
  validateNumber,
  validateRange,
  validatePositive,
  validateFileSize,
  validateFileType,
  validateUrl,
  validateFutureDate,
  combineValidators,
  type ValidationResult,
  type PasswordStrength,
  type Validator,
} from "./validators/input";

// =============================================================================
// Utilities
// =============================================================================

export {
  // Array utilities
  unique,
  groupBy,
  chunk,
  shuffle,
  randomItem,
  sortBy,

  // Object utilities
  deepClone,
  deepEqual,
  pick,
  omit,
  deepMerge,

  // Function utilities
  debounce,
  throttle,
  memoize,
  retry,

  // Promise utilities
  sleep,
  parallelLimit,

  // String utilities
  generateId,
  generateUUID,

  // Type guards
  isNullish,
  isEmpty,
  isPlainObject,

  // Browser utilities
  copyToClipboard,
  downloadFile,
  isBrowser,
  getQueryParam,

  // LocalStorage utilities
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
} from "./utils";
