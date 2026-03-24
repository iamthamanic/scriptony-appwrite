/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_WEB_URL?: string;
  readonly VITE_BACKEND_API_BASE_URL?: string;
  /** Optional override when functions live on a different origin than the Appwrite endpoint. */
  readonly VITE_APPWRITE_FUNCTIONS_BASE_URL?: string;
  /** One-line JSON: { "scriptony-projects": "https://…", … } — Appwrite function HTTP domains from the console. */
  readonly VITE_BACKEND_FUNCTION_DOMAIN_MAP?: string;
  readonly VITE_BACKEND_PUBLIC_TOKEN?: string;
  readonly VITE_APPWRITE_ENDPOINT?: string;
  readonly VITE_APPWRITE_PROJECT_ID?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  readonly VITE_PASSWORD_RESET_REDIRECT_URL?: string;
  readonly VITE_CAPACITOR_APP_ID?: string;
  readonly VITE_CAPACITOR_URL_SCHEME?: string;
  readonly VITE_CAPACITOR_CALLBACK_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
