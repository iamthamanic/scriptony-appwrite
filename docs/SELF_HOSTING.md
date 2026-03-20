# Scriptony: Später auf eigenen Server (z. B. Hetzner)

**Zuerst lesen:** [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) — dort ist festgelegt, dass **Produktions-Backend = Nhost Self-Hosted** (Hasura inklusive) ist; das Root-`docker-compose.yml` ist nur **optionaler Local-Dev** (`--profile local-dev`).

Scriptony ist so gebaut, dass du **ohne Code-Änderung** von Nhost + Vercel auf einen eigenen Server wechseln kannst – z. B. für kommerzielle Nutzung und vorhersehbare Kosten.

---

## Prinzip

- **Frontend:** Eine Vite-Build (statische Dateien). Wird heute von Vercel ausgeliefert, kann genauso von deinem Server (nginx/Caddy) ausgeliefert werden.
- **Backend:** Alle Zugriffe laufen über **URLs aus der Umgebung** (`VITE_NHOST_AUTH_URL`, `VITE_NHOST_GRAPHQL_URL`, …). Es ist nirgends `nhost.run` fest verdrahtet.
- **Umzug =** gleicher Build, andere Env: Zeiger auf deinen eigenen Backend-Server statt Nhost Cloud.

Du kannst also:
- **Jetzt:** Vercel (Frontend) + Nhost Cloud (Backend) nutzen.
- **Später:** Hetzner (oder anderer VPS): Frontend + Backend selbst hosten, gleiche App, nur andere URLs in der Env.

---

## 1. Frontend auf eigenem Server (z. B. Hetzner)

Build und Output sind in **`easyploy.json`** (tool-agnostisch) beschrieben. Deploy-Tools wie easyploy können diese Datei nutzen; manuell:

1. **Build wie gewohnt:**
   ```bash
   npm run build
   ```
   Ausgabe in `build/`.

2. **Auf dem Server:** Ordner `build/` z. B. nach `/var/www/scriptony` kopieren (rsync, scp, Git, CI).

3. **Webserver** (nginx oder Caddy) so einrichten, dass er die statischen Dateien ausliefert und SPA-Routing unterstützt (alle Pfade → `index.html`). Beispiel **Caddy**:
   ```text
   raccoova.scriptony.com {
     root * /var/www/scriptony
     file_server
     try_files {path} /index.html
   }
   ```
   SSL mit Let's Encrypt macht Caddy automatisch.

4. **Env für diesen Build:** Beim Build müssen die richtigen `VITE_*`-Werte gesetzt sein. Wenn dein Backend auf dem gleichen oder einem anderen Hetzner-Server läuft, setzt du z. B.:
   - `VITE_NHOST_AUTH_URL=https://auth.scriptony.com/v1`
   - `VITE_NHOST_GRAPHQL_URL=https://graphql.scriptony.com/v1`
   - `VITE_NHOST_STORAGE_URL=https://storage.scriptony.com/v1`
   - `VITE_NHOST_FUNCTIONS_URL=https://functions.scriptony.com/v1`
   - `VITE_APP_WEB_URL=https://raccoova.scriptony.com`
   - `VITE_AUTH_REDIRECT_URL=https://raccoova.scriptony.com`
   - usw.

   Du kannst **entweder** alle `VITE_NHOST_*_URL` setzen (dann brauchst du keine Subdomain/Region) **oder** weiter Subdomain + Region nutzen, wenn dein Self-Host die gleiche URL-Struktur nachbildet.

---

## 2. Backend auf eigenem Server – Option A: Nhost self-hosted (empfohlen für gleiche API)

Nhost ist Open Source und kann selbst gehostet werden. Dann bleibt die API 1:1 wie in der Cloud; du änderst nur die URLs in der Env.

- **Doku:** [Nhost Self-Hosting](https://docs.nhost.io/platform/self-hosting/overview)
- **Deployment:** z. B. mit dem offiziellen **Docker-Compose**-Beispiel von Nhost auf einem Hetzner-Server (oder mehreren). Enthält: PostgreSQL, Hasura (GraphQL), Hasura Auth, Hasura Storage, MinIO (S3), Serverless Functions.
- **Domain:** Du richtest z. B. Subdomains ein (auth.scriptony.com, graphql.scriptony.com, …) und zeigst sie auf deinen Server (Reverse Proxy → entsprechende Dienste). Dann setzt du genau diese URLs in den `VITE_NHOST_*_URL` (und ggf. Auth Redirect URLs auf deine Frontend-URL).

So hast du **dieselbe Architektur** wie Nhost Cloud, aber auf eigener Infrastruktur und mit vorhersehbaren Kosten (VPS + Speicher).

---

## 2. Backend auf eigenem Server – Option B: Eigenes Stack (Hasura + Auth + Storage)

Falls du nicht das komplette Nhost-Docker-Setup nutzen willst, kannst du ein eigenes Stack aufsetzen:

- **DB + GraphQL:** Hasura (wie bei Nhost) + PostgreSQL.
- **Auth:** z. B. Hasura Auth (Teil von Nhost) oder anderer JWT-kompatibler Dienst. Wichtig: Gleiche Endpunkte/Redirects wie die App erwartet (siehe Nhost Auth API).
- **Storage:** S3-kompatibel (z. B. MinIO) mit denselben Bucket-Namen/Pfaden wie in Nhost, oder Anpassungen in der App.
- **Functions:** Deine bestehenden Backend-Funktionen als kleine Dienste (Node, Go, …) hinter einer URL, die du als `VITE_NHOST_FUNCTIONS_URL` bzw. `VITE_BACKEND_API_BASE_URL` einträgst.

Die App fragt nur die in der Env konfigurierten URLs ab; solange das API-Format (GraphQL-Schema, Auth-Tokens, Storage-Pfade) kompatibel bleibt, reicht der Umzug per Env.

---

## 3. Env-Vorlage für Self-Hosted (Hetzner)

Wenn alles auf deiner Domain läuft (Beispiel: Frontend `raccoova.scriptony.com`, Backend `api.scriptony.com` oder Subdomains):

```env
# Backend-URLs (eigener Server)
VITE_NHOST_AUTH_URL=https://auth.scriptony.com/v1
VITE_NHOST_GRAPHQL_URL=https://graphql.scriptony.com/v1
VITE_NHOST_STORAGE_URL=https://storage.scriptony.com/v1
VITE_NHOST_FUNCTIONS_URL=https://functions.scriptony.com/v1

# Oder ein gemeinsamer API-Gateway:
# VITE_BACKEND_API_BASE_URL=https://api.scriptony.com/v1

# Frontend & Redirects
VITE_APP_WEB_URL=https://raccoova.scriptony.com
VITE_AUTH_REDIRECT_URL=https://raccoova.scriptony.com
VITE_PASSWORD_RESET_REDIRECT_URL=https://raccoova.scriptony.com/reset-password
```

Build mit diesen Werten, dann die `build/`-Dateien auf den Hetzner-Server legen und wie oben ausliefern.

---

## 4. Kurzüberblick

| Phase              | Frontend        | Backend         | Env                          |
|--------------------|-----------------|-----------------|------------------------------|
| **Jetzt (solo)**   | Vercel          | Nhost Cloud     | Subdomain + Region / Nhost-URLs |
| **Später (kommerziell)** | Hetzner (nginx/Caddy) | Nhost self-hosted oder eigenes Stack auf Hetzner | URLs auf deine Domain |

- **Kein Lock-in:** Alles über Env und URLs; gleicher Code, anderer Host.
- **Kosten:** Mit eigenem Server (z. B. Hetzner) feste Miete (VPS + Speicher), unabhängig von Nutzerzahl.
- **Migration:** Nhost self-hosted (Docker) gibt dir die gleiche API wie die Cloud; Datenbank und Auth kannst du aus der Cloud migrieren (Backup/Restore, User-Export/Import), dann Env umstellen und Frontend auf deinem Server deployen.
