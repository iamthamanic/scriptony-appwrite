# GitHub Actions — Deploy (VPS + Appwrite)

**DevOps-Zielbild (kurz):** [DEVOPS_EMPFEHLUNG.md](DEVOPS_EMPFEHLUNG.md)

## VPS-Deploy aktivieren (Pflicht)

Die Jobs **`deploy-prod`** / **`deploy-test`** laufen **nur**, wenn die Repository-**Variable** gesetzt ist:

| Variable | Wert |
|----------|------|
| **`VPS_DEPLOY_ENABLED`** | `true` |

**Settings → Secrets and variables → Actions → Variables → New repository variable**

Ohne diese Variable wird nur der **`ci`**-Job ausgeführt (Lint/Build) — kein SSH, kein fehlerhafter Deploy mit leeren `SSH_HOST`/`SSH_USER`.

Zusätzlich weiterhin die **Secrets** unten (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, …).

---

Der Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) führt bei Push auf **`main`** bzw. **`develop`** nach erfolgreichem `ci`-Job einen **SSH-Deploy** aus (**wenn** `VPS_DEPLOY_ENABLED` = `true`):

1. **Auf dem Server:** `git pull`, dann **`docker compose --env-file infra/appwrite/.env up -d`** (Root-Compose mit eingebundenem Appwrite).
2. **Optional:** statisches Frontend (`bun run build` → `build/`) per **rsync**, wenn du die Repository-Variablen unten setzt.

**Nicht** Teil dieses Workflows: **Appwrite Functions** (`functions/scriptony-*`). Nach `git pull` auf dem VPS liegt der Code zwar im Repo, aber die HTTP-Funktionen musst du weiterhin in der **Appwrite Console** oder per **CLI** deployen/aktualisieren (siehe [`functions/README.md`](../functions/README.md)).

Der frühere Deploy mit **`docker-compose.legacy.yml`** (Postgres/Lucia) ist **nicht** mehr an die Standard-Deploy-Jobs gebunden.

---

## Appwrite `infra/appwrite/.env` nur in GitHub (empfohlen, kein nano auf dem Server)

Du kannst den **kompletten Inhalt** der Datei `infra/appwrite/.env` als **ein** mehrzeiliges Secret ablegen. Bei jedem Deploy schreibt der Workflow die Datei per SSH auf den Server (**nach** `git pull`).

| Secret | Wann |
|--------|------|
| **`APPWRITE_INFRA_ENV`** | Push auf **`main`** → `/root/scriptony-prod/infra/appwrite/.env` |
| **`APPWRITE_INFRA_ENV_STAGING`** | Push auf **`develop`** → `/root/scriptony-test/infra/appwrite/.env` |

**Anlegen in GitHub:** Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → Name z. B. `APPWRITE_INFRA_ENV` → Wert: gesamten Text der generierten `.env` (siehe unten).

**Lokal generieren (empfohlen, kein manuelles Tippen von Keys):** im Repo-Root, mit deiner **echten** Appwrite-Hostnames (ohne `https://`):

```bash
npm run appwrite:env:generate -- --domain=appwrite.deinedomain.de --write
```

Erzeugt **`infra/appwrite/.env`** mit zufälligen Passwörtern und Keys. Dann Datei öffnen, ggf. SMTP/E-Mail anpassen, **gesamten Inhalt** kopieren → Secret **`APPWRITE_INFRA_ENV`** einfügen.

Ohne `--write` schreibt das Skript nach **stdout** (zum Weiterleiten):

```bash
npm run appwrite:env:generate -- --domain=appwrite.deinedomain.de > /tmp/appwrite-env.txt
```

**Limit:** GitHub Secrets sind groß genug für typische Appwrite-`.env`-Dateien (unter der Secret-Größengrenze bleiben).

Wenn das Secret **nicht** gesetzt ist, muss `infra/appwrite/.env` **weiterhin manuell** auf dem VPS existieren.

---

## Einmalig auf dem VPS

1. Verzeichnis anlegen (entspricht dem im Workflow, z. B. `/root/scriptony-prod` oder `/root/scriptony-test`).
2. Repo klonen **oder** ersten Deploy laufen lassen (der Workflow klont per SSH).
3. Entweder **`APPWRITE_INFRA_ENV`** (bzw. Staging-Secret) in GitHub setzen **oder** **`infra/appwrite/.env`** auf dem Server anlegen — **nicht** ins Git committen.
4. Server braucht **Docker** + **Docker Compose v2** und einen **SSH-Deploy-Key** mit Repo-Zugriff (`git@github.com:…`).

---

## GitHub Secrets (SSH, weiterhin nötig)

| Secret | Bedeutung |
|--------|-----------|
| `SSH_HOST` | VPS-Hostname oder IP |
| `SSH_USER` | SSH-Login (z. B. `root`) |
| `SSH_PRIVATE_KEY` | Private Key (PEM), Zeilenumbrüche erhalten |

---

## GitHub Secrets (Vite-Build, nur wenn statisches Deploy aktiv)

Nur nötig, wenn **`DEPLOY_STATIC_FRONTEND`** (Variable) auf `true` steht:

| Secret | Bedeutung |
|--------|-----------|
| `VITE_APPWRITE_ENDPOINT` | z. B. `https://appwrite.deine-domain.tld/v1` |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite-Projekt-ID |
| `VITE_APPWRITE_FUNCTIONS_BASE_URL` **oder** `VITE_BACKEND_API_BASE_URL` | Basis-URL der `scriptony-*` Functions |
| `VITE_APP_WEB_URL` | Öffentliche URL der SPA |
| `VITE_AUTH_REDIRECT_URL` | Gleiche Origin wie Frontend (OAuth/E-Mail) |
| `VITE_PASSWORD_RESET_REDIRECT_URL` | z. B. `https://app…/reset-password` |
| `VITE_BACKEND_PUBLIC_TOKEN` | Optional |

`develop`-Deploy nutzt dieselben Secrets; für getrennte Test-URLs später **GitHub Environments** mit eigenen Secrets empfohlen.

---

## GitHub Repository-Variablen

Unter **Settings → Secrets and variables → Actions → Variables**:

| Variable | Wert | Wirkung |
|----------|------|---------|
| `DEPLOY_STATIC_FRONTEND` | `true` oder weglassen | Wenn `true`: nach dem Build wird `build/` per rsync ausgeliefert |
| `SCRIPTONY_WEB_ROOT_PROD` | z. B. `/var/www/scriptony` | Zielverzeichnis für **main** (mit abschließendem `/` in rsync: `build/` → Inhalt des Ordners) |
| `SCRIPTONY_WEB_ROOT_TEST` | z. B. `/var/www/scriptony-test` | Ziel für **develop** |

Der Webserver (nginx/Caddy) muss dieses Verzeichnis ausliefern und **SPA-Fallback** auf `index.html` haben.

**Berechtigungen:** Der SSH-User muss nach `rsync` in die Zielpfade schreiben können (`chown`/`chmod` auf dem VPS).

---

## Pfade im Workflow (anpassen)

Standard im Workflow:

| Umgebung | App-Verzeichnis auf dem Server |
|----------|--------------------------------|
| Produktion (`main`) | `/root/scriptony-prod` |
| Test (`develop`) | `/root/scriptony-test` |

Andere Pfade gewünscht: **`.github/workflows/ci.yml`** anpassen (Variablen `APP_ROOT` im Remote-Skript).

---

## Fehler „Missing infra/appwrite/.env“

Der Deploy bricht ab, wenn nach dem Schritt **Write … from GitHub Secret** auf dem Server **`infra/appwrite/.env`** fehlt — setze **`APPWRITE_INFRA_ENV`** oder lege die Datei auf dem VPS an.

---

## Legacy-Stack (Postgres/Lucia)

Nur noch manuell, z. B.:

`docker compose -f docker-compose.legacy.yml --profile local-dev up -d`

Siehe [SERVER_ROLLOUT.md](SERVER_ROLLOUT.md).
