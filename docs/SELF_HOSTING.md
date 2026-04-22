# Scriptony: Eigenes Hosting (z. B. Hetzner)

**Maßgeblich:** [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) — Produktion = **Appwrite** (Auth) + **Appwrite Databases/Storage** (über deployte **`functions/*`**) + statisches **Vite-Frontend**. Root-`docker-compose.yml` kann lokal **Appwrite** starten; **`docker-compose.legacy.yml`** ist optional für Postgres/Lucia-Experimente — nicht zwingend das Produktions-Setup.

**Codebase für neue Personen:** [ENTWICKLER_HANDBUCH.md](ENTWICKLER_HANDBUCH.md) (KISS, DRY, SOLID im Kontext dieses Repos, Verzeichnis-Landkarte).

---

## Self-hosted Appwrite (Docker im Repo)

Vollständig unter eigener Kontrolle (laptop oder VPS):

1. **Appwrite-Plattform:** `infra/appwrite/` — siehe [../infra/appwrite/README.md](../infra/appwrite/README.md). Root: `docker compose --env-file infra/appwrite/.env up -d` oder `npm run docker:appwrite:up`.
2. **Appwrite-Konsole:** erreichbar über die Traefik-HTTP-Port-Zuordnung (Standard **8080**). Projekt anlegen, **erlaubte Redirect-URLs** und Web-Origin auf deine Frontend-URL setzen (gleiche Werte wie `VITE_AUTH_REDIRECT_URL` / `VITE_APP_WEB_URL`).
3. **Frontend:** `.env.local` mit `VITE_APPWRITE_ENDPOINT` (z. B. `https://appwrite.deine-domain.tld/v1` oder `http://127.0.0.1:8080/v1`) und `VITE_APPWRITE_PROJECT_ID`.
4. **Functions:** `functions/` deployen; Runtime-Env `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` müssen **dieselbe** Appwrite-Instanz referenzieren wie das Frontend.

Zwei getrennte Env-Dateien sind normal: **`infra/appwrite/.env`** (Appwrite-Container `_APP_*`) und **`.env.local`** (nur `VITE_*` für den Build).

---

## Prinzip

- **Frontend:** `npm run build` → Ordner `build/` (nginx/Caddy/Vercel o. Ä.).
- **Konfiguration:** Alles über **`VITE_*`** beim Build ([DEPLOYMENT.md](DEPLOYMENT.md)): Appwrite-Endpoint/Projekt-ID und die Basis-URL der Scriptony-HTTP-Funktionen.
- **Umzug:** Gleicher Code, andere URLs — kein fest verdrahteter Cloud-Anbieter im Quelltext.

---

## 1. Frontend auf eigenem Server

1. Auf der Build-Maschine/CI die `VITE_*` setzen (siehe `.env.example` / `.env.local.example`).
2. `npm run build` — Ausgabe nach `build/`.
3. `build/` auf den Server kopieren; Webserver mit SPA-Fallback (`try_files` / `historyApiFallback`).

---

## 2. Backend: Appwrite + Functions

- **Appwrite:** Self-hosted oder Cloud — Projekt anlegen, **Authentication-URLs** auf deine Frontend-Origin(s) setzen.
- **Datenmodell:** Collections/Attribute und Storage-Buckets müssen zu den Erwartungen in `functions/_shared/appwrite-db.ts` und `functions/_shared/env.ts` passen.
- **Functions:** Ordner `functions/` pro Service deployen (z. B. Appwrite Functions oder eigener Node-Host). Server-seitig **`APPWRITE_ENDPOINT`**, **`APPWRITE_PROJECT_ID`**, **`APPWRITE_API_KEY`** setzen.

Die SPA ruft nur die konfigurierte **Functions-Basis-URL** auf (`VITE_APPWRITE_FUNCTIONS_BASE_URL` oder `VITE_BACKEND_API_BASE_URL`).

---

## 3. Beispiel-Env (eigene Domain)

```env
VITE_APPWRITE_ENDPOINT=https://appwrite.example.com/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_BACKEND_API_BASE_URL=https://api.example.com/v1

VITE_APP_WEB_URL=https://app.example.com
VITE_AUTH_REDIRECT_URL=https://app.example.com
VITE_PASSWORD_RESET_REDIRECT_URL=https://app.example.com/reset-password
```

Build mit diesen Werten, dann `build/` ausliefern.

---

## 4. Kurzüberblick

| Komponente             | Typische Option                  |
| ---------------------- | -------------------------------- |
| Frontend               | Vercel, nginx, Caddy             |
| Auth + Plattform       | Appwrite Cloud oder self-hosted  |
| App-Logik + DB-Zugriff | Deployte `scriptony-*` Functions |

Details zu Sicherheit und Vercel: [DEPLOYMENT.md](DEPLOYMENT.md).
