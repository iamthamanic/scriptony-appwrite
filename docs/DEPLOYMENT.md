# Scriptony: Lokal starten & deployen

## Deploy-Descriptor (`easyploy.json`)

Im Projektroot liegt **`easyploy.json`** – eine **tool-agnostische** Beschreibung, wie die App gebaut und ausgeliefert wird (Build-Befehl, Output-Ordner, benötigte Env-Variablen). Das Format ist generisch; **easyploy** und andere Deploy-Tools können diese Datei lesen, um die App automatisch zu bauen und zu deployen. Scriptony hängt nicht von einem bestimmten Tool ab; mit easyploy nutzt du den Descriptor optimal.

---

## Nhost

Die App nutzt **Nhost** (Auth, GraphQL/Hasura, Storage, Functions). Subdomain und Region findest du im Nhost-Dashboard auf der **Projekt-Übersicht (Overview)** – nicht unter Settings → General.

## Lokal

1. **Env setzen (nur Subdomain + Region):**
   ```bash
   npm run env:local -- DEINE_SUBDOMAIN eu-central-1
   ```
   Erzeugt `.env.local`. Danach:

2. **Dev-Server:**
   ```bash
   npm run dev
   ```

In Nhost unter **Authentication → URL Configuration** die Redirect-URL für Lokal eintragen (z. B. `http://localhost:3000`).

---

## Deploy (z. B. Vercel)

- Build: `npm run build`, Output: `build/` (siehe `vercel.json`)
- In Vercel **Environment Variables** alle `VITE_*` mit **Produktions-URLs** setzen (siehe unten)
- Nach dem Deploy die **Web-URL** in Nhost (Authentication → Redirect/Site-URL) eintragen

### Checkliste Vercel (nichts vergessen)

| Schritt | Erledigt |
|--------|----------|
| Repo mit Vercel verbunden, Root = Scriptonyapp-Ordner | |
| Build Command / Output über `vercel.json` (bereits vorkonfiguriert) | |
| Env-Variablen für Production gesetzt (Subdomain, Region, App-URL, Redirect-URLs) | |
| Nach erstem Deploy: gleiche Web-URL in Nhost unter Authentication → Redirect/Site-URL eingetragen | |
| Optional: Custom Domain in Vercel hinzugefügt und DNS angepasst | |

### Schutz vor AI-Crawlern (Kosten Nhost/Vercel)

Damit KI-Crawler (z. B. GPTBot, ClaudeBot) nicht unbegrenzt Traffic und API-Calls auslösen:

- **`public/robots.txt`** — disallow für gängige AI-Bot-User-Agents (wird mit ins Build übernommen).
- **`middleware.ts`** (Vercel Edge) — liefert 403 für Anfragen mit diesen User-Agents; Bots bekommen keine Seite und rufen damit auch kein Nhost auf.
- **Meta-Tag** in `index.html`: `noai, noimageai` als zusätzliches Opt-out-Signal.

Normale Browser und Suchmaschinen-Crawler (z. B. Googlebot) werden nicht blockiert.

---

## Eigene Domain (z. B. raccoova.scriptony.com) – Free Tier

**Ja, das geht im Vercel Free Tier.** Eigene Domains und SSL sind inklusive.

### 1. Projekt bei Vercel deployen

- Repo mit Vercel verbinden (GitHub/GitLab), Root = Ordner mit `package.json` (Scriptonyapp)
- Build läuft über `vercel.json` (Build Command, Output `build/`, SPA-Rewrites)

### 2. Custom Domain hinzufügen

- Vercel: **Project → Settings → Domains** → **Add** → `raccoova.scriptony.com` eintragen
- Vercel zeigt dir an, was du beim DNS-Anbieter eintragen sollst:
  - **CNAME:** `raccoova` → `cname.vercel-dns.com` (wenn scriptony.com bei einem DNS-Provider liegt)
  - Oder **A-Record**, falls Vercel das vorschlägt
- DNS bei dem Anbieter ändern, wo `scriptony.com` verwaltet wird (z. B. Cloudflare, Namecheap, etc.)
- Nach dem Propagieren prüft Vercel die Domain und stellt automatisch SSL (HTTPS) bereit

### 3. Env-Variablen für Produktion

In Vercel **Settings → Environment Variables** (für Production) setzen:

| Variable | Wert (Beispiel) |
|----------|------------------|
| `VITE_NHOST_SUBDOMAIN` | deine Nhost-Subdomain |
| `VITE_NHOST_REGION` | `eu-central-1` |
| `VITE_APP_WEB_URL` | `https://raccoova.scriptony.com` |
| `VITE_AUTH_REDIRECT_URL` | `https://raccoova.scriptony.com` |
| `VITE_PASSWORD_RESET_REDIRECT_URL` | `https://raccoova.scriptony.com/reset-password` |

(Die einzelnen `VITE_NHOST_*_URL` werden aus Subdomain + Region gebaut, müssen also nicht gesetzt werden.)

### 4. Nhost anpassen

- Nhost Dashboard → **Authentication** → **URL Configuration**
- **Redirect URLs:** `https://raccoova.scriptony.com`, ggf. `https://raccoova.scriptony.com/**`
- **Site URL:** `https://raccoova.scriptony.com`

Danach ist die App unter **https://raccoova.scriptony.com** erreichbar (Free Tier, inkl. HTTPS).

---

## Später auf eigenen Server (z. B. Hetzner)

Wenn du Scriptony kommerziell nutzen willst und Kosten vorhersehbar halten möchtest, kannst du Frontend und Backend auf einen eigenen Server (z. B. Hetzner) umziehen – **ohne die App umzubauen**. Alle Backend-URLs kommen aus der Umgebung; du stellst nur die Env auf deine eigenen URLs um.

Siehe **[SELF_HOSTING.md](SELF_HOSTING.md)** für:
- Frontend auf Hetzner (Build, nginx/Caddy, SSL)
- Backend: Nhost self-hosted (Docker, gleiche API wie Cloud) oder eigenes Stack (Hasura, Auth, Storage)
- Env-Vorlage für Self-Hosted
