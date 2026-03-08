/**
 * Backend and platform configuration.
 *
 * Nhost + Capacitor setup. All runtime config flows through this file.
 */

export interface NhostConfig {
  subdomain: string;
  region: string;
  authUrl: string;
  storageUrl: string;
  graphqlUrl: string;
  functionsUrl: string;
}

export interface CapacitorConfig {
  appId: string;
  urlScheme: string;
  callbackHost: string;
}

export interface BackendConfig {
  provider: 'nhost';
  functionsBaseUrl: string;
  publicAuthToken: string;
  nhost: NhostConfig;
  capacitor: CapacitorConfig;
}

export interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
}

const env = import.meta.env;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

function validateString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (!path) return base;
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}

let _backendConfig: BackendConfig | null = null;

export function getBackendConfig(): BackendConfig {
  if (_backendConfig) {
    return _backendConfig;
  }

  const subdomain = validateString(env.VITE_NHOST_SUBDOMAIN);
  const region = validateString(env.VITE_NHOST_REGION) || 'eu-central-1';
  const base = subdomain && region ? `https://${subdomain}` : '';

  const nhost: NhostConfig = {
    subdomain,
    region,
    authUrl: trimTrailingSlash(
      validateString(env.VITE_NHOST_AUTH_URL) || (base ? `${base}.auth.${region}.nhost.run/v1` : '')
    ),
    storageUrl: trimTrailingSlash(
      validateString(env.VITE_NHOST_STORAGE_URL) || (base ? `${base}.storage.${region}.nhost.run/v1` : '')
    ),
    graphqlUrl: trimTrailingSlash(
      validateString(env.VITE_NHOST_GRAPHQL_URL) || (base ? `${base}.graphql.${region}.nhost.run/v1` : '')
    ),
    functionsUrl: trimTrailingSlash(
      validateString(env.VITE_NHOST_FUNCTIONS_URL) || (base ? `${base}.functions.${region}.nhost.run/v1` : '')
    ),
  };

  const functionsBaseUrl = trimTrailingSlash(
    validateString(env.VITE_BACKEND_API_BASE_URL) || nhost.functionsUrl
  );

  _backendConfig = {
    provider: 'nhost',
    functionsBaseUrl,
    publicAuthToken: validateString(env.VITE_BACKEND_PUBLIC_TOKEN) || '',
    nhost,
    capacitor: {
      appId: validateString(env.VITE_CAPACITOR_APP_ID) || 'ai.scriptony.app',
      urlScheme: validateString(env.VITE_CAPACITOR_URL_SCHEME) || 'scriptony',
      callbackHost: validateString(env.VITE_CAPACITOR_CALLBACK_HOST) || 'auth-callback',
    },
  };

  return _backendConfig;
}

export function getMissingNhostConfig(config = getBackendConfig().nhost): string[] {
  const missing: string[] = [];

  if (!config.authUrl && !config.subdomain) {
    missing.push('VITE_NHOST_AUTH_URL or VITE_NHOST_SUBDOMAIN');
  }

  if (!config.functionsUrl && !validateString(env.VITE_BACKEND_API_BASE_URL)) {
    missing.push('VITE_NHOST_FUNCTIONS_URL or VITE_BACKEND_API_BASE_URL');
  }

  if (!config.graphqlUrl && !config.subdomain) {
    missing.push('VITE_NHOST_GRAPHQL_URL or VITE_NHOST_SUBDOMAIN');
  }

  if (!config.storageUrl && !config.subdomain) {
    missing.push('VITE_NHOST_STORAGE_URL or VITE_NHOST_SUBDOMAIN');
  }

  return missing;
}

let _appConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (_appConfig) {
    return _appConfig;
  }

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';

  const isDevelopment =
    hostname === 'localhost' ||
    hostname.startsWith('127.0.0.1') ||
    validateString(env.MODE) === 'development';

  _appConfig = {
    isDevelopment,
    isProduction: !isDevelopment,
  };

  return _appConfig;
}

export function getAuthRedirectUrl(): string {
  const custom = validateString(env.VITE_AUTH_REDIRECT_URL);
  if (custom) return custom;

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return validateString(env.VITE_APP_WEB_URL) || 'http://localhost:5173';
}

export function getPasswordResetRedirectUrl(): string {
  const custom = validateString(env.VITE_PASSWORD_RESET_REDIRECT_URL);
  if (custom) return custom;

  return joinUrl(getAuthRedirectUrl(), 'reset-password');
}

export function getCapacitorCallbackUrl(path = ''): string {
  const { urlScheme, callbackHost } = getBackendConfig().capacitor;
  if (!path) {
    return `${urlScheme}://${callbackHost}`;
  }

  return `${urlScheme}://${callbackHost}/${trimLeadingSlash(path)}`;
}

export const backendConfig = getBackendConfig();
export const appConfig = getAppConfig();

if (appConfig.isDevelopment) {
  const missingNhostConfig = getMissingNhostConfig(backendConfig.nhost);

  console.log('Environment ready:', {
    functionsBaseUrl: backendConfig.functionsBaseUrl,
    nhostSubdomain: backendConfig.nhost.subdomain || '(unset)',
    nhostAuthUrl: backendConfig.nhost.authUrl || '(unset)',
    missingNhostConfig,
  });
}
