/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_WEB_URL?: string;
  readonly VITE_BACKEND_PROVIDER?: "supabase" | "nhost";
  readonly VITE_BACKEND_API_BASE_URL?: string;
  readonly VITE_BACKEND_PUBLIC_TOKEN?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_NHOST_SUBDOMAIN?: string;
  readonly VITE_NHOST_REGION?: string;
  readonly VITE_NHOST_AUTH_URL?: string;
  readonly VITE_NHOST_STORAGE_URL?: string;
  readonly VITE_NHOST_GRAPHQL_URL?: string;
  readonly VITE_NHOST_FUNCTIONS_URL?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  readonly VITE_PASSWORD_RESET_REDIRECT_URL?: string;
  readonly VITE_CAPACITOR_APP_ID?: string;
  readonly VITE_CAPACITOR_URL_SCHEME?: string;
  readonly VITE_CAPACITOR_CALLBACK_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
