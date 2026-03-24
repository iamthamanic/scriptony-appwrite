# Server-Rollout (Self-Host / VPS)

Kurzantwort: **Ja, du kannst live gehen** — wenn Appwrite, Functions und Frontend **jeweils** mit passenden URLs und Secrets laufen. Im Repo fehlt **kein** Anwendungscode dafür; es fehlt oft die **Zusammenführung** auf dem Server und der Abgleich mit **CI**.

**DevOps-Empfehlung (Umgebungen, Domains, was wo bauen):** [DEVOPS_EMPFEHLUNG.md](DEVOPS_EMPFEHLUNG.md).

---

## Wichtig: Was der GitHub Actions Deploy tut

Die Jobs `deploy-prod` (Branch **`main`**) und `deploy-test` (**`develop`**) in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) laufen **nur**, wenn die Repository-Variable **`VPS_DEPLOY_ENABLED`** = `true` ist (siehe [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)).

1. **SSH** auf den VPS → im Repo-Verzeichnis **`git pull`** (Standardpfade: `/root/scriptony-prod` bzw. `/root/scriptony-test`).
2. **`docker compose --env-file infra/appwrite/.env up -d`** — Appwrite-Stack wie im Repo beschrieben.
3. **Optional:** Wenn die Repository-Variable **`DEPLOY_STATIC_FRONTEND`** = `true` ist: auf dem Runner **`bun run build`** und **`rsync`** von `build/` auf den Server (Ziel: **`SCRIPTONY_WEB_ROOT_PROD`** / **`SCRIPTONY_WEB_ROOT_TEST`**).

Voraussetzung auf dem Server: Datei **`infra/appwrite/.env`** muss existieren (sonst bricht der Job mit Fehlermeldung ab).

Details und Secret-/Variablenliste: **[GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)**.

Der **Legacy-Stack** (`docker-compose.legacy.yml`) wird **nicht** mehr von diesen Jobs gestartet — nur noch manuell bei Bedarf.

---

## Checkliste: Mindestens erledigt vor „wir sind live“

### 1. Appwrite-Instanz

- [ ] Appwrite läuft (Docker wie `infra/appwrite/` oder eigene Installation) mit **öffentlicher URL** und TLS in Produktion.
- [ ] `infra/appwrite/.env` bzw. Server-`_APP_*`: Domain, Keys, DB-Passwörter gesetzt (nicht die Gitpod-Beispielwerte).
- [ ] In der **Appwrite Console**: Projekt angelegt, **Authentication → erlaubte URLs** = deine Frontend-Origin(s).

### 2. Datenmodell & Storage

- [ ] Collections / Attribute und Storage-Buckets existieren und passen zu `functions/_shared/appwrite-db.ts` und `functions/_shared/env.ts` (oder du hast die IDs per Env überschrieben).

### 3. Scriptony Functions

- [ ] Jede benötigte Function unter `functions/scriptony-*` (und ggf. Legacy `make-server-…`) ist **deployt** und von außen unter **einer** Basis-URL erreichbar (Appwrite Functions, Reverse-Proxy, o. Ä.).
- [ ] Runtime-Env: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` (und optional Bucket-/DB-IDs) gesetzt — siehe `functions/README.md` und `functions/_shared/env.ts`.

### 4. Frontend (Vite-Build)

- [ ] Auf der Build-Maschine (CI oder lokal) `.env` / `.env.production` mit allen **`VITE_*`** aus `docs/DEPLOYMENT.md` und `.env.local.example`.
- [ ] `npm run build` → Ordner **`build/`** auf den Webserver (nginx/Caddy) mit **SPA-Fallback**.
- [ ] `VITE_APPWRITE_ENDPOINT` und `VITE_APPWRITE_FUNCTIONS_BASE_URL` (oder `VITE_BACKEND_API_BASE_URL`) zeigen auf **Produktions-URLs**, nicht auf localhost.

### 5. Netzwerk & Sicherheit

- [ ] CORS an den Function-Endpoints erlaubt deine Frontend-Origin.
- [ ] Keine Appwrite-API-Keys in `VITE_*` oder im Repo.

### 6. Smoke-Tests

- [ ] `GET …/v1/health` auf Appwrite OK.
- [ ] Optional: `npm run verify:test-env` lokal mit **Produktions-ähnlicher** `.env.local` (oder eigene Checks gegen Health-Routen der Functions).

---

## Was „noch fehlen“ kann (typisch)

| Thema | Hinweis |
|--------|---------|
| **CI** | Deploy nutzt Appwrite-Compose; Pfade/Secrets siehe [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md). |
| **Ein Klick fehlt** | Kein fertiges „alles auf einen VPS“-Playbook im Repo — Schritte sind bewusst Host-abhängig. |
| **Appwrite-Projekt leer** | Erst Collections/Buckets anlegen oder Migrations-Skripte ausführen (Projekt-spezifisch). |
| **Functions-URL** | Muss exakt zu dem passen, was `VITE_APPWRITE_FUNCTIONS_BASE_URL` erwartet (Pfad-Prefix pro Hosting). |

---

## Wer macht was (Übersicht)

| Kann **im Git-Repo** erledigt werden (Cursor/PR) | Musst **du** erledigen (VPS, Zugänge, Entscheidungen) |
|---------------------------------------------------|------------------------------------------------------|
| CI-Workflow (Appwrite-Deploy + optional rsync) — siehe [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md) | SSH auf den VPS, alte Container stoppen, Daten sichern |
| Doku, Checklisten, Skript-Vorlagen ergänzen | DNS/TLS für Appwrite + Frontend-Domain |
| `infra/appwrite/.env.example` pflegen, Compose validieren | Echte `infra/appwrite/.env` auf dem Server mit starken Secrets |
| Einheitliche Env-Beispiele für Functions | Appwrite Console: Projekt, Auth-URLs, API-Key erzeugen |
| Optional: GitHub Actions Secrets vorbeschreiben (welche Keys nötig sind) | GitHub Secrets setzen, Deploy testen |
| Code-Fixes, wenn Build/Functions an der Umgebung scheitern | Functions deployen (Runtime deiner Wahl) + `APPWRITE_*` setzen |
| | Frontend-Build mit Produktions-`VITE_*` + `build/` ausrollen |
| | Nhost-Stack entfernen (siehe unten), Ports freimachen |
| | Nutzer/Daten: Migration von Nhost → Appwrite falls nötig (Konzept + Tooling meist bei dir) |

Ich (Assistent) habe **keinen** Zugriff auf deinen VPS, DNS, Appwrite-Console oder Secrets — nur auf dieses Repository.

---

## VPS: Alte Nhost-Installation aufräumen

Typisch lag Nhost als **Docker Compose** (Auth, Postgres, Storage, Hasura/Gateway, Traefik o. Ä.) in einem Verzeichnis auf dem Server — oft **nicht** identisch mit diesem Appwrite-Repo.

**Vor dem Löschen:**

1. **Backup**, was du behalten willst (Postgres-Dump, Storage-Files, `.env` mit Keys zum Nachschlagen).
2. Notieren, **welche Ports** Nhost belegt hat (80, 443, 5432, …) — Appwrite braucht u. a. **80/443** oder dein Reverse-Proxy.

**Aufräumen (grober Ablauf):**

1. In das Verzeichnis des **alten** Compose wechseln (`cd …/nhost` o. Ä.).
2. `docker compose down` (ggf. `-v` nur wenn du **Volumes bewusst** löschen willst — **datenvernichtend**).
3. Ungenutzte Images/Volumes: nur nach Prüfung `docker system prune` / gezielt `docker volume rm …`.
4. **Reverse-Proxy** (nginx/Caddy): vHosts anpassen — alte `*.nhost`- oder Hasura-Upstreams entfernen, neue Upstreams auf Appwrite/Frontend zeigen.
5. **Firewall / DNS**: Subdomains von Nhost auf neue Dienste umstellen oder entfernen.

**Parallelbetrieb** (kurz): Nhost und Appwrite nicht dieselben Host-Ports teilen; temporär andere Ports oder andere Hostnames nutzen.

---

## Alles, was insgesamt ansteht (Reihenfolge sinnvoll)

1. **Strategie:** Nur VPS vs. Frontend extern (Vercel) festlegen.  
2. **Nhost:** Backup → Compose stoppen → Proxy/DNS bereinigen.  
3. **Appwrite:** Auf VPS installieren (z. B. `infra/appwrite` + eigene `.env`) oder extern hosten; TLS + Domain.  
4. **Appwrite Console:** Projekt, erlaubte URLs, API-Key mit nötigen Rechten.  
5. **Schema:** Collections/Buckets wie in `functions/_shared/` (oder Env-Overrides).  
6. **Functions:** Alle `scriptony-*` deployen, `APPWRITE_*` setzen, öffentliche URL testen.  
7. **Frontend:** `npm run build` mit Produktions-`VITE_*`, `build/` ausliefern.  
8. **CI:** `.github/workflows/ci.yml` an echtes Ziel anbinden (optional letzter Schritt).  
9. **Smoke-Tests:** Appwrite `/v1/health`, Login, eine API-Route über Functions.

---

## Nhost → Appwrite: Befehle auf dem VPS

Schritt-für-Schritt inkl. Copy-Paste: **[SERVER_MIGRATION_RUNBOOK.md](SERVER_MIGRATION_RUNBOOK.md)**  
**Kanonischer Prod-Pfad:** `/root/scriptony-prod` (entspricht CI). Nicht `/root/Scriptonyapp` als Deploy-Wurzel nutzen.

---

## Server-Zustand für Support dokumentieren

Auf dem VPS per SSH ausführen und die **komplette Ausgabe** (oder eine Redaktion ohne Passwörter) teilen:

- Einmalig: Repo-Skript nach dem Server kopieren und laufen lassen:  
  `bash scripts/server-snapshot.sh`  
  (Datei: [`scripts/server-snapshot.sh`](../scripts/server-snapshot.sh))
- Oder manuell die Befehle aus dem Skript einzeln ausführen (`docker ps -a`, `ss -tlnp`, …).

---

## Weiterlesen

- [SELF_HOSTING.md](SELF_HOSTING.md) — Domains und Beispiel-`VITE_*`
- [DEPLOYMENT.md](DEPLOYMENT.md) — Variablenübersicht
- [ENTWICKLER_HANDBUCH.md](ENTWICKLER_HANDBUCH.md) — Architektur
- [../infra/appwrite/README.md](../infra/appwrite/README.md) — Docker-Appwrite lokal / gleiches Muster auf VPS
