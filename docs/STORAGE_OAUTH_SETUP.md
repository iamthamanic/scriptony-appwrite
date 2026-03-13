# Storage-Anbieter OAuth einrichten

Damit Nutzer in Einstellungen → Speicher ihren **Google Drive** oder **Dropbox** per OAuth verbinden können, müssen die Backend-Env und die Provider-Apps konfiguriert werden.

## Backend (Nhost / Vercel Functions)

### 1. Redirect-URI-Allowlist (Sicherheit)

`redirect_uri` wird nur akzeptiert, wenn die **Origin** (Schema + Host + Port) erlaubt ist. So wird Open Redirect und Token-Diebstahl verhindert.

- **Standard:** Es wird die **bereits vorhandene** `VITE_APP_WEB_URL` verwendet – deren Origin ist automatisch erlaubt. Keine zusätzliche Variable nötig.
- **Mehrere Origins (z. B. Prod + Localhost):** Optional `scriptony_oauth_allowed_redirect_origins` setzen, kommasepariert (z. B. `https://app.scriptony.com,https://localhost:3000`). Wenn gesetzt, wird nur diese Liste verwendet (nicht mehr `VITE_APP_WEB_URL`).

Ohne `VITE_APP_WEB_URL` und ohne `scriptony_oauth_allowed_redirect_origins` schlagen Authorize/Callback mit „redirect_uri not allowed“ bzw. „Invalid state“ fehl.

**Hinweis (Nhost):** Nhost erlaubt keine Namen mit `STORAGE_` und nur Kleinbuchstaben, Ziffern und Unterstriche. Daher: `scriptony_oauth_*` (alles klein).

### 2. Callback-URL setzen

Die Callback-URL ist die Route, an die der Anbieter (Google/Dropbox) nach der Anmeldung zurückleitet. Das ist euer Backend, nicht die Frontend-URL.

- **Env-Variable:** `scriptony_oauth_callback_url`
- **Wert (Beispiel Nhost):**  
  `https://<DEINE_SUBDOMAIN>.functions.<REGION>.nhost.run/v1/scriptony-auth/storage-providers/oauth/callback`
- Diese exakte URL muss in **Google Cloud Console** und **Dropbox App Console** als „Authorized redirect URI“ eingetragen werden.

### 3. Google Drive

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt (oder neues Projekt) → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** → Add URI: den Wert von `scriptony_oauth_callback_url` eintragen.
4. Client ID und Client Secret kopieren.

**Env im Backend:**

- `scriptony_oauth_google_drive_client_id` = Client ID
- `scriptony_oauth_google_drive_client_secret` = Client Secret

**Hinweis:** Google Drive API muss für das Projekt aktiviert sein (APIs & Services → Library → „Google Drive API“ → Enable).

### 4. Dropbox

1. [Dropbox App Console](https://www.dropbox.com/developers/apps) → **Create app** → **Scoped access** → **Full Dropbox** (oder App folder).
2. Unter **Settings** → **OAuth 2** → **Redirect URI**: den Wert von `scriptony_oauth_callback_url` eintragen.
3. **App key** und **App secret** notieren.

**Env im Backend:**

- `scriptony_oauth_dropbox_app_key` = App key
- `scriptony_oauth_dropbox_app_secret` = App secret

## Ablauf für den Nutzer

1. Einstellungen → Tab **Speicher** → Anbieter (z. B. Google Drive) aufklappen.
2. **Mit Google Drive verbinden** klicken → Weiterleitung zu Google → Anmelden und Zugriff erlauben.
3. Zurück in der App (Einstellungen) mit Toast „Google Drive verbunden“. Tokens liegen nur im Browser (sessionStorage), nicht auf dem Server.

## OneDrive / KDrive

Im Backend sind nur Google Drive und Dropbox implementiert. OneDrive und KDrive können in `storage-providers/oauth/authorize.ts` und `callback.ts` ergänzt werden (gleiches Muster: Env für Client ID/Secret, Token-Exchange-Logik laut Provider-Doku).
