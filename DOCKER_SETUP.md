# Docker und Scriptony

## Produktion

Die Web-App spricht mit **Appwrite** und deployten **`functions/`**-Diensten. Root-`docker-compose.yml` kann lokal **Appwrite** starten (`include` → `infra/appwrite/`); das ersetzt nicht Cloud/VPS-Deployments.

Siehe [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) und [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Lokaler Appwrite-Stack (Standard im Root-Compose)

Root-**`docker-compose.yml`** bindet **`infra/appwrite/docker-compose.yml`** ein (Appwrite **1.8.1**, Traefik, MariaDB, Redis, Worker).

**Vorbereitung:** `cp infra/appwrite/.env.example infra/appwrite/.env` und Secrets setzen (`_APP_*`).

**Start / Stop:**

```bash
docker compose --env-file infra/appwrite/.env up -d
docker compose down
```

Traefik mapped **HTTP → Host-Port 8080** (API z. B. `http://127.0.0.1:8080/v1`). Frontend: `VITE_APPWRITE_ENDPOINT` darauf ausrichten.

**Status:**

```bash
npm run docker:appwrite:verify
# oder
docker compose ps
```

---

## Optional: Legacy Local-Dev (Postgres / Hasura-Konsole / Lucia)

**`docker-compose.legacy.yml`** — nur Experimente (`profile: local-dev`):

- Postgres  
- optional **local_graphql_console** (Hasura-Image, Port **8080** — nicht parallel zu Appwrite-Traefik auf demselben Port starten)  
- Lucia **backend/auth** (Port 3001)

**Start:**

```bash
docker compose -f docker-compose.legacy.yml --profile local-dev up -d --build
```

**Stop:**

```bash
docker compose -f docker-compose.legacy.yml --profile local-dev down
```

Env: **`.env.docker.example`** → `.env` im Root (für Postgres/Lucia).

**Status:**

```bash
npm run docker:local-dev:verify
# oder
docker compose -f docker-compose.legacy.yml --profile local-dev ps
```
