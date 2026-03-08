/**
 * Application Configuration Constants
 * 
 * Centralized location for all app-wide configuration values.
 * Separated from env.ts to keep environment validation pure.
 */

// =============================================================================
// API Configuration
// =============================================================================

export const API_CONFIG = {
  /**
   * Base path for all backend function routes
   * DEPRECATED: Now using API Gateway with multi-function routing
   * Keep empty for direct function calls via API Gateway
   */
  SERVER_BASE_PATH: '',
  
  /**
   * Request timeout in milliseconds
   */
  REQUEST_TIMEOUT: 30000, // 30 seconds
  
  /**
   * Retry configuration for failed requests
   */
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
} as const;

// =============================================================================
// Storage Configuration
// =============================================================================

export const STORAGE_CONFIG = {
  /**
   * Legacy storage bucket prefix used by older paths
   */
  BUCKET_PREFIX: 'make-3b52693b',
  
  /**
   * Maximum file upload size in bytes (5MB)
   */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /**
   * Allowed image MIME types
   */
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ] as const,
  
  /**
   * Profile image dimensions
   */
  PROFILE_IMAGE: {
    MAX_WIDTH: 1024,
    MAX_HEIGHT: 1024,
    CROP_ASPECT: 1, // Square aspect ratio
  },
} as const;

// =============================================================================
// LocalStorage Keys
// =============================================================================

export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'i18nextLng',
  HAS_MIGRATED: 'scriptony_has_migrated_postgres',
  HAS_SEEDED_USER: 'scriptony_has_seeded_user',
  ONBOARDING_COMPLETE: 'scriptony_onboarding_complete',
} as const;

// =============================================================================
// Feature Flags
// =============================================================================

export const FEATURE_FLAGS = {
  /**
   * Enable auto-migration on app start
   */
  AUTO_MIGRATION: true,
  
  /**
   * Enable ScriptonyAssistant @// functionality
   */
  ASSISTANT_REFERENCES: true,
  
  /**
   * Enable image uploads
   */
  IMAGE_UPLOADS: true,
  
  /**
   * Enable dark mode
   */
  DARK_MODE: true,
  
  /**
   * Enable multilingual support
   */
  I18N: true,
} as const;

// =============================================================================
// User Roles
// =============================================================================

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// =============================================================================
// Pagination
// =============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// =============================================================================
// App Metadata
// =============================================================================

export const APP_METADATA = {
  NAME: 'Scriptony',
  VERSION: '1.0.0',
  DESCRIPTION: 'Professional Scriptwriting Platform',
} as const;

// =============================================================================
// Test User Credentials (Development Only)
// =============================================================================

export const TEST_USER = {
  EMAIL: 'iamthamanic@gmail.com',
  PASSWORD: '123456',
} as const;
