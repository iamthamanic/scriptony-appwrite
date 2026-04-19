# Auth Service

Lucia Auth Service — **only** for the optional **Docker legacy** stack (`docker compose -f docker-compose.legacy.yml --profile local-dev`). The main Scriptony app uses **Appwrite** (`AppwriteAuthAdapter`). See [docs/SOURCE_OF_TRUTH.md](../../docs/SOURCE_OF_TRUTH.md).

Lucia Auth Service für das Scriptony-Repo (scriptony-appwrite).

## Features

- Registrierung / Login
- JWT Session Management
- Passwort-Hashing mit Bun
- PostgreSQL Adapter

## API Endpunkte

| Methode | Endpoint         | Beschreibung               |
| ------- | ---------------- | -------------------------- |
| POST    | `/auth/register` | Benutzer registrieren      |
| POST    | `/auth/login`    | Benutzer einloggen         |
| POST    | `/auth/logout`   | Benutzer ausloggen         |
| GET     | `/auth/me`       | Aktuellen Benutzer abrufen |
| GET     | `/health`        | Health Check               |

## Entwicklung

```bash
# Dependencies installieren
bun install

# Development server
bun run src/index.ts
```

## Docker

```bash
# Image bauen
docker build -t scriptony-auth .

# Container starten
docker run -p 3001:3001 -e DATABASE_URL=postgres://... scriptony-auth
```

## Umgebungsvariablen

| Variable     | Beschreibung                 | Default     |
| ------------ | ---------------------------- | ----------- |
| DATABASE_URL | PostgreSQL Connection String | -           |
| PORT         | Server Port                  | 3001        |
| NODE_ENV     | Environment                  | development |
