# Appwrite-Stack (lokal / Self-Host)

Dieser Ordner enthält die **vendorte** Docker-Definition für **self-hosted Appwrite** (Version siehe `docker-compose.yml` im Image-Tag, z. B. `appwrite/appwrite:1.8.1`).

## Beziehung zum Repo-Root

- **`../../docker-compose.yml`** bindet diese Datei per `include` ein.
- Du startest den Stack vom **Repository-Root**, nicht zwingend von hier.

## Erster Start (KISS)

1. `cp .env.example .env` in **diesem** Ordner (`infra/appwrite/`).
2. Passwörter und `_APP_OPENSSL_KEY_V1` für echte Umgebungen ändern (siehe [Appwrite-Doku](https://appwrite.io/docs)).
3. Vom Root: `npm run docker:appwrite:up` oder  
   `docker compose --env-file infra/appwrite/.env up -d`

## Ports (Standard aus dem Compose)

- **8080** (Host) → Traefik HTTP → Appwrite (Konsole + API unter `/v1`).
- **443** → HTTPS (lokal oft nur relevant mit Zertifikaten).

Frontend lokal: in `.env.local` z. B. `VITE_APPWRITE_ENDPOINT=http://127.0.0.1:8080/v1` und die **Projekt-ID** aus der Appwrite-Konsole.

## Modularität

- **Keine** Scriptony-Anwendungslogik hier — nur die Appwrite-Plattform.
- Scriptony **Functions** leben unter `functions/` und werden separat deployt; ihre `APPWRITE_*`-Variablen zeigen auf dieselbe Appwrite-Instanz (lokal oder VPS).

## Siehe auch

- [../../DOCKER_SETUP.md](../../DOCKER_SETUP.md)
- [../../docs/SELF_HOSTING.md](../../docs/SELF_HOSTING.md)
- [../../docs/ENTWICKLER_HANDBUCH.md](../../docs/ENTWICKLER_HANDBUCH.md)
- [../../docs/GITHUB_ACTIONS_DEPLOY.md](../../docs/GITHUB_ACTIONS_DEPLOY.md)
- [../../scripts/server-appwrite-compose-up.sh](../../scripts/server-appwrite-compose-up.sh) (manuell auf dem VPS im Repo-Root ausführen)
