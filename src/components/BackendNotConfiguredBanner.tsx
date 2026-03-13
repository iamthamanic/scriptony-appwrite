/**
 * BackendNotConfiguredBanner
 *
 * Shown when the app is deployed (e.g. on Vercel) but backend env vars are missing.
 * Explains that VITE_NHOST_* / VITE_BACKEND_API_BASE_URL must be set in Vercel and Nhost
 * redirect URL must include the production domain.
 */

import { AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const DOC_URL =
  "https://github.com/iamthamanic/Scriptonyapp/blob/main/docs/VERCEL_NHOST_SETUP.md";

export function BackendNotConfiguredBanner() {
  return (
    <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-amber-500/80 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="font-semibold">
        Backend nicht konfiguriert – Projekte &amp; Daten laden nicht
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-2">
        <p className="text-sm">
          Login funktioniert möglicherweise, aber die App kann nicht mit dem Nhost-Backend
          sprechen. In <strong>Vercel</strong> müssen die Nhost-Umgebungsvariablen gesetzt
          und danach ein <strong>Redeploy</strong> ausgeführt werden. In <strong>Nhost</strong>{' '}
          muss die Redirect-URL deiner Production-Domain eingetragen sein.
        </p>
        <a
          href={DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Anleitung: Vercel + Nhost Setup
        </a>
      </AlertDescription>
    </Alert>
  );
}
