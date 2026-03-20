# Nhost `examples/docker-compose` — Auth-Redirects (Scriptony)

Die offizielle Nhost-Demo-Compose setzt **`AUTH_ACCESS_CONTROL_ALLOWED_REDIRECT_URLS`** leer. Für lokales Scriptony (`npm run dev`, Port **3000**) legt **`docker-compose.override.yml`** die erlaubten Redirects und **`AUTH_CLIENT_URL`** fest.

## Auf dem Server (neben dem offiziellen Compose)

Vom **Scriptony-Repo-Root** (lokal oder nach `git clone` auf dem Server):

```bash
NHOST_COMPOSE_DIR=/root/nhost-upstream/examples/docker-compose   # anpassen
cp infra/nhost-official-docker-compose/docker-compose.override.yml "$NHOST_COMPOSE_DIR/"
cd "$NHOST_COMPOSE_DIR"
docker compose up -d
```

Ohne Repo-Klon: Inhalt von `docker-compose.override.yml` im Nhost-`examples/docker-compose`-Ordner speichern.

## Hinweis

Weitere Origins (z. B. Produktions-Domain): `AUTH_ACCESS_CONTROL_ALLOWED_REDIRECT_URLS` kommagetrennt erweitern; siehe [Nhost Auth environment variables](https://docs.nhost.io/reference/auth/environment-variables).
