# Docker und Scriptony

Es gibt **zwei** verschiedene Docker-Themen — bitte nicht vermischen.

## 1) Volles Backend in Docker = **Nhost Self-Hosted**

**Auth, Hasura, Storage, Functions-Runtime** laufen dort als **offizieller Nhost-Docker-Stack** (nicht diese eine `docker-compose.yml` im Repo).

**Anleitung:** [docs/NHOST_ALL_IN_DOCKER.md](docs/NHOST_ALL_IN_DOCKER.md) und [Nhost Self-Hosting](https://docs.nhost.io/platform/self-hosting/overview).

---

## 2) Nur dieses Repo: **optionaler Local-Dev-Stack**

Die Datei **`docker-compose.yml`** im Projektroot startet **kein** vollständiges Nhost-Backend. Sie startet nur:

- Postgres  
- Hasura (einzeln)  
- Lucia **backend/auth** (nicht der Nhost-Auth der Web-App)

**Start:**

```bash
docker compose --profile local-dev up -d --build
```

**Stop:**

```bash
docker compose --profile local-dev down
```

Env für Compose-Substitution: **`.env.docker.example`** → eigene `.env` im Root.

**Status prüfen:**

```bash
npm run docker:local-dev:ps
npm run docker:local-dev:verify
```

---

## Datenbank / Backups (nur Local-Dev-Stack)

```bash
docker exec scriptony-postgres pg_dump -U scriptony scriptony > backup.sql
```

---

## Veraltete Befehle

Früher stand hier `docker-compose up` ohne Profil — **ungültig** seit Einführung von `profiles: [local-dev]`. Immer **`--profile local-dev`** verwenden.
