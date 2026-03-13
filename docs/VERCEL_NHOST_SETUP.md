# Scriptony auf Vercel mit Nhost verbinden

Wenn du **scriptony.raccoova.com** (oder eine andere Vercel-URL) erreichst, dich einloggen kannst, aber **keine Projekte laden/erstellen** oder andere API-Aktionen funktionieren, fehlen in der Regel die **Nhost-Umgebungsvariablen** in Vercel oder die **Redirect-URL** in Nhost.

---

## 1. Umgebungsvariablen in Vercel setzen

Die App baut zur **Build-Zeit** die Backend-URLs aus `VITE_*`-Variablen. Ohne diese Variablen ist `functionsBaseUrl` leer und alle API-Aufrufe (Projekte, Shots, etc.) schlagen fehl.

### Vercel Dashboard

1. [Vercel Dashboard](https://vercel.com) → dein Projekt (Scriptony)
2. **Settings** → **Environment Variables**
3. Für **Production** (und ggf. Preview) folgende Variablen anlegen:

### Pflicht (Nhost Backend)

| Name | Wert (Beispiel) | Hinweis |
|------|------------------|--------|
| `VITE_NHOST_SUBDOMAIN` | `mthatsgmfklegprnulnn` | Deine Nhost-Subdomain aus `.nhost/nhost.toml` oder Nhost Dashboard |
| `VITE_NHOST_REGION` | `eu-central-1` | Region deines Nhost-Projekts |
| `VITE_NHOST_AUTH_URL` | `https://mthatsgmfklegprnulnn.auth.eu-central-1.nhost.run/v1` | Ersetze Subdomain/Region bei Bedarf |
| `VITE_NHOST_FUNCTIONS_URL` | `https://mthatsgmfklegprnulnn.functions.eu-central-1.nhost.run/v1` | **Wichtig:** Ohne diese URL funktioniert keine Projekte/Shots-API |
| `VITE_NHOST_GRAPHQL_URL` | `https://mthatsgmfklegprnulnn.graphql.eu-central-1.nhost.run/v1` | |
| `VITE_NHOST_STORAGE_URL` | `https://mthatsgmfklegprnulnn.storage.eu-central-1.nhost.run/v1` | |

### Production-URL (für Login-Redirect)

| Name | Wert (Beispiel) |
|------|------------------|
| `VITE_APP_WEB_URL` | `https://scriptony.raccoova.com` |
| `VITE_AUTH_REDIRECT_URL` | `https://scriptony.raccoova.com` |
| `VITE_PASSWORD_RESET_REDIRECT_URL` | `https://scriptony.raccoova.com/reset-password` |

Optional kannst du statt der einzelnen URLs nur Subdomain + Region setzen; die App baut die URLs dann selbst (siehe `src/lib/env.ts`). Für Production solltest du aber **mindestens** setzen:

- `VITE_NHOST_SUBDOMAIN`
- `VITE_NHOST_REGION`
- `VITE_NHOST_FUNCTIONS_URL` (oder `VITE_BACKEND_API_BASE_URL` mit derselben URL)
- `VITE_APP_WEB_URL` und `VITE_AUTH_REDIRECT_URL` auf deine Production-Domain

### Nach dem Setzen

- **Redeploy** auslösen (Vercel → Deployments → … → Redeploy), damit der neue Build die Variablen einbettet.

---

## 2. Redirect-URL in Nhost erlauben

Damit der Login nach der Anmeldung wieder auf deine Vercel-Domain zurückführt:

1. [Nhost Dashboard](https://app.nhost.io) → dein Projekt
2. **Authentication** → **URL Configuration** (oder **Redirect URLs**)
3. **Redirect URL** hinzufügen: `https://scriptony.raccoova.com`
4. Ggf. auch `https://scriptony.raccoova.com/**` falls nötig (je nach Nhost-Version)

Ohne diesen Eintrag kann Nhost nach dem Login nicht auf deine App weiterleiten oder die Session wird nicht korrekt gesetzt.

---

## 3. Nhost Functions deployen

Die Backend-Logik (Projekte, Shots, Auth, etc.) läuft in **Nhost Functions**. Wenn die App „Test-User wird erstellt“ anzeigt und hängen bleibt oder Projekte nicht laden, antworten die Functions oft mit **500** – dann sind sie entweder nicht deployt oder schlagen intern fehl.

### 3.1 GitHub mit Nhost verbinden

1. [Nhost Dashboard](https://app.nhost.io) → dein Projekt
2. **Settings** (oder **Git**) → **Connect repository** / **GitHub**
3. Repository auswählen (z. B. `iamthamanic/Scriptonyapp`)
4. **Projekt-Root:** Wenn das Repo nur die Scriptony-App enthält, Root = `/`. Wenn die App in einem Unterordner liegt (z. B. `Scriptonyapp/`), als **Root Directory** `Scriptonyapp` angeben, damit Nhost den Ordner `Scriptonyapp/functions` findet.
5. Speichern. Nhost deployt die Functions automatisch bei jedem Push (oder manuell über **Deploy**).

Nhost erwartet den Ordner **`functions`** im Projekt-Root (bzw. im konfigurierten Root). Darin liegen bei Scriptony z. B. `scriptony-auth/`, `scriptony-projects/`, `scriptony-shots/` – jede Unterordner-`index` wird als Endpoint `/v1/<ordnername>` exponiert.

### 3.2 Umgebungsvariablen / Secrets für die Functions

Nhost **injiziert** diese Variablen in die Functions automatisch (du musst sie nicht anlegen):

- `NHOST_AUTH_URL`
- `NHOST_GRAPHQL_URL` / `NHOST_HASURA_URL`
- `NHOST_STORAGE_URL`
- `NHOST_ADMIN_SECRET`
- `NHOST_SUBDOMAIN`, `NHOST_REGION`, `NHOST_FUNCTIONS_URL`

**Optional** im Nhost Dashboard unter **Settings** → **Environment Variables** (für die Backend-Services / Functions):

- `SCRIPTONY_STORAGE_BUCKET_*` – nur nötig, wenn du andere Bucket-Namen als die Defaults nutzt
- `SCRIPTONY_DEMO_EMAIL`, `SCRIPTONY_DEMO_PASSWORD`, `SCRIPTONY_DEMO_NAME` – für den Demo-User (Defaults reichen meist)

### 3.3 Wenn die Functions 500 zurückgeben

- **Nhost Dashboard** → **Functions** (oder **Logs**): Prüfen, ob die letzten Deployments erfolgreich waren und ob Fehler in den Logs stehen (z. B. fehlende Env, Hasura nicht erreichbar).
- **GitHub-Verbindung:** Sicherstellen, dass das richtige Repo und der richtige **Root Directory** eingetragen sind, damit der Ordner `functions` gefunden wird.
- Nach Änderungen an der GitHub-Verknüpfung oder am Root: einmal **Redeploy** der Functions auslösen.

---

## 4. Prüfen, ob es funktioniert

- Nach Redeploy: **scriptony.raccoova.com** öffnen, einloggen, **Projekt erstellen** oder **Projekte** laden.
- In der Browser-Konsole (F12) solltest du keine Fehler wie „Backend functions base URL is not configured“ oder 404 auf `*.nhost.run` sehen.
- Wenn die App eine Meldung „Backend nicht konfiguriert“ anzeigt, sind die Vercel-Env-Variablen für den letzten Build noch nicht gesetzt oder der Build wurde vor dem Setzen der Variablen erstellt → Redeploy.

---

## Kurz-Checkliste

- [ ] In Vercel: `VITE_NHOST_SUBDOMAIN`, `VITE_NHOST_REGION`, `VITE_NHOST_FUNCTIONS_URL` (oder `VITE_BACKEND_API_BASE_URL`) gesetzt
- [ ] In Vercel: `VITE_APP_WEB_URL` und `VITE_AUTH_REDIRECT_URL` = `https://scriptony.raccoova.com`
- [ ] In Nhost: Redirect-URL `https://scriptony.raccoova.com` eingetragen
- [ ] In Nhost: GitHub-Repo verbunden, **Root Directory** so gesetzt, dass der Ordner `functions` gefunden wird (z. B. `Scriptonyapp` wenn die App im Unterordner liegt)
- [ ] Nhost Functions mindestens einmal deployt (automatisch bei Push oder manuell)
- [ ] Nach Änderungen an Env-Variablen: Redeploy auf Vercel ausgeführt
