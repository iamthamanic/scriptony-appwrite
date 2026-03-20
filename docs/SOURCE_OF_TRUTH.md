# Scriptony — Source of Truth (Architektur & Deploy)

**Schritt-für-Schritt (Server, CI, Webapp):** [EXACT_STEPS.md](EXACT_STEPS.md)  
**Alles in Docker inkl. Nhost:** [NHOST_ALL_IN_DOCKER.md](NHOST_ALL_IN_DOCKER.md)

**Dieses Dokument ist die einzige maßgebliche Beschreibung**, welches Backend gilt, welche Artefakte wofür da sind und wie lokaler Stack vs. Produktion zusammenspielen. Änderungen an Deploy oder Erwartungen bitte hier zuerst festhalten, dann Code/Docs anpassen.

---

## 1. Zielarchitektur (Produktion)

| Schicht | Quelle der Wahrheit | Bemerkung |
|--------|---------------------|-----------|
| **Backend (Auth, Hasura, Storage, Functions)** | **Nhost** — **Self-Hosted** auf eurem Server (offizielles Setup) | Hasura läuft **innerhalb** von Nhost, nicht als separater „zweiter“ Produktions-Hasura neben Nhost. |
| **Frontend** | Statischer **Vite-Build** (`npm run build` → `build/`) | Auslieferung z. B. nginx/Caddy, Vercel, oder CI + statischer Host. |
| **Konfiguration Frontend** | **`VITE_*` beim Build** | Zeigen auf **eure** Nhost-URLs (eigene Domain / Subdomains), siehe Abschnitt 4. |

Die App im Repo spricht mit dem Backend über:

- **`@nhost/nhost-js`** + **`NhostAuthAdapter`** (`src/lib/auth/`)
- **`api-gateway`** → Nhost Functions (`functions/*`) unter `VITE_BACKEND_API_BASE_URL` bzw. Nhost-Functions-URL

**Nicht** Produktions-Backend: das **optionale** Docker-Setup im Root-`docker-compose.yml` (Profil `local-dev`) — das ist nur **lokales Spielzeug** (Postgres + einzelner Hasura + Lucia `backend/auth`), **kein** Ersatz für Nhost.

---

## 2. Repository-Karte (was wofür)

| Pfad / Datei | Rolle |
|--------------|--------|
| **`nhost/nhost.toml`** | Nhost-Projektkonfiguration (Hasura-Version, Auth, Functions-Runtime, Secrets-Platzhalter). |
| **`functions/`** | Serverless Functions für Nhost (Deploy mit Nhost CLI / Dashboard). |
| **`docker-compose.yml`** | **Nur** `profile: local-dev` — optionaler **Local-Dev-Stack**, nicht Production. |
| **`backend/auth/`** | Lucia-Auth-Service für **diesen Local-Stack**; **nicht** der Auth-Pfad der Haupt-App (die nutzt Nhost). |
| **`easyploy.json`** | Build-Deskriptor (Command, `build/`, SPA, Liste relevanter `VITE_*`) für statisches Hosting. |
| **`.github/workflows/ci.yml`** | CI + optionaler SSH-Deploy des **Local-Dev-Stacks** (`--profile local-dev`) — siehe Abschnitt 5. |
| **`docs/DEPLOYMENT.md`**, **`docs/SELF_HOSTING.md`** | Detail-Checklisten; bei Widerspruch gilt **dieses Dokument**. |

---

## 3. Nhost Self-Hosted aufsetzen (Produktion)

1. Offizielle Anleitung: [Nhost Self-Hosting](https://docs.nhost.io/platform/self-hosting/overview).
2. Auf demselben oder einem dedizierten Server: Postgres, Hasura, Auth, Storage, Functions wie von Nhost vorgegeben betreiben.
3. **`nhost/`** + **`functions/`** aus diesem Repo mit **Nhost CLI** (`npm run deploy:nhost` / `nhost deployments …`) gegen **eure** Self-Hosted-Instanz ausrollen.
4. **DNS / TLS**: Subdomains für Auth, GraphQL, Storage, Functions — wie in Nhost-Doku; dieselben URLs tragen wir in **`VITE_*`** (siehe unten).
5. **Redirect-URLs** in Nhost Auth auf die **öffentliche Frontend-URL** setzen.

Sobald Nhost Self-Hosted live ist: **keinen** zweiten Hasura in Produktion parallel betreiben (kein `docker compose --profile local-dev` auf dem Prod-Server für die echte App).

---

## 4. Frontend-Build (`VITE_*`)

Mindestens für Production-Build:

- **`VITE_NHOST_SUBDOMAIN`** + **`VITE_NHOST_REGION`** *oder* explizit alle **`VITE_NHOST_AUTH_URL`**, **`VITE_NHOST_GRAPHQL_URL`**, **`VITE_NHOST_STORAGE_URL`**, **`VITE_NHOST_FUNCTIONS_URL`** (Self-Hosted-URLs).
- **`VITE_APP_WEB_URL`**, **`VITE_AUTH_REDIRECT_URL`**, **`VITE_PASSWORD_RESET_REDIRECT_URL`** auf die echte Web-App-URL.
- Optional **`VITE_BACKEND_API_BASE_URL`**, wenn Functions unter einem gemeinsamen Gateway laufen.

Siehe **`.env.example`** (Nhost-fokussiert). Capacitor-Variablen nur bei Mobile-Builds.

---

## 5. CI/CD (GitHub Actions)

- **Job `ci`**: Lint/Typecheck/Tests (tolerant), **Build** mit Bun.
- **Jobs `deploy-prod` / `deploy-test`**: SSH auf Server → `git pull` → `.env` aus Secrets → **`docker compose --profile local-dev up -d --build`**.

**Wichtig:** Das deployt absichtlich nur den **Local-Dev-Docker-Stack** (Experimente, Lucia, isolierter Hasura). **Production-Scriptony** mit vollem Feature-Set erwartet **Nhost Self-Hosted** (Abschnitt 3). Wenn der Prod-Server **nur** Nhost laufen soll:

- Entweder die Compose-Deploy-Jobs in **`ci.yml`** deaktivieren/entfernen **oder**
- auf einen **eigenen** Job umstellen (z. B. nur Frontend-Artefakt + Dokumentation für `nhost deploy`).

Empfehlung: Prod-VPS = **Nhost Stack** + statisches Frontend; **optional** separater Dev-VPS für `--profile local-dev`.

---

## 6. Lokaler Dev-Stack (Docker)

Nur wenn du **bewusst** Postgres + Hasura + Lucia lokal in Docker willst:

```bash
docker compose --profile local-dev up -d --build
```

Ohne Profil startet **nichts** (kein versehentlicher „Pseudo-Prod“-Stack).

Env für Container: **`.env.docker.example`** / eigene `.env` im Projektroot für Substitutionsvariablen (`POSTGRES_*`, `HASURA_ADMIN_SECRET`, …).

---

## 6a. Testumgebung: Vite auf dem Mac + Nhost auf dem VPS

Das ist **kein zweites Backend**, sondern **dieselbe** Nhost-Instanz auf dem Server, angesprochen vom lokalen Browser/Vite:

- **Mac:** nur `npm run dev` (Port 3000) + **`.env.local`** mit **`VITE_NHOST_*`** auf die Server-URLs.
- **VPS:** Postgres, Auth, Hasura, Storage, Functions (Nhost Docker Compose).
- Der Mac öffnet **keine** TCP-Verbindung zu Postgres; nur **HTTP(S)** zu Auth und GraphQL.

Verifikation im Repo-Root: **`npm run verify:test-env`**.  
Ausführlich: **[TEST_ENV_REMOTE_NHOST.md](TEST_ENV_REMOTE_NHOST.md)**.

---

## 7. Migration vom bisherigen Server (`scriptony-prod`)

Falls dort nur `docker compose --profile local-dev` lief:

1. **Nhost Self-Hosted** installieren (oder temporär Nhost Cloud zum Testen).
2. Schema/Metadata/Functions wie in Repo deployen.
3. **Frontend** mit korrekten **`VITE_*`** neu bauen und ausrollen.
4. Local-Dev-Compose auf Prod **stoppen**, wenn nicht mehr nötig:  
   `docker compose --profile local-dev down`

---

## 8. Kurz-Checkliste „eine Wahrheit“

- [ ] Produktions-Backend = **Nhost** (Self-Hosted), **ein** Hasura darin.  
- [ ] Frontend = **Build + `VITE_*`** auf dieses Backend.  
- [ ] Root-**`docker-compose.yml`** nur mit **`local-dev`**-Profil — nie als alleinige Scriptony-Prod-Architektur verkaufen (das ist **nicht** dieselbe DB wie Nhost auf dem VPS).  
- [ ] Tages-Dev gegen Nhost-VPS: **`.env.local`** + **`npm run verify:test-env`**.  
- [ ] Änderungen an Deploy-Strategie **hier** dokumentieren, dann `ci.yml` / README / `.env.example` anpassen.

---

*Letzte inhaltliche Ausrichtung: Nhost Self-Hosted + statisches Frontend; Local-Compose nur optional für Entwicklung.*
